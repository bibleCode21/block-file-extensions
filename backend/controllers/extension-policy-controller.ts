import { DEFAULT_RULESET_KEY } from '@/backend/constants/extension-policy'
import { extensionPolicyService } from '@/backend/container'
import type { SavePolicyInput } from '@/backend/services/extension-policy.service.interface'

export type ControllerResponse = { status: number; body: object }

type FixedExtensionInput = {
    name: string
    checked?: boolean
    enabled?: boolean
}

function normalizeExtensionName(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    let value = raw.trim().toLowerCase()
    if (!value) return null
    if (value.startsWith('.')) value = value.slice(1)
    if (!value) return null
    if (!/^[a-z0-9]+$/.test(value)) return null
    return value
}

export async function handleGet(): Promise<ControllerResponse> {
    const data = await extensionPolicyService.getPolicy(DEFAULT_RULESET_KEY)
    return { status: 200, body: { data } }
}

export async function handlePatch(req: Request): Promise<ControllerResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return { status: 400, body: { error: 'JSON 본문이 올바르지 않습니다.' } }
    }
    const parsed = body as { name?: unknown; enabled?: unknown }
    const name = normalizeExtensionName(parsed?.name)
    const enabled = typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined
    if (!name || enabled === undefined) {
        return {
            status: 400,
            body: { error: '영문 소문자 확장자와 체크박스 상태가 필요합니다.' },
        }
    }

    try {
        await extensionPolicyService.updateFixedExtensionEnabled(DEFAULT_RULESET_KEY, name, enabled)
        return { status: 200, body: { ok: true } }
    } catch (e) {
        const message = e instanceof Error ? e.message : '고정 확장자 상태 변경 중 오류가 발생했습니다.'
        const status = message.includes('기본 정책이 없습니다')
            ? 404
            : message.includes('고정 확장자만 토글')
              ? 400
              : 500
        return { status, body: { error: message } }
    }
}

export async function handlePost(req: Request): Promise<ControllerResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return { status: 400, body: { error: 'JSON 본문이 올바르지 않습니다.' } }
    }

    const parsed = body as { fixedExtensions?: unknown; customExtensions?: unknown; name?: unknown }
    const fixedRaw = Array.isArray(parsed.fixedExtensions) ? (parsed.fixedExtensions as unknown[]) : []
    const customRaw = Array.isArray(parsed.customExtensions) ? (parsed.customExtensions as unknown[]) : []
    const ruleSetName = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : '기본 정책'

    const fixedExtensions: SavePolicyInput['fixedExtensions'] = fixedRaw
        .map(item => item as FixedExtensionInput)
        .map(item => ({
            name: normalizeExtensionName(item?.name),
            enabled: typeof item.enabled === 'boolean' ? item.enabled : !!item.checked,
        }))
        .filter((x): x is { name: string; enabled: boolean } => Boolean(x.name))

    const customExtensions = customRaw
        .map(normalizeExtensionName)
        .filter((x): x is string => Boolean(x))

    try {
        const data = await extensionPolicyService.savePolicy(DEFAULT_RULESET_KEY, {
            name: ruleSetName,
            fixedExtensions,
            customExtensions,
        })
        return { status: 200, body: { data } }
    } catch (e) {
        const message = e instanceof Error ? e.message : '정책 저장 중 오류가 발생했습니다.'
        const status = message.includes('중복') || message.includes('최대') || message.includes('이하여야') ? 400 : 500
        return { status, body: { error: message } }
    }
}

export async function handleInit(): Promise<ControllerResponse> {
    const data = await extensionPolicyService.ensurePolicy(DEFAULT_RULESET_KEY, '기본 정책')
    return { status: 200, body: { data } }
}
