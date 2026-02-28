import { NextResponse } from 'next/server'
import { DEFAULT_RULESET_KEY } from '@/lib/extension-policy-api'
import {
    getPolicy,
    updateFixedExtensionEnabled,
    savePolicy,
    type SavePolicyInput,
} from '@/lib/extension-policy-service'

type FixedExtensionInput = {
    name: string
    checked?: boolean
    enabled?: boolean
}

function normalizeExtensionName(raw: unknown) {
    if (typeof raw !== 'string') return null
    let value = raw.trim().toLowerCase()
    if (!value) return null
    if (value.startsWith('.')) value = value.slice(1)
    if (!value) return null
    if (!/^[a-z0-9]+$/.test(value)) return null
    return value
}

export async function GET() {
    const data = await getPolicy(DEFAULT_RULESET_KEY)
    return NextResponse.json({ data })
}

/** 고정 확장자 하나의 enabled만 갱신 (토글용) */
export async function PATCH(req: Request) {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'JSON 본문이 올바르지 않습니다.' }, { status: 400 })
    }
    const parsed = body as { name?: unknown; enabled?: unknown }
    const name = normalizeExtensionName(parsed?.name)
    const enabled = typeof parsed.enabled === 'boolean' ? parsed.enabled : undefined
    if (!name || enabled === undefined) {
        return NextResponse.json(
            { error: 'name(영문 소문자 확장자)과 enabled(boolean)가 필요합니다.' },
            { status: 400 }
        )
    }

    try {
        await updateFixedExtensionEnabled(DEFAULT_RULESET_KEY, name, enabled)
        return NextResponse.json({ ok: true })
    } catch (e) {
        const message = e instanceof Error ? e.message : '고정 확장자 상태 변경 중 오류가 발생했습니다.'
        const status = message.includes('기본 정책이 없습니다')
            ? 404
            : message.includes('고정 확장자만 토글')
              ? 400
              : 500
        return NextResponse.json({ error: message }, { status })
    }
}

export async function POST(req: Request) {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'JSON 본문이 올바르지 않습니다.' }, { status: 400 })
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
        const data = await savePolicy(DEFAULT_RULESET_KEY, {
            name: ruleSetName,
            fixedExtensions,
            customExtensions,
        })
        return NextResponse.json({ data })
    } catch (e) {
        const message = e instanceof Error ? e.message : '정책 저장 중 오류가 발생했습니다.'
        // 도메인 검증 에러는 400으로 간주
        const status = message.includes('중복') || message.includes('최대') || message.includes('이하여야') ? 400 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

