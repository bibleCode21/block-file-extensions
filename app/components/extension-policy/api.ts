import type { FixedExtension } from './types'
import type { ExtensionPolicyData } from './types'

/** API 응답의 고정 확장자(enabled) → UI 형태(checked)로 매핑. DB에서 항상 채워져 옴. */
export function toFixedExtensions(
    apiFixed: ExtensionPolicyData['fixedExtensions']
): FixedExtension[] {
    return (apiFixed ?? []).map(({ name, enabled }) => ({ name, checked: enabled }))
}
