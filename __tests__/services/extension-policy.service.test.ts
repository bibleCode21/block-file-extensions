import { ExtensionPolicyService } from '@/backend/services/extension-policy.service'
import type { ExtensionPolicyRepository, RuleSetWithExtensions } from '@/backend/repositories/extension-policy.repository'
import { NotFoundError, ValidationError, ConflictError } from '@/backend/errors'

jest.mock('@/lib/redis', () => ({
    redis: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1),
    },
}))

function createMockRepository(): jest.Mocked<ExtensionPolicyRepository> {
    return {
        findByKey: jest.fn(),
        createWithExtensions: jest.fn(),
        findExtension: jest.fn(),
        updateExtensionEnabled: jest.fn(),
        findAndUpdateFixedExtensionEnabled: jest.fn(),
        getMaxCustomExtensions: jest.fn(),
        countCustomExtensions: jest.fn(),
        addExtension: jest.fn(),
        removeExtension: jest.fn(),
        updateSettings: jest.fn(),
    } as unknown as jest.Mocked<ExtensionPolicyRepository>
}

const baseFixedExtensions = [
    { id: 'ext-1', ruleSetId: 'rs-1', extensionName: 'exe', isFixed: true, enabled: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'ext-2', ruleSetId: 'rs-1', extensionName: 'bat', isFixed: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
]

function makeCustomExtensions(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `custom-${i}`,
        ruleSetId: 'rs-1',
        extensionName: `custom${i}`,
        isFixed: false,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }))
}

function createRuleSet(overrides?: Partial<RuleSetWithExtensions>): RuleSetWithExtensions {
    return {
        id: 'rs-1',
        key: 'default',
        name: '기본 정책',
        isDefault: true,
        maxCustomExtensions: 200,
        maxExtensionNameLength: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
        extensions: [
            ...baseFixedExtensions,
            { id: 'ext-3', ruleSetId: 'rs-1', extensionName: 'custom1', isFixed: false, enabled: true, createdAt: new Date(), updatedAt: new Date() },
        ],
        ...overrides,
    } as RuleSetWithExtensions
}

