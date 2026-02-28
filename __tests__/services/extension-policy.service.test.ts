import { ExtensionPolicyService } from '@/backend/services/extension-policy.service'
import type { ExtensionPolicyRepository, RuleSetWithExtensions } from '@/backend/repositories/extension-policy.repository'
import { MAX_EXTENSION_NAME_LENGTH } from '@/backend/constants/extension-policy'

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
        getMaxCustomExtensions: jest.fn(),
        countCustomExtensions: jest.fn(),
        addExtension: jest.fn(),
        removeExtension: jest.fn(),
    } as unknown as jest.Mocked<ExtensionPolicyRepository>
}

function createRuleSet(overrides?: Partial<RuleSetWithExtensions>): RuleSetWithExtensions {
    return {
        id: 'rs-1',
        key: 'default',
        name: '기본 정책',
        isDefault: true,
        maxCustomExtensions: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
        extensions: [
            { id: 'ext-1', ruleSetId: 'rs-1', extensionName: 'exe', isFixed: true, enabled: false, createdAt: new Date(), updatedAt: new Date() },
            { id: 'ext-2', ruleSetId: 'rs-1', extensionName: 'bat', isFixed: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
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
        it('확장자가 없으면 에러', async () => {
            repo.findExtension.mockResolvedValue(null)
            await expect(service.updateFixedExtensionEnabled('default', 'xyz', true))
                .rejects.toThrow('없습니다')
        })

        it('커스텀 확장자이면 에러', async () => {
            repo.findExtension.mockResolvedValue({ isFixed: false, ruleSetId: 'rs-1' })
            await expect(service.updateFixedExtensionEnabled('default', 'custom1', true))
                .rejects.toThrow('고정 확장자만 토글')
        })

        it('고정 확장자이면 정상 업데이트', async () => {
            repo.findExtension.mockResolvedValue({ isFixed: true, ruleSetId: 'rs-1' })
            repo.updateExtensionEnabled.mockResolvedValue(undefined)
            await service.updateFixedExtensionEnabled('default', 'exe', true)
            expect(repo.updateExtensionEnabled).toHaveBeenCalledWith('rs-1', 'exe', true)
        })
    })

    describe('addCustomExtension', () => {
        it('이름이 너무 길면 에러', async () => {
            const longName = 'a'.repeat(MAX_EXTENSION_NAME_LENGTH + 1)
            await expect(service.addCustomExtension('default', longName))
                .rejects.toThrow('이하여야 합니다')
        })

        it('정책이 없으면 에러', async () => {
            repo.findByKey.mockResolvedValue(null)
            await expect(service.addCustomExtension('default', 'newext'))
                .rejects.toThrow('정책이 없습니다')
        })

        it('고정 확장자와 이름이 겹치면 에러', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.addCustomExtension('default', 'exe'))
                .rejects.toThrow('고정 확장자에 이미 포함')
        })

        it('커스텀 확장자와 이름이 겹치면 에러', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            await expect(service.addCustomExtension('default', 'custom1'))
                .rejects.toThrow('이미 등록된 확장자')
        })

        it('최대 개수 초과 시 에러', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxCustomExtensions: 1 }))
            repo.countCustomExtensions.mockResolvedValue(1)
            await expect(service.addCustomExtension('default', 'newext'))
                .rejects.toThrow('최대')
        })

        it('커스텀 확장자가 199개일 때 200번째 추가 성공 (경계값 이내)', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxCustomExtensions: 200 }))
            repo.countCustomExtensions.mockResolvedValue(199)
            repo.addExtension.mockResolvedValue(undefined)
            await service.addCustomExtension('default', 'ext200')
            expect(repo.addExtension).toHaveBeenCalledWith('rs-1', 'ext200', false, true)
        })

        it('커스텀 확장자가 200개일 때 추가 성공 (maxCustomExtensions=200, count=200이면 실패)', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxCustomExtensions: 200 }))
            repo.countCustomExtensions.mockResolvedValue(200)
            await expect(service.addCustomExtension('default', 'ext201'))
                .rejects.toThrow('커스텀 확장자는 최대 200개까지 등록할 수 있습니다.')
        })

        it('커스텀 확장자가 201개 상황은 이미 200개에서 막혀 도달 불가', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet({ maxCustomExtensions: 200 }))
            repo.countCustomExtensions.mockResolvedValue(201)
            await expect(service.addCustomExtension('default', 'ext202'))
                .rejects.toThrow('커스텀 확장자는 최대 200개까지 등록할 수 있습니다.')
        })

        it('정상 추가', async () => {
            repo.findByKey.mockResolvedValue(createRuleSet())
            repo.countCustomExtensions.mockResolvedValue(0)
            repo.addExtension.mockResolvedValue(undefined)
            await service.addCustomExtension('default', 'newext')
            expect(repo.addExtension).toHaveBeenCalledWith('rs-1', 'newext', false, true)
        })
    })

    describe('removeCustomExtension', () => {
        it('확장자가 없으면 에러', async () => {
            repo.findExtension.mockResolvedValue(null)
            await expect(service.removeCustomExtension('default', 'xyz'))
                .rejects.toThrow('찾을 수 없습니다')
        })

        it('고정 확장자이면 에러', async () => {
            repo.findExtension.mockResolvedValue({ isFixed: true, ruleSetId: 'rs-1' })
            await expect(service.removeCustomExtension('default', 'exe'))
                .rejects.toThrow('고정 확장자는 삭제할 수 없습니다')
        })

        it('커스텀 확장자이면 정상 삭제', async () => {
            repo.findExtension.mockResolvedValue({ isFixed: false, ruleSetId: 'rs-1' })
            repo.removeExtension.mockResolvedValue(undefined)
            await service.removeCustomExtension('default', 'custom1')
            expect(repo.removeExtension).toHaveBeenCalledWith('rs-1', 'custom1')
        })
    })
})
