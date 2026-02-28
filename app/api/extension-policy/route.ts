import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_RULESET_KEY = 'default'

// 최초 호출 시 DB에 생성해 둘 기본 고정 확장자 목록
const DEFAULT_FIXED_EXTENSION_NAMES = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js']

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

function toFixedEnabled(input: FixedExtensionInput) {
    if (typeof input.enabled === 'boolean') return input.enabled
    if (typeof input.checked === 'boolean') return input.checked
    return false
}

async function readDefaultRuleSet() {
    let ruleSet = await prisma.extensionRuleSet.findUnique({
        where: { key: DEFAULT_RULESET_KEY },
        include: { extensions: true },
    })

    // 아직 기본 룰셋이 없다면, 고정 확장자만 포함된 기본 정책을 생성
    if (!ruleSet) {
        ruleSet = await prisma.extensionRuleSet.create({
            data: {
                key: DEFAULT_RULESET_KEY,
                name: '기본 정책',
                isDefault: true,
                extensions: {
                    create: DEFAULT_FIXED_EXTENSION_NAMES.map(extensionName => ({
                        extensionName,
                        isFixed: true,
                        enabled: false,
                    })),
                },
            },
            include: { extensions: true },
        })
    }

    const fixedExtensions = ruleSet.extensions
        .filter(e => e.isFixed)
        .map(e => ({ name: e.extensionName, enabled: e.enabled }))

    const customExtensions = ruleSet.extensions
        .filter(e => !e.isFixed)
        .map(e => e.extensionName)

    return { id: ruleSet.id, key: ruleSet.key, name: ruleSet.name, fixedExtensions, customExtensions }
}

export async function GET() {
    const data = await readDefaultRuleSet()
    return NextResponse.json({ data })
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

    const fixedExtensions = fixedRaw
        .map(item => item as FixedExtensionInput)
        .map(item => ({
            name: normalizeExtensionName(item?.name),
            enabled: toFixedEnabled(item),
        }))
        .filter((x): x is { name: string; enabled: boolean } => Boolean(x.name))

    const customExtensions = customRaw
        .map(normalizeExtensionName)
        .filter((x): x is string => Boolean(x))

    // 중복 제거 (입력 배열 내 중복)
    const fixedMap = new Map<string, boolean>()
    for (const ext of fixedExtensions) fixedMap.set(ext.name, ext.enabled)
    const fixedNames = [...fixedMap.keys()]

    const customSet = new Set<string>(customExtensions)
    const customNames = [...customSet]

    // 고정/커스텀 간 중복 방지 (스키마 unique와 정책상 중복 불가)
    const overlap = customNames.filter(x => fixedMap.has(x))
    if (overlap.length > 0) {
        return NextResponse.json(
            { error: `고정 확장자와 중복된 값이 있습니다: ${overlap.join(', ')}` },
            { status: 400 }
        )
    }

    if (customNames.length > 200) {
        return NextResponse.json({ error: '커스텀 확장자는 최대 200개까지 등록할 수 있습니다.' }, { status: 400 })
    }

    const saved = await prisma.$transaction(async tx => {
        const ruleSet = await tx.extensionRuleSet.upsert({
            where: { key: DEFAULT_RULESET_KEY },
            create: {
                key: DEFAULT_RULESET_KEY,
                name: ruleSetName,
                isDefault: true,
            },
            update: {
                name: ruleSetName,
                isDefault: true,
            },
        })

        // 이번 요청 기준으로 목록을 동기화(삭제 포함)
        await tx.extension.deleteMany({
            where: {
                ruleSetId: ruleSet.id,
                OR: [
                    { isFixed: true, extensionName: { notIn: fixedNames } },
                    { isFixed: false, extensionName: { notIn: customNames } },
                ],
            },
        })

        // 고정 확장자 upsert
        for (const ext of fixedMap.entries()) {
            const [extensionName, enabled] = ext
            await tx.extension.upsert({
                where: { ruleSetId_extensionName: { ruleSetId: ruleSet.id, extensionName } },
                create: {
                    ruleSetId: ruleSet.id,
                    extensionName,
                    enabled,
                    isFixed: true,
                },
                update: {
                    enabled,
                    isFixed: true,
                },
            })
        }

        // 커스텀 확장자 upsert (항상 enabled=true)
        for (const extensionName of customNames) {
            await tx.extension.upsert({
                where: { ruleSetId_extensionName: { ruleSetId: ruleSet.id, extensionName } },
                create: {
                    ruleSetId: ruleSet.id,
                    extensionName,
                    enabled: true,
                    isFixed: false,
                },
                update: {
                    enabled: true,
                    isFixed: false,
                },
            })
        }

        const refreshed = await tx.extensionRuleSet.findUnique({
            where: { id: ruleSet.id },
            include: { extensions: true },
        })

        return refreshed
    })

    const fixed = (saved?.extensions ?? [])
        .filter(e => e.isFixed)
        .map(e => ({ name: e.extensionName, enabled: e.enabled }))

    const custom = (saved?.extensions ?? [])
        .filter(e => !e.isFixed)
        .map(e => e.extensionName)

    return NextResponse.json({
        data: saved
            ? { id: saved.id, key: DEFAULT_RULESET_KEY, name: saved.name, fixedExtensions: fixed, customExtensions: custom }
            : null,
    })
}

