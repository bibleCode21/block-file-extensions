import type { ExtensionRuleSet, Extension } from '@prisma/client'

export const DEFAULT_RULESET_KEY = 'default'

/** 기본 정책 생성 시 넣을 고정 확장자 이름 목록 */
export const DEFAULT_FIXED_EXTENSION_NAMES = [
    'bat',
    'cmd',
    'com',
    'cpl',
    'exe',
    'scr',
    'js',
]

type RuleSetWithExtensions = ExtensionRuleSet & { extensions: Extension[] }

export function toPolicyResponse(ruleSet: RuleSetWithExtensions) {
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
        fixedExtensions,
        customExtensions,
    }
}
