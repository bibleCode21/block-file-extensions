import { handlePatchSettings } from '@/backend/controllers/extension-policy.controller'
import { withApiHandler } from '@/backend/interceptors/with-api-handler'

export const dynamic = 'force-dynamic'

export const PATCH = withApiHandler(async (req: Request) => handlePatchSettings(req))
