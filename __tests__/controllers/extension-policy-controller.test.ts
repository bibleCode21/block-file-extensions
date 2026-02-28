import type { IExtensionPolicyService } from '@/backend/services/extension-policy.service.interface'
import type { PolicyResponse } from '@/backend/dto/extension-policy.dto'

const mockService: jest.Mocked<IExtensionPolicyService> = {
    getPolicy: jest.fn(),
    ensurePolicy: jest.fn(),
    updateFixedExtensionEnabled: jest.fn(),
    addCustomExtension: jest.fn(),
    removeCustomExtension: jest.fn(),
}

jest.mock('@/backend/container', () => ({
    extensionPolicyService: mockService,
}))

import { handleGet, handlePatch, handlePost, handleDelete, handleInit } from '@/backend/controllers/extension-policy-controller'

function createRequest(body: unknown): Request {
    return new Request('http://localhost/api/extension-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

function createBadRequest(): Request {
    return new Request('http://localhost/api/extension-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
    })
}

const samplePolicy: PolicyResponse = {
    id: 'rs-1',
    key: 'default',
    name: '기본 정책',
    maxCustomExtensions: 200,
    fixedExtensions: [{ name: 'exe', enabled: false }],
    customExtensions: ['custom1'],
}

describe('Extension Policy Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('handleGet', () => {
        it('정책 조회 시 200 반환', async () => {
            mockService.getPolicy.mockResolvedValue(samplePolicy)
            const result = await handleGet()
            expect(result.status).toBe(200)
            expect((result.body as { data: PolicyResponse }).data).toEqual(samplePolicy)
        })

        it('정책이 없으면 data가 null', async () => {
            mockService.getPolicy.mockResolvedValue(null)
            const result = await handleGet()
            expect(result.status).toBe(200)
            expect((result.body as { data: null }).data).toBeNull()
        })
    })

    describe('handlePatch', () => {
        it('잘못된 JSON이면 400', async () => {
            const result = await handlePatch(createBadRequest())
            expect(result.status).toBe(400)
        })

        it('name이 없으면 400', async () => {
            const result = await handlePatch(createRequest({ enabled: true }))
            expect(result.status).toBe(400)
        })

        it('enabled가 없으면 400', async () => {
            const result = await handlePatch(createRequest({ name: 'exe' }))
            expect(result.status).toBe(400)
        })

        it('유효하지 않은 확장자 이름이면 400', async () => {
            const result = await handlePatch(createRequest({ name: '!!invalid!!', enabled: true }))
            expect(result.status).toBe(400)
        })

        it('정상 요청 시 200', async () => {
            mockService.updateFixedExtensionEnabled.mockResolvedValue(undefined)
            const result = await handlePatch(createRequest({ name: 'exe', enabled: true }))
            expect(result.status).toBe(200)
            expect(mockService.updateFixedExtensionEnabled).toHaveBeenCalledWith('default', 'exe', true)
        })

        it('서비스 에러 시 적절한 status 반환', async () => {
            mockService.updateFixedExtensionEnabled.mockRejectedValue(
                new Error("정책 'default'에 확장자 'xyz'이(가) 없습니다.")
            )
            const result = await handlePatch(createRequest({ name: 'xyz', enabled: true }))
            expect(result.status).toBe(404)
        })

        it('.으로 시작하는 확장자도 정규화되어 정상 처리', async () => {
            mockService.updateFixedExtensionEnabled.mockResolvedValue(undefined)
            const result = await handlePatch(createRequest({ name: '.EXE', enabled: false }))
            expect(result.status).toBe(200)
            expect(mockService.updateFixedExtensionEnabled).toHaveBeenCalledWith('default', 'exe', false)
        })
    })

    describe('handlePost', () => {
        it('잘못된 JSON이면 400', async () => {
            const result = await handlePost(createBadRequest())
            expect(result.status).toBe(400)
        })

        it('name이 없으면 400', async () => {
            const result = await handlePost(createRequest({}))
            expect(result.status).toBe(400)
        })

        it('정상 추가 시 200', async () => {
            mockService.addCustomExtension.mockResolvedValue(undefined)
            const result = await handlePost(createRequest({ name: 'docx' }))
            expect(result.status).toBe(200)
            expect(mockService.addCustomExtension).toHaveBeenCalledWith('default', 'docx')
        })

        it('정책 없을 때 404', async () => {
            mockService.addCustomExtension.mockRejectedValue(new Error('정책이 없습니다. init을 먼저 호출하세요.'))
            const result = await handlePost(createRequest({ name: 'docx' }))
            expect(result.status).toBe(404)
        })

        it('중복 시 400', async () => {
            mockService.addCustomExtension.mockRejectedValue(new Error('이미 등록된 확장자입니다.'))
            const result = await handlePost(createRequest({ name: 'docx' }))
            expect(result.status).toBe(400)
        })
    })

    describe('handleDelete', () => {
        it('유효하지 않은 확장자 이름이면 400', async () => {
            const result = await handleDelete('default', '!!invalid!!')
            expect(result.status).toBe(400)
        })

        it('정상 삭제 시 200', async () => {
            mockService.removeCustomExtension.mockResolvedValue(undefined)
            const result = await handleDelete('default', 'custom1')
            expect(result.status).toBe(200)
            expect(mockService.removeCustomExtension).toHaveBeenCalledWith('default', 'custom1')
        })

        it('확장자가 없으면 404', async () => {
            mockService.removeCustomExtension.mockRejectedValue(new Error('해당 확장자를 찾을 수 없습니다.'))
            const result = await handleDelete('default', 'unknown')
            expect(result.status).toBe(404)
        })

        it('고정 확장자 삭제 시도 시 400', async () => {
            mockService.removeCustomExtension.mockRejectedValue(new Error('고정 확장자는 삭제할 수 없습니다.'))
            const result = await handleDelete('default', 'exe')
            expect(result.status).toBe(400)
        })
    })

    describe('handleInit', () => {
        it('정책 초기화 시 200 반환', async () => {
            mockService.ensurePolicy.mockResolvedValue(samplePolicy)
            const result = await handleInit()
            expect(result.status).toBe(200)
            expect((result.body as { data: PolicyResponse }).data).toEqual(samplePolicy)
        })
    })
})
