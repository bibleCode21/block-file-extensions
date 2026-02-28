# Block File Extensions

파일 확장자 차단 정책을 관리하는 UI + API. 고정 확장자 토글, 커스텀 확장자 추가/삭제, 정책 설정(maxCustomExtensions, maxExtensionNameLength) 지원.

---

## 기술 스택

| 구분 | 스택 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| DB | PostgreSQL (Neon) |
| ORM | Prisma 7 |
| 캐시 | Upstash Redis |
| 언어 | TypeScript |

---

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   ├── extension-policy/          # 정책 API (GET/PATCH/POST, init, settings, [ruleSetKey]/[name])
│   │   └── swagger/                   # OpenAPI 스펙·UI (/swagger 페이지)
│   ├── components/extension-policy/   # 정책 화면 컴포넌트·검증·타입
│   ├── layout.tsx, page.tsx
│   └── swagger/page.tsx               # Swagger UI 페이지
├── backend/
│   ├── constants/                     # DEFAULT_RULESET_KEY, 고정 확장자 목록
│   ├── controllers/extension-policy.controller.ts
│   ├── dto/                           # 요청·응답 타입 (PolicyResponse, PolicySettings 등)
│   ├── errors/                        # AppError, NotFoundError, ValidationError, ConflictError
│   ├── interceptors/with-api-handler.ts  # Route 래퍼 (에러·응답 변환, X-Response-Time)
│   ├── repositories/extension-policy.repository.ts
│   ├── services/extension-policy.service.ts
│   ├── utils/request.ts               # parseJsonBody, handleError, ControllerResponse
│   └── container.ts                   # Service 싱글톤
├── lib/
│   ├── prisma.ts                      # Prisma 클라이언트 (globalThis 캐시)
│   └── redis.ts                       # Upstash Redis 클라이언트
├── prisma/schema.prisma               # ExtensionRuleSet, Extension
├── __tests__/                         # Jest (controller, service 유닛 테스트)
└── jest.config.ts, tsconfig.jest.json
```

---

## API 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/extension-policy` | 기본 정책 조회 (고정·커스텀 확장자, 설정값) |
| PATCH | `/api/extension-policy` | 고정 확장자 토글 `{ name, enabled }` |
| POST | `/api/extension-policy` | 커스텀 확장자 추가 `{ name }` |
| POST | `/api/extension-policy/init` | 기본 정책 없으면 생성 |
| PATCH | `/api/extension-policy/settings` | 정책 설정 변경 `{ maxCustomExtensions?, maxExtensionNameLength? }` |
| DELETE | `/api/extension-policy/[ruleSetKey]/[name]` | 커스텀 확장자 삭제 |

- 응답: 성공 시 `{ data }` 또는 `{ ok: true }`, 실패 시 `{ error: string }`. 인터셉터에서 `X-Response-Time` 헤더 추가.
- 상세 스펙: `/swagger` 페이지 또는 `GET /api/swagger` JSON.

---

## 환경 변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Neon 권장, Pooler URL 사용 시 연결 풀링) |
| `KV_REST_API_URL` | Upstash Redis REST API URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST API 토큰 |

---

- 패키지 매니저: **pnpm** (`packageManager: pnpm@10.30.3`)
