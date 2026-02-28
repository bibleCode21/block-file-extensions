export default function Loading() {
    return (
        <div className="mx-auto max-w-2xl animate-pulse space-y-6 p-6">
            <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="space-y-4">
                <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-4 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-20 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="space-y-4">
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-10 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
        </div>
    )
}
