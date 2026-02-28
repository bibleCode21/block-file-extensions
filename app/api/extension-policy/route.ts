import { NextResponse } from 'next/server'
import { handleGet, handlePatch, handlePost } from '@/backend/controllers/extension-policy-controller'

export const dynamic = 'force-dynamic'

export async function GET() {
    const result = await handleGet()
    return NextResponse.json(result.body, { status: result.status })
}

export async function PATCH(req: Request) {
    const result = await handlePatch(req)
    return NextResponse.json(result.body, { status: result.status })
}

export async function POST(req: Request) {
    const result = await handlePost(req)
    return NextResponse.json(result.body, { status: result.status })
}
