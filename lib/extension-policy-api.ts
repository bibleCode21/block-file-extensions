import type { ExtensionRuleSet, Extension } from '@prisma/client'

export const DEFAULT_RULESET_KEY = 'default'

/** 확장자 이름 최대 길이 (고정, DB 미저장) */
export const MAX_EXTENSION_NAME_LENGTH = 20

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

export type PolicyResponse = {
    id: string
    key: string
    name: string
    maxCustomExtensions: number
    fixedExtensions: Array<{ name: string; enabled: boolean }>
    customExtensions: string[]
}

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
        fixedExtensions,
        customExtensions,
    }
}
