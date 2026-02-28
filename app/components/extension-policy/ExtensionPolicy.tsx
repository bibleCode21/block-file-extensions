'use client'

import { useState, useEffect } from 'react'
import type { FixedExtension } from './types'
import { SectionRow } from './SectionRow'
import { FixedExtensionList } from './FixedExtensionList'
import { CustomExtensionList } from './CustomExtensionList'
import { validateCustomExtension } from './validation'
import { toFixedExtensions } from './mapper'
import type { ExtensionPolicyData } from './types'
import { MAX_EXTENSION_NAME_LENGTH } from '@/backend/constants/extension-policy'

export default function ExtensionPolicy() {
    const [fixedExtensions, setFixedExtensions] = useState<FixedExtension[]>([])
    const [customExtensions, setCustomExtensions] = useState<string[]>([])
    const [maxCustomExtensions, setMaxCustomExtensions] = useState(0)
    const [inputExt, setInputExt] = useState('')
    const [addError, setAddError] = useState<string | null>(null)
    const [loadState, setLoadState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    useEffect(() => {
        setLoadState('loading')
        fetch('/api/extension-policy')
            .then(res => res.json())
            .then((json: { data?: ExtensionPolicyData | null }) => {
                const data = json.data
                if (data) {
                    setLoadState('success')
                    setFixedExtensions(toFixedExtensions(data.fixedExtensions))
                    setCustomExtensions(Array.isArray(data.customExtensions) ? data.customExtensions : [])
                    setMaxCustomExtensions(data.maxCustomExtensions ?? 200)
                    return
                }
                // 기본 정책이 없으면 init 호출 후 응답으로 상태 설정
                return fetch('/api/extension-policy/init', { method: 'POST' })
                    .then(r => r.json())
                    .then((initJson: { data?: ExtensionPolicyData | null }) => {
                        setLoadState('success')
                        const initData = initJson.data
                        if (!initData) return
                        setFixedExtensions(toFixedExtensions(initData.fixedExtensions))
                        setCustomExtensions(Array.isArray(initData.customExtensions) ? initData.customExtensions : [])
                        setMaxCustomExtensions(initData.maxCustomExtensions ?? 200)
                    })
            })
            .catch(() => setLoadState('error'))
    }, [])

    const toggleFixed = (name: string) => {
        const current = fixedExtensions.find(ext => ext.name === name)
        if (!current) return
        const nextEnabled = !current.checked

        setFixedExtensions(prev =>
            prev.map(ext =>
                ext.name === name ? { ...ext, checked: nextEnabled } : ext
            )
        )

        fetch('/api/extension-policy', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, enabled: nextEnabled }),
        })
            .then(res => {
                if (!res.ok) throw new Error()
            })
            .catch(() => {
                setFixedExtensions(prev =>
                    prev.map(ext =>
                        ext.name === name ? { ...ext, checked: current.checked } : ext
                    )
                )
            })
    }

    const addExtension = () => {
        const result = validateCustomExtension(
            inputExt,
            fixedExtensions,
            customExtensions,
            maxCustomExtensions
        )

        if (!result.success) {
            setAddError(result.error)
            return
        }

        const newName = result.value
        setAddError(null)
        setCustomExtensions(prev => [...prev, newName])
        setInputExt('')

        fetch('/api/extension-policy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        })
            .then(res => {
                if (!res.ok) throw new Error()
            })
            .catch(() => {
                setCustomExtensions(prev => prev.filter(e => e !== newName))
                setAddError('저장에 실패했습니다. 다시 시도해 주세요.')
            })
    }

    const removeExtension = (ext: string) => {
        setCustomExtensions(prev => prev.filter(e => e !== ext))

        fetch(`/api/extension-policy/default/${encodeURIComponent(ext)}`, {
            method: 'DELETE',
        })
            .then(res => {
                if (!res.ok) throw new Error()
            })
            .catch(() => {
                setCustomExtensions(prev => [...prev, ext])
            })
    }

    if (loadState === 'loading') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <p className="text-gray-500">정책을 불러오는 중...</p>
            </div>
        )
    }

    if (loadState === 'error') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <p className="text-red-600" role="alert">
                    정책을 불러오지 못했습니다. 새로고침해 주세요.
                </p>
            </div>
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
                <SectionRow label="고정 확장자">
                    <FixedExtensionList
                        extensions={fixedExtensions}
                        onToggle={toggleFixed}
                    />
                </SectionRow>

                <SectionRow label="커스텀 확장자" alignTop>
                    <div className="space-y-3 max-w-xl">
                        <div className="flex gap-2">
                            <input
                                value={inputExt}
                                onChange={e => {
                                    const v = e.target.value
                                    if (v.length <= MAX_EXTENSION_NAME_LENGTH) setInputExt(v)
                                    setAddError(null)
                                }}
                                onKeyDown={e => e.key === 'Enter' && addExtension()}
                                placeholder={`확장자 입력 (최대 ${MAX_EXTENSION_NAME_LENGTH}자)`}
                                maxLength={MAX_EXTENSION_NAME_LENGTH}
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
                            maxCount={maxCustomExtensions}
                            onRemove={removeExtension}
                        />
                    </div>
                </SectionRow>
            </div>
        </div>
    )
}
