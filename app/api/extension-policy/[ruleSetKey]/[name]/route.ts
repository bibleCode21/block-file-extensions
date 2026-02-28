import { handleDelete } from '@/backend/controllers/extension-policy-controller'
import { withApiHandler } from '@/backend/interceptors/with-api-handler'

export const dynamic = 'force-dynamic'

export const DELETE = withApiHandler(
    async (
        _req: Request,
        { params }: { params: Promise<{ ruleSetKey: string; name: string }> },
    ) => {
        const { ruleSetKey, name } = await params
        return handleDelete(ruleSetKey, name)
    },
)
