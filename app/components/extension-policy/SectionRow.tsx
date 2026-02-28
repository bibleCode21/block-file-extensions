import type { ReactNode } from 'react'

type SectionRowProps = {
    label: string
    alignTop?: boolean
    children: ReactNode
}

/** 좌측 라벨 + 우측 내용으로 구성되는 공통 행 레이아웃 */
export function SectionRow({ label, alignTop = false, children }: SectionRowProps) {
    const alignClass = alignTop ? 'items-start' : 'items-center'

    return (
        <section className={`flex ${alignClass} gap-4`}>
            <h2 className="font-semibold text-lg w-32 shrink-0">
                {label}
            </h2>
            <div className="flex-1">
                {children}
            </div>
        </section>
    )
}
