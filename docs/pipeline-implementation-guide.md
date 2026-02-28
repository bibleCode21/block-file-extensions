# 확장자 정책 API 파이프라인 구현 가이드

Next.js에서 할 수 있는 구조(미들웨어 → Route Handler → 서비스)를 단계별로 정리한 문서입니다.  
각 단계마다 **무엇을 구현할지**, **왜 필요한지**를 적었습니다.

---

## 전체 흐름 (목표)

```
요청 → 미들웨어(선택) → Route Handler(컨트롤러) → 서비스 → DB
                ↓                    ↓
            인증/로깅 등          파싱·검증·에러 처리
```

---

## 단계 1: 서비스 레이어 분리

### 무엇을 구현할지

- **파일**: `backend/services/extension-policy.service.ts` (인터페이스: `extension-policy.service.interface.ts`)
- **역할**:
  - 기본 정책 **조회**: `getDefaultPolicy()` → DB에서 default 룰셋 + extensions 읽어서 API 응답 형태로 반환
  - 기본 정책 **저장**: `saveDefaultPolicy(payload)` → 비즈니스 검증(중복·최대 개수·이름 길이) 후 `prisma.$transaction`으로 룰셋 upsert → extension deleteMany → 고정/커스텀 extension upsert → 저장 결과 반환
- **규칙**:
  - Request/Response, `NextResponse`를 모름. 입력은 일반 객체, 반환도 일반 객체.
  - Prisma는 이 레이어에서만 사용 (트랜잭션 포함).

### 왜 필요한지

- Route Handler가 HTTP만 담당하고, “저장/조회 로직”은 서비스에 두면:
  - 테스트 시 서비스만 단위 테스트하기 쉬움.
  - 다른 진입점(다른 API, CLI, 배치 등)에서도 같은 로직 재사용 가능.
  - 트랜잭션 경계가 한 곳에만 있어서 유지보수가 수월함.

---

## 단계 2: Route Handler를 컨트롤러로 정리

### 무엇을 구현할지

- **대상**: `app/api/extension-policy/route.ts`
- **역할**:
  - **GET**: 서비스 `getDefaultPolicy()` 호출 → `NextResponse.json({ data })` 또는 `{ data: null }` 반환. 예외 시 500 + JSON 에러 메시지.
  - **PATCH**: body 파싱 → 서비스 `updateFixedExtensionEnabled(name, enabled)` 호출 → 성공 시 `{ ok: true }`, 실패 시 400/404.
  - **POST**: body 파싱 → (필요 시 형식/타입 검증) → 서비스 `saveDefaultPolicy(payload)` 호출 → 반환값을 `NextResponse.json({ data })`로 응답. 서비스가 검증 에러를 던지면 400으로 변환.
- **규칙**:
  - 비즈니스 규칙(예: “고정 확장자와 중복 불가”)은 서비스에서만 검사. Route는 “body가 없음”, “JSON 파싱 실패” 수준만 처리해도 됨.
  - 에러는 try/catch로 잡아서 상태 코드와 `{ error: string }` 형태로 통일.

### 왜 필요한지

- Route를 “HTTP 입출력 + 서비스 호출”로만 두면:
  - API 스펙이 바뀌어도 서비스는 그대로 둔 채 Route만 수정 가능.
  - Next.js의 Route Handler가 실질적인 “컨트롤러” 역할을 명확히 하게 됨.

---

## 단계 3: 에러 처리 방식 통일 (필터 역할)

### 무엇을 구현할지

- **방법 1 (간단)**: Route Handler 내부에서 try/catch. 서비스가 던진 에러를 구분해 400/404/500으로 매핑하고 `NextResponse.json({ error }, { status })` 반환.
- **방법 2 (재사용)**: `lib/api-error.ts` 같은 곳에 `AppError` 클래스 또는 `createError(code, message)` + `handleRouteError(error)` 함수를 두고, Route에서 `catch (e) { return handleRouteError(e) }`로 일괄 처리.
- **규칙**:
  - 클라이언트에는 항상 `{ error?: string }` 같은 일관된 형태로 에러 전달.
  - 500일 때는 로그에만 상세 내용 남기고, 응답에는 일반 메시지만.

### 왜 필요한지

- 에러 형식과 상태 코드를 한 곳에서 관리하면:
  - 프론트에서 에러 메시지 표시가 일관됨.
  - 나중에 로깅·모니터링을 붙이기 쉬움.

---

## 단계 4: Init API도 서비스 사용으로 통일

### 무엇을 구현할지

- **대상**: `app/api/extension-policy/init/route.ts`
- **역할**:
  - POST 시 서비스의 `ensureDefaultPolicy()` 또는 `createDefaultPolicyIfNotExists()` 호출.
  - 이 함수는 “default 룰셋 없으면 생성, 있으면 그대로 반환”을 서비스 안에서 처리 (이미 있는 로직을 서비스로 이전).
  - Route는 서비스 반환값을 그대로 `NextResponse.json({ data })`로 응답.

### 왜 필요한지

- “기본 정책 생성”도 서비스에 두면:
  - GET/POST와 같은 정책 도메인 로직이 한 레이어에 모임.
  - Route는 “init 요청이 왔을 때 서비스 한 번 호출”만 하면 됨.

---

## 단계 5: 미들웨어 도입 (필요 시)

### 무엇을 구현할지

- **파일**: 프로젝트 루트 `middleware.ts`
- **역할** (현재 프로젝트 기준으로는 선택):
  - 예: `/api/*` 요청에 대해 인증 헤더/쿠키 확인 후, 없으면 401 또는 로그인 페이지로 리다이렉트.
  - 예: 요청 로깅 (method, path, status).
- **규칙**:
  - Edge Runtime에서만 동작하므로, Prisma 같은 무거운 라이브러리는 사용하지 않음.
  - 인증이 필요 없는 단계라면 이 단계는 “나중에 인증 붙일 때 추가”로 미뤄도 됨.

### 왜 필요한지

- 인증·로깅을 미들웨어에서 처리하면:
  - 모든 API 라우트에 공통으로 적용됨.
  - Route Handler는 “이미 인증된 요청”만 받는다고 가정하고 작성할 수 있음.

---

## 진행 순서 제안

| 순서 | 단계 | 의존성 |
|------|------|--------|
| 1 | 서비스 레이어 분리 | 없음 |
| 2 | Route Handler를 컨트롤러로 정리 | 1 |
| 3 | 에러 처리 방식 통일 | 2 |
| 4 | Init API 서비스 사용 | 1 |
| 5 | 미들웨어 (선택) | 없음, 필요할 때 |

1 → 2를 먼저 하면 Route가 서비스를 호출하는 형태로 정리되고, 3에서 에러만 통일하면 됩니다. 4는 1이 있으면 바로 적용 가능하고, 5는 인증/로깅이 필요해질 때 추가하면 됩니다.

---

## 체크리스트 (구현 후 확인)

- [ ] 정책 조회/저장/고정 확장자 토글 로직이 모두 서비스에 있음
- [ ] Route는 파싱 + 서비스 호출 + 응답/에러 반환만 함
- [ ] API 에러 응답이 `{ error: string }` 형태로 통일됨
- [ ] Init API가 서비스의 “기본 정책 보장” 함수를 사용함
- [ ] (선택) 미들웨어에서 인증 또는 로깅 적용

이 문서를 기준으로 단계 1부터 차근차근 구현하면 됩니다.
