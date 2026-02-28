import { handleGet, handlePatch, handlePost } from '@/backend/controllers/extension-policy-controller'
import { withApiHandler } from '@/backend/interceptors/with-api-handler'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(handleGet)

export const PATCH = withApiHandler(async (req: Request) => handlePatch(req))

export const POST = withApiHandler(async (req: Request) => handlePost(req))
