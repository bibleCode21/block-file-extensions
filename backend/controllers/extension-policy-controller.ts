import { DEFAULT_RULESET_KEY } from '@/backend/constants/extension-policy'
import { extensionPolicyService } from '@/backend/container'
import { AppError } from '@/backend/errors'

export type ControllerResponse = { status: number; body: object }

function handleError(e: unknown, fallbackMessage: string): ControllerResponse {
    if (e instanceof AppError) {
        return { status: e.statusCode, body: { error: e.message } }
    }
    const message = e instanceof Error ? e.message : fallbackMessage
    return { status: 500, body: { error: message } }
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
        return handleError(e, '고정 확장자 상태 변경 중 오류가 발생했습니다.')
    }
}

/** 커스텀 확장자 단건 추가 */
export async function handlePost(req: Request): Promise<ControllerResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return { status: 400, body: { error: 'JSON 본문이 올바르지 않습니다.' } }
    }

    const parsed = body as { name?: unknown }
    const name = normalizeExtensionName(parsed?.name)
    if (!name) {
        return { status: 400, body: { error: '유효한 확장자 이름(영문 소문자)이 필요합니다.' } }
    }

    try {
        await extensionPolicyService.addCustomExtension(DEFAULT_RULESET_KEY, name)
        return { status: 200, body: { ok: true } }
    } catch (e) {
        return handleError(e, '확장자 추가 중 오류가 발생했습니다.')
    }
}

/** 커스텀 확장자 삭제 */
export async function handleDelete(ruleSetKey: string, rawName: string): Promise<ControllerResponse> {
    const name = normalizeExtensionName(rawName)
    if (!name) {
        return { status: 400, body: { error: '유효한 확장자 이름(영문 소문자)이 필요합니다.' } }
    }

    try {
        await extensionPolicyService.removeCustomExtension(ruleSetKey, name)
        return { status: 200, body: { ok: true } }
    } catch (e) {
        return handleError(e, '확장자 삭제 중 오류가 발생했습니다.')
    }
}

/** 정책 설정(maxCustomExtensions, maxExtensionNameLength) 변경 */
export async function handlePatchSettings(req: Request): Promise<ControllerResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return { status: 400, body: { error: 'JSON 본문이 올바르지 않습니다.' } }
    }

    const parsed = body as { maxCustomExtensions?: unknown; maxExtensionNameLength?: unknown }
    const settings: { maxCustomExtensions?: number; maxExtensionNameLength?: number } = {}

    if (parsed.maxCustomExtensions !== undefined) {
        if (typeof parsed.maxCustomExtensions !== 'number') {
            return { status: 400, body: { error: 'maxCustomExtensions는 숫자여야 합니다.' } }
        }
        settings.maxCustomExtensions = parsed.maxCustomExtensions
    }

    if (parsed.maxExtensionNameLength !== undefined) {
        if (typeof parsed.maxExtensionNameLength !== 'number') {
            return { status: 400, body: { error: 'maxExtensionNameLength는 숫자여야 합니다.' } }
        }
        settings.maxExtensionNameLength = parsed.maxExtensionNameLength
    }

    if (Object.keys(settings).length === 0) {
        return { status: 400, body: { error: 'maxCustomExtensions 또는 maxExtensionNameLength 중 하나 이상 필요합니다.' } }
    }

    try {
        const data = await extensionPolicyService.updatePolicySettings(DEFAULT_RULESET_KEY, settings)
        return { status: 200, body: { data } }
    } catch (e) {
        return handleError(e, '정책 설정 변경 중 오류가 발생했습니다.')
    }
}

export async function handleInit(): Promise<ControllerResponse> {
    const data = await extensionPolicyService.ensurePolicy(DEFAULT_RULESET_KEY, '기본 정책')
    return { status: 200, body: { data } }
}
