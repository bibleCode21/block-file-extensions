import { NextResponse } from 'next/server'
import { openApiSpec } from './spec'

export async function GET() {
    return NextResponse.json(openApiSpec)
}
