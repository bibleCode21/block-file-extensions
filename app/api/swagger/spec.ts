export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Block File Extensions API',
        version: '1.0.0',
        description: '파일 확장자 차단 정책 관리 API',
    },
    servers: [{ url: '/' }],
    paths: {
        '/api/extension-policy': {
            get: {
                summary: '정책 조회',
                description: '기본 확장자 차단 정책(고정 확장자 + 커스텀 확장자)을 반환합니다.',
                operationId: 'getPolicy',
                tags: ['Extension Policy'],
                responses: {
                    '200': {
                        description: '정책 조회 성공',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/PolicyResponse' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            patch: {
                summary: '고정 확장자 토글',
                description: '고정 확장자의 enabled 상태를 변경합니다.',
                operationId: 'updateFixedExtensionEnabled',
                tags: ['Extension Policy'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'enabled'],
                                properties: {
                                    name: { type: 'string', example: 'exe', description: '확장자 이름 (영문 소문자)' },
                                    enabled: { type: 'boolean', example: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: '성공', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } },
                    '400': { description: '잘못된 요청 (이름 누락, 커스텀 확장자 토글 시도 등)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    '404': { description: '해당 확장자 없음', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
            post: {
                summary: '커스텀 확장자 추가',
                description: '커스텀 확장자를 한 건 추가합니다.',
                operationId: 'addCustomExtension',
                tags: ['Extension Policy'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', example: 'docx', description: '확장자 이름 (영문 소문자)' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: '추가 성공', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } },
                    '400': { description: '잘못된 요청 (중복, 최대 개수 초과, 이름 길이 초과 등)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    '404': { description: '정책이 없음 (init 필요)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/api/extension-policy/{ruleSetKey}/{name}': {
            delete: {
                summary: '커스텀 확장자 삭제',
                description: '커스텀 확장자를 삭제합니다. 고정 확장자는 삭제할 수 없습니다.',
                operationId: 'removeCustomExtension',
                tags: ['Extension Policy'],
                parameters: [
                    { name: 'ruleSetKey', in: 'path', required: true, schema: { type: 'string' }, example: 'default' },
                    { name: 'name', in: 'path', required: true, schema: { type: 'string' }, example: 'docx' },
                ],
                responses: {
                    '200': { description: '삭제 성공', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } },
                    '400': { description: '고정 확장자 삭제 시도 또는 잘못된 이름', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    '404': { description: '해당 확장자 없음', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/api/extension-policy/settings': {
            patch: {
                summary: '정책 설정 변경',
                description: '커스텀 확장자 최대 개수(maxCustomExtensions) 및 확장자 이름 최대 길이(maxExtensionNameLength)를 변경합니다.',
                operationId: 'updatePolicySettings',
                tags: ['Extension Policy'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    maxCustomExtensions: { type: 'integer', example: 300, description: '커스텀 확장자 최대 개수 (0 이상)' },
                                    maxExtensionNameLength: { type: 'integer', example: 50, description: '확장자 이름 최대 길이 (1 이상)' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: '변경 성공 (변경된 정책 반환)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/PolicyResponse' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: '잘못된 요청 (값 누락, 타입 오류, 범위 오류 등)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    '404': { description: '정책이 없음 (init 필요)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/api/extension-policy/init': {
            post: {
                summary: '정책 초기화',
                description: '기본 정책이 없으면 생성합니다(멱등). 이미 있으면 기존 데이터를 반환합니다.',
                operationId: 'ensurePolicy',
                tags: ['Extension Policy'],
                responses: {
                    '200': {
                        description: '초기화 성공 (기존 또는 신규)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        data: { $ref: '#/components/schemas/PolicyResponse' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            PolicyResponse: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    key: { type: 'string', example: 'default' },
                    name: { type: 'string', example: '기본 정책' },
                    maxCustomExtensions: { type: 'integer', example: 200 },
                    maxExtensionNameLength: { type: 'integer', example: 20 },
                    fixedExtensions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', example: 'exe' },
                                enabled: { type: 'boolean', example: false },
                            },
                        },
                    },
                    customExtensions: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['docx', 'xlsx'],
                    },
                },
            },
            OkResponse: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', example: true },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    error: { type: 'string', example: '에러 메시지' },
                },
            },
        },
    },
} as const
