# 요청 파이프라인·이벤트 루프 점검 요약

## 현재 아키텍처

```
Request
  → app/api/.../route.ts        (HTTP 진입, NextResponse 반환)
  → Controller                  (body 파싱·검증·에러→status 매핑)
  → Service                     (비즈니스 로직, Redis 캐시)
  → Repository                  (Prisma → Neon PostgreSQL)
```

- `middleware.ts` 없음.
- 인증/권한 체크 없음.
- 에러 처리: Controller의 catch 블록에서 에러 메시지 문자열 기반으로 HTTP status 결정.

---

## 1. 미들웨어 / 가드 / 파이프 / 인터셉터

### 1-1. 미들웨어 (Next.js `middleware.ts`)

| 기능 | 필요 시점 | 비고 |
|------|-----------|------|
| 인증 (세션/API 키) | API가 비공개가 되면 | `matcher: ['/api/extension-policy/:path*']` |
| Rate limit | 공개 API + 트래픽 우려 시 | Upstash `@upstash/ratelimit` 사용 가능 |
| 요청 로깅·x-request-id | 운영 모니터링 필요 시 | 미들웨어에서 헤더 부여 |
| CORS | 외부 도메인 호출 시 | `NextResponse` 헤더 설정 |

**주의:** Next.js 미들웨어는 Edge Runtime → Prisma 등 Node 전용 모듈 사용 불가. Redis(Upstash HTTP)는 사용 가능.

### 1-2. 가드 (Guard)

- **현재**: 인증·권한 요구 없음 → 가드 레이어 불필요.
- **도입 시**: 미들웨어에서 인증, Controller에서 권한(ruleSetKey 소유 여부 등) 검사.
- **구현 패턴**:

```ts
export const GET = withAuth(async (req, session) => { ... })
```

### 1-3. 파이프 (Pipe) — 입력 검증·정규화

**현재 상태:**
- Controller의 `normalizeExtensionName`이 파이프 역할 수행 중.
- body 파싱은 `req.json()` + 수동 타입 캐스팅.

**개선 포인트:**
- `zod` 스키마로 body 검증을 선언적으로 변경하면 유지보수 유리.
- `[ruleSetKey]` 동적 세그먼트에 대한 허용 패턴 검증 추가 고려.

### 1-4. 인터셉터 (Interceptor) — 응답·에러 포맷

**현재 문제점:**
- Controller catch 블록에서 **에러 메시지 문자열의 부분 일치**로 HTTP status를 결정하고 있음.
- Service의 에러 메시지가 변경되면 Controller의 status 매핑이 깨질 수 있음 (실제로 `updateFixedExtensionEnabled`의 에러 메시지 변경 후 Controller 매핑이 불일치했음).

**권장 개선:**
1. **커스텀 에러 클래스** 도입:

```ts
export class NotFoundError extends Error { ... }
export class ValidationError extends Error { ... }
```

2. **에러 → status 매핑 유틸**:

```ts
function toHttpStatus(e: unknown): number {
    if (e instanceof NotFoundError) return 404
    if (e instanceof ValidationError) return 400
    return 500
}
```

3. 이렇게 하면 에러 메시지 변경이 status 매핑에 영향을 주지 않음.

---

## 2. 이벤트 루프 관점

### 현재 상태 — 문제 없음

- **모든 I/O가 비동기**: `req.json()`, Prisma 쿼리, Redis(get/set/incr/del) 전부 `await` 기반.
- **동기 연산은 경량**: `normalizeExtensionName`(정규식·trim), `toPolicyResponse`(배열 filter/map) 등은 O(n)이나 n이 매우 작음 (확장자 수십 개 수준).
- **이벤트 루프 블로킹 구간 없음.**

### 잠재적 고려 사항

| 상황 | 영향 | 대응 |
|------|------|------|
| 매우 큰 요청 body | `req.json()` 파싱 비용·메모리 | Content-Length 제한 (미들웨어 or Route) |
| DB/Redis 지연 | 해당 요청만 느려짐, 다른 요청은 정상 | 타임아웃 설정, 커넥션 풀 관리 |
| 동시 요청 폭주 | Prisma 커넥션 풀 소진 가능 | 큐/동시성 제한, DB connection pool 조정 |
| 동기 CPU 작업 추가 시 | 이벤트 루프 블로킹 | `worker_threads` 또는 외부 서비스로 분리 |

**현재 구조에서는 이벤트 루프 관련 추가 작업 불필요.**

---

## 3. 우선순위 제안

| 항목 | 긴급도 | 도입 시점 |
|------|--------|-----------|
| 에러 클래스 도입 (메시지 기반 매핑 제거) | 높음 | 에러 종류 추가 전 |
| 미들웨어 (인증) | 중간 | API 접근 제어 필요 시 |
| 미들웨어 (Rate limit) | 중간 | 공개 배포 시 |
| 파이프 (zod 스키마) | 낮음 | body 구조가 복잡해질 때 |
| 이벤트 루프 대응 | 불필요 | 동기 CPU 부하 발생 시만 |
