import type { PolicyResponse } from '@/backend/dto/extension-policy.dto'

export type SavePolicyInput = {
    name: string
    fixedExtensions: Array<{ name: string; enabled: boolean }>
    customExtensions: string[]
}

export interface IExtensionPolicyService {
    getPolicy(ruleSetKey: string): Promise<PolicyResponse | null>
    ensurePolicy(ruleSetKey: string, displayName?: string): Promise<PolicyResponse>
    updateFixedExtensionEnabled(ruleSetKey: string, name: string, enabled: boolean): Promise<void>
    savePolicy(ruleSetKey: string, input: SavePolicyInput): Promise<PolicyResponse>
}
