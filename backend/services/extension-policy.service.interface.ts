import type { PolicyResponse } from '@/backend/dto/extension-policy.dto'

export type PolicySettings = {
    maxCustomExtensions?: number
    maxExtensionNameLength?: number
}

export interface IExtensionPolicyService {
    getPolicy(ruleSetKey: string): Promise<PolicyResponse | null>
    ensurePolicy(ruleSetKey: string, displayName?: string): Promise<PolicyResponse>
    updateFixedExtensionEnabled(ruleSetKey: string, name: string, enabled: boolean): Promise<void>
    addCustomExtension(ruleSetKey: string, name: string): Promise<void>
    removeCustomExtension(ruleSetKey: string, name: string): Promise<void>
    updatePolicySettings(ruleSetKey: string, settings: PolicySettings): Promise<PolicyResponse>
}
