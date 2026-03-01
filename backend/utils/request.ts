import { AppError, ValidationError } from '@/backend/errors'

export type ControllerResponse = { status: number; body: object }

/** catch 절에서 받는 값. throw는 어떤 값이든 가능하므로 unknown */
export type CaughtException = unknown

const MAX_BODY_SIZE = 1024 * 10 // 10 KB

export async function parseJsonBody<T = unknown>(req: Request): Promise<T> {
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BODY_SIZE) {
        throw new ValidationError(`요청 본문이 너무 큽니다. (최대 ${MAX_BODY_SIZE / 1024}KB)`)
    }

    const text = await req.text()
    if (text.length > MAX_BODY_SIZE) {
        throw new ValidationError(`요청 본문이 너무 큽니다. (최대 ${MAX_BODY_SIZE / 1024}KB)`)
    }

    try {
        return JSON.parse(text) as T
    } catch {
        throw new ValidationError('JSON 본문이 올바르지 않습니다.')
    }
}

export function handleError(e: CaughtException, fallbackMessage: string): ControllerResponse {
    if (e instanceof AppError) {
        return { status: e.statusCode, body: { error: e.message } }
    }
    const message = e instanceof Error ? e.message : fallbackMessage
    return { status: 500, body: { error: message } }
}