describe('ExtensionPolicyService', () => {
    let service: ExtensionPolicyService
    let repo: jest.Mocked<ExtensionPolicyRepository>

    beforeEach(() => {
        jest.clearAllMocks()
        repo = createMockRepository()
        service = new ExtensionPolicyService(repo)
    })

    describe('getPolicy', () => {
        it('정책이 없으면 null 반환', async () => {
            repo.findByKey.mockResolvedValue(null)
            const result = await service.getPolicy('default')
            expect(result).toBeNull()
        })

        it('정책이 있으면 PolicyResponse 반환', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            const result = await service.getPolicy('default')
            expect(result).not.toBeNull()
            expect(result!.key).toBe('default')
            expect(result!.fixedExtensions).toHaveLength(2)
            expect(result!.customExtensions).toEqual(['custom1'])
        })
    })

    describe('ensurePolicy', () => {
        it('기존 정책이 있으면 그대로 반환', async () => {
            const existing = createRuleSet()
            repo.findByKey.mockResolvedValue(existing)
            const result = await service.ensurePolicy('default', '기본 정책')
            expect(result.key).toBe('default')
            expect(repo.createWithExtensions).not.toHaveBeenCalled()
        })

        it('정책이 없으면 새로 생성', async () => {
            repo.findByKey.mockResolvedValue(null)
            const created = createRuleSet()
            repo.createWithExtensions.mockResolvedValue(created)
            const result = await service.ensurePolicy('default', '기본 정책')
            expect(repo.createWithExtensions).toHaveBeenCalledTimes(1)
            expect(result.key).toBe('default')
        })
    })

    describe('updateFixedExtensionEnabled', () => {
        it('확장자가 없으면 NotFoundError', async () => {
            repo.findAndUpdateFixedExtensionEnabled.mockResolvedValue(null)
            await expect(service.updateFixedExtensionEnabled('default', 'xyz', true))
                .rejects.toThrow(NotFoundError)
        })

        it('커스텀 확장자이면 ValidationError', async () => {
            repo.findAndUpdateFixedExtensionEnabled.mockResolvedValue({ isFixed: false, ruleSetId: 'rs-1' })
            await expect(service.updateFixedExtensionEnabled('default', 'custom1', true))
                .rejects.toThrow(ValidationError)
        })

        it('고정 확장자이면 정상 업데이트', async () => {
            repo.findAndUpdateFixedExtensionEnabled.mockResolvedValue({ isFixed: true, ruleSetId: 'rs-1' })
            await service.updateFixedExtensionEnabled('default', 'exe', true)
            expect(repo.findAndUpdateFixedExtensionEnabled).toHaveBeenCalledWith('default', 'exe', true)
        })
    })

    describe('addCustomExtension', () => {
        it('이름이 maxExtensionNameLength 초과면 ValidationError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxExtensionNameLength: 10 }))
            const longName = 'a'.repeat(11)
            await expect(service.addCustomExtension('default', longName))
                .rejects.toThrow(ValidationError)
        })

        it('이름이 maxExtensionNameLength 이내면 통과', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxExtensionNameLength: 10 }))
            repo.addExtension.mockResolvedValue(undefined)
            await service.addCustomExtension('default', 'a'.repeat(10))
            expect(repo.addExtension).toHaveBeenCalled()
        })

        it('정책이 없으면 NotFoundError', async () => {
            repo.findByKey.mockResolvedValue(null)
            await expect(service.addCustomExtension('default', 'newext'))
                .rejects.toThrow(NotFoundError)
        })

        it('고정 확장자와 이름이 겹치면 ConflictError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.addCustomExtension('default', 'exe'))
                .rejects.toThrow(ConflictError)
        })

        it('커스텀 확장자와 이름이 겹치면 ConflictError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.addCustomExtension('default', 'custom1'))
                .rejects.toThrow(ConflictError)
        })

        it('최대 개수 초과 시 ValidationError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxCustomExtensions: 1 }))
            repo.countCustomExtensions.mockResolvedValue(1)
            await expect(service.addCustomExtension('default', 'newext'))
                .rejects.toThrow(ValidationError)
        })

        it('커스텀 확장자가 199개일 때 200번째 추가 성공 (경계값 이내)', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({
                maxCustomExtensions: 200,
                extensions: [...baseFixedExtensions, ...makeCustomExtensions(199)],
            }))
            repo.addExtension.mockResolvedValue(undefined)
            await service.addCustomExtension('default', 'ext200')
            expect(repo.addExtension).toHaveBeenCalledWith('rs-1', 'ext200', false, true)
        })

        it('커스텀 확장자가 200개일 때 ValidationError (maxCustomExtensions=200, count=200이면 실패)', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({
                maxCustomExtensions: 200,
                extensions: [...baseFixedExtensions, ...makeCustomExtensions(200)],
            }))
            await expect(service.addCustomExtension('default', 'ext201'))
                .rejects.toThrow(ValidationError)
        })

        it('커스텀 확장자가 201개 상황도 ValidationError (이미 200개에서 막혀 도달 불가)', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({
                maxCustomExtensions: 200,
                extensions: [...baseFixedExtensions, ...makeCustomExtensions(201)],
            }))
            await expect(service.addCustomExtension('default', 'ext202'))
                .rejects.toThrow(ValidationError)
        })

        it('정상 추가', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            repo.addExtension.mockResolvedValue(undefined)
            await service.addCustomExtension('default', 'newext')
            expect(repo.addExtension).toHaveBeenCalledWith('rs-1', 'newext', false, true)
        })
    })

    describe('removeCustomExtension', () => {
        it('확장자가 없으면 NotFoundError', async () => {
            repo.findExtension.mockResolvedValue(null)
            await expect(service.removeCustomExtension('default', 'xyz'))
                .rejects.toThrow(NotFoundError)
        })

        it('고정 확장자이면 ValidationError', async () => {
            repo.findExtension.mockResolvedValue({ isFixed: true, ruleSetId: 'rs-1' })
            await expect(service.removeCustomExtension('default', 'exe'))
                .rejects.toThrow(ValidationError)
        })

        it('커스텀 확장자이면 정상 삭제', async () => {
            repo.findExtension.mockResolvedValue({ isFixed: false, ruleSetId: 'rs-1' })
            repo.removeExtension.mockResolvedValue(undefined)
            await service.removeCustomExtension('default', 'custom1')
            expect(repo.removeExtension).toHaveBeenCalledWith('rs-1', 'custom1')
        })
    })

    describe('updatePolicySettings', () => {
        it('정책이 없으면 NotFoundError', async () => {
            repo.findByKey.mockResolvedValue(null)
            await expect(service.updatePolicySettings('default', { maxCustomExtensions: 100 }))
                .rejects.toThrow(NotFoundError)
        })

        it('maxCustomExtensions가 음수이면 ValidationError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.updatePolicySettings('default', { maxCustomExtensions: -1 }))
                .rejects.toThrow(ValidationError)
        })

        it('maxCustomExtensions가 소수이면 ValidationError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.updatePolicySettings('default', { maxCustomExtensions: 1.5 }))
                .rejects.toThrow(ValidationError)
        })

        it('maxExtensionNameLength가 0이면 ValidationError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.updatePolicySettings('default', { maxExtensionNameLength: 0 }))
                .rejects.toThrow(ValidationError)
        })

        it('maxExtensionNameLength가 소수이면 ValidationError', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.updatePolicySettings('default', { maxExtensionNameLength: 2.5 }))
                .rejects.toThrow(ValidationError)
        })

        it('정상적인 설정 변경', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            const updated = createRuleSet({ maxCustomExtensions: 300, maxExtensionNameLength: 50 })
            repo.updateSettings.mockResolvedValue(updated)
            const result = await service.updatePolicySettings('default', {
                maxCustomExtensions: 300,
                maxExtensionNameLength: 50,
            })
            expect(repo.updateSettings).toHaveBeenCalledWith('default', {
                maxCustomExtensions: 300,
                maxExtensionNameLength: 50,
            })
            expect(result.maxCustomExtensions).toBe(300)
            expect(result.maxExtensionNameLength).toBe(50)
        })

        it('하나만 변경해도 정상 동작', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            const updated = createRuleSet({ maxExtensionNameLength: 100 })
            repo.updateSettings.mockResolvedValue(updated)
            const result = await service.updatePolicySettings('default', { maxExtensionNameLength: 100 })
            expect(repo.updateSettings).toHaveBeenCalledWith('default', { maxExtensionNameLength: 100 })
            expect(result.maxExtensionNameLength).toBe(100)
        })
    })
})
