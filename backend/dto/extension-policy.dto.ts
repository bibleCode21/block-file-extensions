import type { ExtensionRuleSet, Extension } from '@prisma/client'

export type PolicyResponse = {
    id: string
    key: string
    name: string
    maxCustomExtensions: number
    maxExtensionNameLength: number
    fixedExtensions: Array<{ name: string; enabled: boolean }>
    customExtensions: string[]
}

type RuleSetWithExtensions = ExtensionRuleSet & { extensions: Extension[] }

export function toPolicyResponse(ruleSet: RuleSetWithExtensions): PolicyResponse {
    const fixedExtensions = ruleSet.extensions
        .filter(e => e.isFixed)
        .map(e => ({ name: e.extensionName, enabled: e.enabled }))
    const customExtensions = ruleSet.extensions
        .filter(e => !e.isFixed)
        .map(e => e.extensionName)
    return {
        id: ruleSet.id,
        key: ruleSet.key,
        name: ruleSet.name,
        maxCustomExtensions: ruleSet.maxCustomExtensions,
        maxExtensionNameLength: ruleSet.maxExtensionNameLength,
        fixedExtensions,
        customExtensions,
    }
}
