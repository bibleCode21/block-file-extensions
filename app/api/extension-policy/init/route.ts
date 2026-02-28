import { handleInit } from '@/backend/controllers/extension-policy.controller'
import { withApiHandler } from '@/backend/interceptors/with-api-handler'

export const dynamic = 'force-dynamic'

export const POST = withApiHandler(handleInit)
