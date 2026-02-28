'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
            <h2 className="text-lg font-medium">문제가 발생했습니다</h2>
            <p className="text-sm text-zinc-500">
                일시적인 오류일 수 있습니다. 아래 버튼으로 다시 시도해 주세요.
            </p>
            <button
                type="button"
                onClick={() => reset()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
                다시 시도
            </button>
        </div>
    )
}
