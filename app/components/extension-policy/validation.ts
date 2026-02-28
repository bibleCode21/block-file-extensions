import type { FixedExtension } from './types'
import { MAX_CUSTOM_EXTENSIONS } from './constants'

/** 입력 정규화 + 검증만 수행. 추가(상태 변경)는 호출부에서 처리. */
export function validateCustomExtension(
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
