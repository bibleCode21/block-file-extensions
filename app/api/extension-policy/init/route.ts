import { NextResponse } from 'next/server'
import { handleInit } from '@/backend/controllers/extension-policy-controller'

export const dynamic = 'force-dynamic'

/**
 * POST /api/extension-policy/init
 * 기본 정책이 없을 때만 생성(멱등). 있으면 기존 데이터 그대로 반환.
 */
export async function POST() {
    const result = await handleInit()
    return NextResponse.json(result.body, { status: result.status })
}
