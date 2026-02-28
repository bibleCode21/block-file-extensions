import 'server-only'
import { toPolicyResponse, type PolicyResponse } from '@/backend/dto/extension-policy.dto'
import {
    DEFAULT_FIXED_EXTENSION_NAMES,
    MAX_EXTENSION_NAME_LENGTH,
} from '@/backend/constants/extension-policy'
import type { IExtensionPolicyService } from './extension-policy.service.interface'
import type { ExtensionPolicyRepository } from '@/backend/repositories/extension-policy.repository'

export class ExtensionPolicyService implements IExtensionPolicyService {
    constructor(private readonly repository: ExtensionPolicyRepository) {}

    async getPolicy(ruleSetKey: string): Promise<PolicyResponse | null> {
        const ruleSet = await this.repository.findByKey(ruleSetKey)
        if (!ruleSet) return null
        return toPolicyResponse(ruleSet)
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
            throw new Error('기본 정책이 없습니다. init을 먼저 호출하세요.')
        }
        if (!ext.isFixed) {
            throw new Error('고정 확장자만 토글할 수 있습니다.')
        }
        await this.repository.updateExtensionEnabled(ext.ruleSetId, name, enabled)
    }

    async addCustomExtension(ruleSetKey: string, name: string): Promise<void> {
        if (name.length > MAX_EXTENSION_NAME_LENGTH) {
            throw new Error(`확장자 이름은 ${MAX_EXTENSION_NAME_LENGTH}자 이하여야 합니다.`)
        }

        const ruleSet = await this.repository.findByKey(ruleSetKey)
        if (!ruleSet) {
            throw new Error('정책이 없습니다. init을 먼저 호출하세요.')
        }

        const isFixedDuplicate = ruleSet.extensions.some(e => e.isFixed && e.extensionName === name)
        if (isFixedDuplicate) {
            throw new Error('고정 확장자에 이미 포함되어 있습니다.')
        }

        const isCustomDuplicate = ruleSet.extensions.some(e => !e.isFixed && e.extensionName === name)
        if (isCustomDuplicate) {
            throw new Error('이미 등록된 확장자입니다.')
        }

        const customCount = await this.repository.countCustomExtensions(ruleSet.id)
        const maxCustom = ruleSet.maxCustomExtensions
        if (customCount >= maxCustom) {
            throw new Error(`커스텀 확장자는 최대 ${maxCustom}개까지 등록할 수 있습니다.`)
        }

        await this.repository.addExtension(ruleSet.id, name, false, true)
    }

    async removeCustomExtension(ruleSetKey: string, name: string): Promise<void> {
        const ext = await this.repository.findExtension(ruleSetKey, name)
        if (!ext) {
            throw new Error('해당 확장자를 찾을 수 없습니다.')
        }
        if (ext.isFixed) {
            throw new Error('고정 확장자는 삭제할 수 없습니다.')
        }
        await this.repository.removeExtension(ext.ruleSetId, name)
    }
}
