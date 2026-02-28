import 'server-only'
import { toPolicyResponse, type PolicyResponse } from '@/backend/dto/extension-policy.dto'
import {
    DEFAULT_FIXED_EXTENSION_NAMES,
    MAX_EXTENSION_NAME_LENGTH,
} from '@/backend/constants/extension-policy'
import type { IExtensionPolicyService, SavePolicyInput } from './extension-policy.service.interface'
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

    async savePolicy(ruleSetKey: string, input: SavePolicyInput): Promise<PolicyResponse> {
        const { name, fixedExtensions, customExtensions } = input

        const fixedMap = new Map<string, boolean>()
        for (const ext of fixedExtensions) fixedMap.set(ext.name, ext.enabled)

        const customSet = new Set<string>(customExtensions)
        const customNames = [...customSet]

        const overlap = customNames.filter(x => fixedMap.has(x))
        if (overlap.length > 0) {
            throw new Error(`고정 확장자와 중복된 값이 있습니다: ${overlap.join(', ')}`)
        }

        const maxCustom = await this.repository.getMaxCustomExtensions(ruleSetKey)
        if (customNames.length > maxCustom) {
            throw new Error(`커스텀 확장자는 최대 ${maxCustom}개까지 등록할 수 있습니다.`)
        }

        const tooLong = customNames.find(extName => extName.length > MAX_EXTENSION_NAME_LENGTH)
        if (tooLong) {
            throw new Error(`확장자 이름은 ${MAX_EXTENSION_NAME_LENGTH}자 이하여야 합니다. (예: ${tooLong})`)
        }

        const saved = await this.repository.syncPolicy(
            ruleSetKey,
            name,
            ruleSetKey === 'default',
            fixedMap,
            customNames,
        )
        return toPolicyResponse(saved)
    }
}
