import { NextResponse } from 'next/server'
import { AppError } from '@/backend/errors'
import type { ControllerResponse } from '@/backend/utils/request'

type HandlerFn<T extends unknown[]> = (...args: T) => Promise<ControllerResponse>

/**
 * Route 핸들러 래퍼(인터셉터).
 * - ControllerResponse → NextResponse 변환
 * - Controller에서 잡지 못한 예외 → 공통 에러 응답
 * - 공통 응답 헤더 부여
 * - (확장 지점) 로깅, 요청 ID, 소요 시간 측정 등
 */
export function withApiHandler<T extends unknown[]>(handler: HandlerFn<T>) {
    return async (...args: T): Promise<NextResponse> => {
        const start = Date.now()
        try {
            const result = await handler(...args)
            const response = NextResponse.json(result.body, { status: result.status })
            response.headers.set('X-Response-Time', `${Date.now() - start}ms`)
            return response
        } catch (e) {
            const elapsed = Date.now() - start
            if (e instanceof AppError) {
                const response = NextResponse.json(
                    { error: e.message },
                    { status: e.statusCode },
                )
                response.headers.set('X-Response-Time', `${elapsed}ms`)
                return response
            }
            console.error('[API Error]', e)
            const response = NextResponse.json(
                { error: '서버 내부 오류가 발생했습니다.' },
                { status: 500 },
            )
            response.headers.set('X-Response-Time', `${elapsed}ms`)
            return response
        }
    }
}
