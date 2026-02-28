import { NextResponse } from 'next/server'
import { DEFAULT_RULESET_KEY } from '@/lib/extension-policy-api'
import { ensurePolicy } from '@/lib/extension-policy-service'

/**
 * POST /api/extension-policy/init
 * 기본 정책이 없을 때만 생성(멱등). 있으면 기존 데이터 그대로 반환.
 */
export async function POST() {
    const data = await ensurePolicy(DEFAULT_RULESET_KEY, '기본 정책')
    return NextResponse.json({ data })
}
