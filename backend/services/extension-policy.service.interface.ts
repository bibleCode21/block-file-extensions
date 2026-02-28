import type { PolicyResponse, PolicySettings } from '@/backend/dto/extension-policy.dto'

export type { PolicySettings } from '@/backend/dto/extension-policy.dto'

export interface IExtensionPolicyService {
    getPolicy(ruleSetKey: string): Promise<PolicyResponse | null>
    ensurePolicy(ruleSetKey: string, displayName?: string): Promise<PolicyResponse>
    updateFixedExtensionEnabled(ruleSetKey: string, name: string, enabled: boolean): Promise<void>
    addCustomExtension(ruleSetKey: string, name: string): Promise<void>
    removeCustomExtension(ruleSetKey: string, name: string): Promise<void>
    updatePolicySettings(ruleSetKey: string, settings: PolicySettings): Promise<PolicyResponse>
}
