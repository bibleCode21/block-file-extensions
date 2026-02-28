/** 고정 확장자 UI 상태 (체크박스 on/off) */
export type FixedExtension = {
    name: string
    checked: boolean
}

/** GET /api/extension-policy 응답의 data 필드 */
export type ExtensionPolicyData = {
    id?: string
    key?: string
    name?: string
    maxCustomExtensions?: number
    maxExtensionNameLength?: number
    fixedExtensions?: Array<{ name: string; enabled: boolean }>
    customExtensions?: string[]
}
