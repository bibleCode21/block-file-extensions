import type { FixedExtension } from './types'

type FixedExtensionListProps = {
    extensions: FixedExtension[]
    onToggle: (name: string) => void
}

/** 고정 확장자 체크박스 묶음 UI */
export function FixedExtensionList({ extensions, onToggle }: FixedExtensionListProps) {
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
