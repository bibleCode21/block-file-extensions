'use client'

import { useState, type ReactNode } from 'react'

type FixedExtension = {
    name: string
    checked: boolean
}

// 보안상 기본 제공되는 차단 확장자 목록
const DEFAULT_FIXED_EXTENSIONS: FixedExtension[] = [
    { name: 'bat', checked: false },
    { name: 'cmd', checked: false },
    { name: 'com', checked: false },
    { name: 'cpl', checked: false },
    { name: 'exe', checked: false },
    { name: 'scr', checked: false },
    { name: 'js', checked: false },
]

// 커스텀 확장자 최대 개수 (UI와 로직에서 함께 사용)
const MAX_CUSTOM_EXTENSIONS = 200

type SectionRowProps = {
    label: string
    alignTop?: boolean
    children: ReactNode
}

// 좌측 라벨 + 우측 내용으로 구성되는 공통 행 레이아웃
function SectionRow({ label, alignTop = false, children }: SectionRowProps) {
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

type FixedExtensionListProps = {
    extensions: FixedExtension[]
    onToggle: (name: string) => void
}

// 고정 확장자 체크박스 묶음 UI
function FixedExtensionList({ extensions, onToggle }: FixedExtensionListProps) {
    return (
        <div className="flex flex-wrap gap-4">
            {extensions.map(ext => (
                <label
                    key={ext.name}
                    className="flex items-center gap-2 p-2"
                >
                    <input
                        type="checkbox"
                        checked={ext.checked}
                        onChange={() => onToggle(ext.name)}
                    />
                    <span className="text-lg">
                        {ext.name}
                    </span>
                </label>
            ))}
        </div>
    )
}

type CustomExtensionListProps = {
    values: string[]
    onRemove: (ext: string) => void
}

// 커스텀 확장자 목록 + 개수 표시 영역
function CustomExtensionList({ values, onRemove }: CustomExtensionListProps) {
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

// 입력 정규화 + 검증만 수행. 추가(상태 변경)는 호출부에서 처리.
function validateCustomExtension(
    rawInput: string,
    fixedExtensions: FixedExtension[],
    customExtensions: string[]
): { success: true; value: string } | { success: false; error: string } {
    let value = rawInput.trim().toLowerCase()

    if (!value) return { success: false, error: '확장자를 입력해 주세요.' }

    if (value.startsWith('.')) value = value.slice(1)

    if (!/^[a-z0-9]+$/.test(value)) {
        return { success: false, error: '영문 소문자와 숫자만 입력할 수 있습니다.' }
    }

    if (fixedExtensions.some(ext => ext.name === value)) {
        return { success: false, error: '고정 확장자에 이미 포함되어 있습니다.' }
    }
    if (customExtensions.includes(value)) {
        return { success: false, error: '이미 등록된 확장자입니다.' }
    }
    if (customExtensions.length >= MAX_CUSTOM_EXTENSIONS) {
        return { success: false, error: `최대 ${MAX_CUSTOM_EXTENSIONS}개까지 등록할 수 있습니다.` }
    }

    return { success: true, value }
}

export default function ExtensionPolicy() {
    const [fixedExtensions, setFixedExtensions] = useState<FixedExtension[]>(DEFAULT_FIXED_EXTENSIONS)
    const [customExtensions, setCustomExtensions] = useState<string[]>([])
    const [inputExt, setInputExt] = useState('')
    const [addError, setAddError] = useState<string | null>(null)

    const toggleFixed = (name: string) => {
        setFixedExtensions(prev =>
            prev.map(ext =>
                ext.name === name
                    ? { ...ext, checked: !ext.checked }
                    : ext
            )
        )
    }

    // 검증 후 통과하면 목록에 추가하고 입력/에러 초기화
    const addExtension = () => {
        const result = validateCustomExtension(inputExt, fixedExtensions, customExtensions)

        if (!result.success) {
            setAddError(result.error)
            return
        }

        setAddError(null)
        setCustomExtensions(prev => [...prev, result.value])
        setInputExt('')
    }

    // 커스텀 확장자 목록에서 해당 항목 제거
    const removeExtension = (ext: string) => {
        setCustomExtensions(prev =>
            prev.filter(e => e !== ext)
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-b-2 border-black pb-3 pl-2">
                    <h1 className="text-2xl font-bold">
                        ◎ 파일 확장자 차단
                    </h1>
                </div>
                <p className="text-xl">
                    파일확장자에 따라 특정 형식의 파일을 첨부하거나 전송하지 못하도록 제한
                </p>
            </div>

            <div className="flex flex-col gap-6 mt-6">
                {/* 고정 확장자 */}
                <SectionRow label="고정 확장자">
                    <FixedExtensionList
                        extensions={fixedExtensions}
                        onToggle={toggleFixed}
                    />
                </SectionRow>

                {/* 커스텀 확장자 + 목록 */}
                <SectionRow label="커스텀 확장자" alignTop>
                    <div className="space-y-3 max-w-xl">
                        <div className="flex gap-2">
                            <input
                                value={inputExt}
                                onChange={e => {
                                    setInputExt(e.target.value)
                                    setAddError(null)
                                }}
                                onKeyDown={e => e.key === 'Enter' && addExtension()}
                                placeholder="확장자 입력"
                                className="border rounded-lg px-3 py-1 flex-1"
                            />

                            <button
                                type="button"
                                onClick={addExtension}
                                className="bg-[#AAAAAA] text-white px-4 py-1 rounded-lg"
                            >
                                +추가
                            </button>
                        </div>

                        {addError && (
                            <p className="text-sm text-red-600" role="alert">
                                {addError}
                            </p>
                        )}

                        <CustomExtensionList
                            values={customExtensions}
                            onRemove={removeExtension}
                        />
                    </div>
                </SectionRow>
            </div>
        </div>
    )
}