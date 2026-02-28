import 'server-only'
import { ExtensionPolicyRepository } from './repositories/extension-policy.repository'
import { ExtensionPolicyService } from './services/extension-policy.service'
import type { IExtensionPolicyService } from './services/extension-policy.service.interface'

function createExtensionPolicyService(): IExtensionPolicyService {
    const repository = new ExtensionPolicyRepository()
    return new ExtensionPolicyService(repository)
}

const globalForContainer = globalThis as unknown as {
    extensionPolicyService?: IExtensionPolicyService
}

/** 개발 모드에서는 캐시하지 않아 HMR 후에도 최신 서비스 메서드가 반영됨 */
export const extensionPolicyService: IExtensionPolicyService =
    process.env.NODE_ENV === 'production'
        ? (globalForContainer.extensionPolicyService ??= createExtensionPolicyService())
        : createExtensionPolicyService()
