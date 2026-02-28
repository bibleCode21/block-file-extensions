import type { FixedExtension } from './types'

/** 보안상 기본 제공되는 차단 확장자 목록 */
export const DEFAULT_FIXED_EXTENSIONS: FixedExtension[] = [
    { name: 'bat', checked: false },
    { name: 'cmd', checked: false },
    { name: 'com', checked: false },
    { name: 'cpl', checked: false },
    { name: 'exe', checked: false },
    { name: 'scr', checked: false },
    { name: 'js', checked: false },
]

/** 커스텀 확장자 최대 개수 (UI와 로직에서 함께 사용) */
export const MAX_CUSTOM_EXTENSIONS = 200
