import 'server-only'
import { toPolicyResponse, type PolicyResponse } from '@/backend/dto/extension-policy.dto'
import { DEFAULT_FIXED_EXTENSION_NAMES } from '@/backend/constants/extension-policy'
import type { IExtensionPolicyService, PolicySettings } from '@/backend/services/extension-policy.service.interface'
import type { ExtensionPolicyRepository } from '@/backend/repositories/extension-policy.repository'
import { NotFoundError, ValidationError, ConflictError } from '@/backend/errors'
import { redis } from '@/lib/redis'

const CACHE_TTL = 60 * 60 // 1 hour

export class ExtensionPolicyService implements IExtensionPolicyService {
    constructor(private readonly repository: ExtensionPolicyRepository) { }

    async getPolicy(ruleSetKey: string): Promise<PolicyResponse | null> {
        const version = await this.getOrInitCacheVersion(ruleSetKey)
        const cKey = this.cacheKey(ruleSetKey, version)
        const cached = await redis.get<PolicyResponse>(cKey)
        if (cached) return cached

        const ruleSet = await this.repository.findByKey(ruleSetKey)
        if (!ruleSet) return null

        const policy = toPolicyResponse(ruleSet)
        await redis.set(cKey, policy, { ex: CACHE_TTL })

        return policy
    }

    async ensurePolicy(ruleSetKey: string, displayName?: string): Promise<PolicyResponse> {
        const existing = await this.repository.findByKey(ruleSetKey)
        if (existing) return toPolicyResponse(existing)

        const ruleSet = await this.repository.createWithExtensions({
            key: ruleSetKey,
            name: displayName ?? ruleSetKey,
            isDefault: ruleSetKey === 'default',
            extensions: DEFAULT_FIXED_EXTENSION_NAMES.map(extensionName => ({
                extensionName,
                isFixed: true,
                enabled: false,
            })),
        })
        return toPolicyResponse(ruleSet)
    }

    async updateFixedExtensionEnabled(ruleSetKey: string, name: string, enabled: boolean): Promise<void> {
        const ext = await this.repository.findExtension(ruleSetKey, name)
        if (!ext) {
            throw new NotFoundError(`정책 '${ruleSetKey}'에 확장자 '${name}'이(가) 없습니다.`)
        }
        if (!ext.isFixed) {
            throw new ValidationError('고정 확장자만 토글할 수 있습니다.')
        }
        await this.repository.updateExtensionEnabled(ext.ruleSetId, name, enabled)
        await this.invalidatePolicyCache(ruleSetKey)
    }

    async addCustomExtension(ruleSetKey: string, name: string): Promise<void> {
        const ruleSet = await this.repository.findByKey(ruleSetKey)
        if (!ruleSet) {
            throw new NotFoundError('정책이 없습니다. init을 먼저 호출하세요.')
        }

        if (name.length > ruleSet.maxExtensionNameLength) {
            throw new ValidationError(`확장자 이름은 ${ruleSet.maxExtensionNameLength}자 이하여야 합니다.`)
        }

        const isFixedDuplicate = ruleSet.extensions.some(e => e.isFixed && e.extensionName === name)
        if (isFixedDuplicate) {
            throw new ConflictError('고정 확장자에 이미 포함되어 있습니다.')
        }

        const isCustomDuplicate = ruleSet.extensions.some(e => !e.isFixed && e.extensionName === name)
        if (isCustomDuplicate) {
            throw new ConflictError('이미 등록된 확장자입니다.')
        }

        const customCount = await this.repository.countCustomExtensions(ruleSet.id)
        const maxCustom = ruleSet.maxCustomExtensions
        if (customCount >= maxCustom) {
            throw new ValidationError(`커스텀 확장자는 최대 ${maxCustom}개까지 등록할 수 있습니다.`)
        }

        await this.repository.addExtension(ruleSet.id, name, false, true)
        await this.invalidatePolicyCache(ruleSetKey)
    }

    async removeCustomExtension(ruleSetKey: string, name: string): Promise<void> {
        const ext = await this.repository.findExtension(ruleSetKey, name)
        if (!ext) {
            throw new NotFoundError('해당 확장자를 찾을 수 없습니다.')
        }
        if (ext.isFixed) {
            throw new ValidationError('고정 확장자는 삭제할 수 없습니다.')
        }
        await this.repository.removeExtension(ext.ruleSetId, name)
        await this.invalidatePolicyCache(ruleSetKey)
    }

    async updatePolicySettings(ruleSetKey: string, settings: PolicySettings): Promise<PolicyResponse> {
        const existing = await this.repository.findByKey(ruleSetKey)
        if (!existing) {
            throw new NotFoundError('정책이 없습니다. init을 먼저 호출하세요.')
        }

        if (settings.maxCustomExtensions != null) {
            if (!Number.isInteger(settings.maxCustomExtensions) || settings.maxCustomExtensions < 0) {
                throw new ValidationError('maxCustomExtensions는 0 이상의 정수여야 합니다.')
            }
        }

        if (settings.maxExtensionNameLength != null) {
            if (!Number.isInteger(settings.maxExtensionNameLength) || settings.maxExtensionNameLength < 1) {
                throw new ValidationError('maxExtensionNameLength는 1 이상의 정수여야 합니다.')
            }
        }

        const updated = await this.repository.updateSettings(ruleSetKey, settings)
        await this.invalidatePolicyCache(ruleSetKey)
        return toPolicyResponse(updated)
    }

    /**
     * 정책 변경 시 Redis 캐시 무효화(버전 증가 + 기존 캐시 키 삭제).
     * - rawVersion: Redis는 환경에 따라 number 또는 string으로 반환할 수 있어 공통 타입으로 받음.
     * - version: 삭제할 캐시 키를 만들 때만 사용. 키가 없었으면 undefined → 삭제 생략(없는 키 del 불필요).
     */
    private async invalidatePolicyCache(ruleSetKey: string): Promise<void> {
        const vKey = this.versionKey(ruleSetKey)
        const rawVersion = await redis.get<number | string>(vKey)
        const version = rawVersion != null ? Number(rawVersion) : undefined
        if (version != null && !Number.isNaN(version)) {
            await redis.del(this.cacheKey(ruleSetKey, version))
        }
        await redis.incr(vKey)
    }

    /** 현재 캐시 버전을 반환. 버전 키가 없으면 1로 초기화 후 반환. Redis 반환값을 number로 정규화. */
    private async getOrInitCacheVersion(ruleSetKey: string): Promise<number> {
        const vKey = this.versionKey(ruleSetKey)
        const rawVersion = await redis.get<number | string>(vKey)
        const version = rawVersion != null ? Number(rawVersion) || 1 : 1
        if (rawVersion == null) {
            await redis.set(vKey, version)
        }
        return version
    }

    private versionKey(ruleSetKey: string): string {
        return `extension-rule-set:${ruleSetKey}:version`
    }

    private cacheKey(ruleSetKey: string, version: number): string {
        return `extension-rule-set:${ruleSetKey}:v${version}`
    }
}
