import type { FixedExtension } from './types'
import { DEFAULT_FIXED_EXTENSIONS } from './constants'
import type { ExtensionPolicyData } from './types'

/** API 응답의 고정 확장자(enabled) → UI 형태(checked)로 매핑 */
export function toFixedExtensions(
    apiFixed: ExtensionPolicyData['fixedExtensions']
): FixedExtension[] {
    if (!apiFixed?.length) return DEFAULT_FIXED_EXTENSIONS
    return apiFixed.map(({ name, enabled }) => ({ name, checked: enabled }))
}
