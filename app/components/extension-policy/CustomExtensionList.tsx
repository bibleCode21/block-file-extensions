import { MAX_CUSTOM_EXTENSIONS } from './constants'

type CustomExtensionListProps = {
    values: string[]
    onRemove: (ext: string) => void
}

/** 커스텀 확장자 목록 + 개수 표시 영역 */
export function CustomExtensionList({ values, onRemove }: CustomExtensionListProps) {
    if (values.length === 0) {
        return (
            <div className="border rounded-lg px-3 py-2 min-h-[48px]">
                <p className="text-gray-400 text-sm">
                    추가된 확장자가 없습니다.
                </p>
            </div>
        )
    }

    return (
        <div className="border rounded-lg px-3 py-2 min-h-[48px]">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-400">
                        {values.length}/{MAX_CUSTOM_EXTENSIONS}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {values.map(ext => (
                        <div
                            key={ext}
                            className="flex items-center gap-2 px-3 py-1 rounded-lg border"
                        >
                            <span className="text-[#AAAAAA]">
                                {ext}
                            </span>
                            <button
                                type="button"
                                onClick={() => onRemove(ext)}
                                className="font-bold"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
