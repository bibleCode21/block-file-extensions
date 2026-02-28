import 'server-only'
import { ExtensionPolicyRepository } from './repositories/extension-policy.repository'
import { ExtensionPolicyService } from './services/extension-policy.service'
import type { IExtensionPolicyService } from './services/extension-policy.service.interface'

const globalForContainer = globalThis as unknown as {
    extensionPolicyService?: IExtensionPolicyService
}

export const extensionPolicyService: IExtensionPolicyService =
    globalForContainer.extensionPolicyService ??
    (() => {
        const repository = new ExtensionPolicyRepository()
        const service = new ExtensionPolicyService(repository)
        if (process.env.NODE_ENV !== 'production') {
            globalForContainer.extensionPolicyService = service
        }
        return service
    })()
