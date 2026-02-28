import 'server-only'
import { prisma } from '@/lib/prisma'
import { toPolicyResponse, type PolicyResponse } from '@/backend/dto/extension-policy.dto'
import {
    DEFAULT_FIXED_EXTENSION_NAMES,
    MAX_EXTENSION_NAME_LENGTH,
} from '@/backend/controllers/extension-policy-controller'

type FixedExtensionDto = {
    name: string
    enabled: boolean
}

export type SavePolicyInput = {
    name: string
    fixedExtensions: FixedExtensionDto[]
    customExtensions: string[]
}

/** ruleSetKey로 룰셋 조회. 없으면 null 반환(생성하지 않음). */
export async function getPolicy(ruleSetKey: string): Promise<PolicyResponse | null> {
    const ruleSet = await prisma.extensionRuleSet.findUnique({
        where: { key: ruleSetKey },
        include: {
            extensions: { orderBy: { extensionName: 'asc' } },
        },
    })
    if (!ruleSet) return null
    return toPolicyResponse(ruleSet)
}

/** ruleSetKey 룰셋이 없으면 생성하고, 존재하면 그대로 반환. */
export async function ensurePolicy(ruleSetKey: string, displayName?: string): Promise<PolicyResponse> {
    const existing = await prisma.extensionRuleSet.findUnique({
        where: { key: ruleSetKey },
        include: {
            extensions: { orderBy: { extensionName: 'asc' } },
        },
    })
    if (existing) {
        return toPolicyResponse(existing)
    }

    const ruleSet = await prisma.extensionRuleSet.create({
        data: {
            key: ruleSetKey,
            name: displayName ?? ruleSetKey,
            isDefault: ruleSetKey === 'default',
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

    return toPolicyResponse(ruleSet)
}

/** 고정 확장자 하나의 enabled만 갱신 (토글용). 커스텀 확장자 name이 오면 거부. */
export async function updateFixedExtensionEnabled(
    ruleSetKey: string,
    name: string,
    enabled: boolean,
): Promise<void> {
    const ext = await prisma.extension.findFirst({
        where: {
            extensionName: name,
            ruleSet: { key: ruleSetKey },
        },
        select: { isFixed: true, ruleSetId: true },
    })
    if (!ext) {
        throw new Error('기본 정책이 없습니다. init을 먼저 호출하세요.')
    }
    if (!ext.isFixed) {
        throw new Error('고정 확장자만 토글할 수 있습니다.')
    }

    await prisma.extension.update({
        where: {
            ruleSetId_extensionName: { ruleSetId: ext.ruleSetId, extensionName: name },
        },
        data: { enabled },
    })
}

/** 정책 저장 (고정/커스텀 확장자 동기화). ruleSetKey로 대상 룰셋 지정. */
export async function savePolicy(ruleSetKey: string, input: SavePolicyInput): Promise<PolicyResponse> {
    const { name, fixedExtensions, customExtensions } = input

    // 중복 제거 (입력 배열 내 중복)
    const fixedMap = new Map<string, boolean>()
    for (const ext of fixedExtensions) fixedMap.set(ext.name, ext.enabled)
    const fixedNames = [...fixedMap.keys()]

    const customSet = new Set<string>(customExtensions)
    const customNames = [...customSet]

    // 고정/커스텀 간 중복 방지 (스키마 unique와 정책상 중복 불가)
    const overlap = customNames.filter(x => fixedMap.has(x))
    if (overlap.length > 0) {
        throw new Error(`고정 확장자와 중복된 값이 있습니다: ${overlap.join(', ')}`)
    }

    const existingRuleSet = await prisma.extensionRuleSet.findUnique({
        where: { key: ruleSetKey },
    })
    const maxCustom = existingRuleSet?.maxCustomExtensions ?? 200
    if (customNames.length > maxCustom) {
        throw new Error(`커스텀 확장자는 최대 ${maxCustom}개까지 등록할 수 있습니다.`)
    }
    const tooLong = customNames.find(extName => extName.length > MAX_EXTENSION_NAME_LENGTH)
    if (tooLong) {
        throw new Error(`확장자 이름은 ${MAX_EXTENSION_NAME_LENGTH}자 이하여야 합니다. (예: ${tooLong})`)
    }

    const saved = await prisma.$transaction(async tx => {
        const ruleSet = await tx.extensionRuleSet.upsert({
            where: { key: ruleSetKey },
            create: {
                key: ruleSetKey,
                name,
                isDefault: ruleSetKey === 'default',
            },
            update: {
                name,
                isDefault: ruleSetKey === 'default',
            },
        })

        await tx.extension.deleteMany({
            where: {
                ruleSetId: ruleSet.id,
                OR: [
                    { isFixed: true, extensionName: { notIn: fixedNames } },
                    { isFixed: false, extensionName: { notIn: customNames } },
                ],
            },
        })

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

        if (!refreshed) throw new Error('정책 저장 후 조회에 실패했습니다.')

        return refreshed
    })

    return toPolicyResponse(saved)
}
