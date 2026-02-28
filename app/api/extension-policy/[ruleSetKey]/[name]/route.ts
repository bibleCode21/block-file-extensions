import { NextResponse } from 'next/server'
import { handleDelete } from '@/backend/controllers/extension-policy-controller'

export const dynamic = 'force-dynamic'

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ ruleSetKey: string; name: string }> },
) {
    const { ruleSetKey, name } = await params
    const result = await handleDelete(ruleSetKey, name)
    return NextResponse.json(result.body, { status: result.status })
}
