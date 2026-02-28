import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
    DEFAULT_RULESET_KEY,
    DEFAULT_FIXED_EXTENSION_NAMES,
    toPolicyResponse,
} from '@/lib/extension-policy-api'

/**
 * POST /api/extension-policy/init
 * 기본 정책이 없을 때만 생성(멱등). 있으면 기존 데이터 그대로 반환.
 */
export async function POST() {
    const existing = await prisma.extensionRuleSet.findUnique({
        where: { key: DEFAULT_RULESET_KEY },
        include: { extensions: true },
    })
    if (existing) {
        return NextResponse.json({ data: toPolicyResponse(existing) })
    }

    const ruleSet = await prisma.extensionRuleSet.create({
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

    return NextResponse.json({ data: toPolicyResponse(ruleSet) })
}
