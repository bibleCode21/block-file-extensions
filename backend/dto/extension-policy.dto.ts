import type { ExtensionRuleSet, Extension } from '@prisma/client'

// --- Response (API 응답) ---

export type PolicyResponse = {
    id: string
    key: string
    name: string
    maxCustomExtensions: number
    maxExtensionNameLength: number
    fixedExtensions: Array<{ name: string; enabled: boolean }>
    customExtensions: string[]
}

// --- Request (API 요청 body, 검증 전/후 타입) ---

/** PATCH /api/extension-policy — 고정 확장자 토글. 파싱 직후(raw) */
export type PatchFixedExtensionBodyRaw = { name?: unknown; enabled?: unknown }
/** 검증 통과 후 */
export type PatchFixedExtensionBody = { name: string; enabled: boolean }

/** POST /api/extension-policy — 커스텀 확장자 추가. 파싱 직후(raw) */
export type AddCustomExtensionBodyRaw = { name?: unknown }
/** 검증 통과 후 */
export type AddCustomExtensionBody = { name: string }

/** PATCH /api/extension-policy/settings — 정책 설정. 파싱 직후(raw) */
export type PatchSettingsBodyRaw = { maxCustomExtensions?: unknown; maxExtensionNameLength?: unknown }
/** 검증 통과 후 (Service에서도 사용) */
export type PolicySettings = {
    maxCustomExtensions?: number
    maxExtensionNameLength?: number
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
