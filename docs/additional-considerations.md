# 작업 완료 후 추가로 고려할 사항

지금까지 구현된 것: 정책 CRUD, Redis 캐시, 설정 API(maxCustomExtensions / maxExtensionNameLength), 에러 클래스, 인터셉터, Jest 테스트, Swagger, 프론트 검증·DB 기반 제한.

아래는 **추가로 검토하면 좋은 항목**입니다.

---

## 1. 보안

| 항목 | 현재 | 고려 시점 |
|------|------|-----------|
| **인증** | 없음. API가 누구나 호출 가능 | 운영/내부 전용이 되면 미들웨어 또는 Route 래퍼로 세션/API 키 검사 |
| **Rate limit** | 없음 | 공개 배포 시 악용·DDoS 완화를 위해 Upstash 등으로 IP/키별 제한 |
| **CORS** | Next.js 기본값 | 다른 도메인에서 이 API를 호출할 계획이면 `Access-Control-Allow-Origin` 등 명시 |
| **Request body 크기** | 제한 없음 | 매우 큰 JSON으로 메모리/파싱 부담 우려 시 Content-Length 또는 body 크기 제한 |
| **ruleSetKey 검증** | DELETE 등에서 path의 ruleSetKey를 그대로 사용 | 허용 목록/패턴이 있으면 Controller에서 검증 후 400 |

---

## 2. 운영·모니터링

| 항목 | 설명 |
|------|------|
| **헬스 체크** | `/api/health` 등에서 DB/Redis 연결 확인. 배포·로드밸런서에서 사용 |
| **구조화 로깅** | 현재 `console.error` 수준. 요청 ID, status, 경로, 소요 시간을 JSON 등으로 로깅하면 분석에 유리 |
| **에러 알림** | 500 발생 시 Sentry 등으로 알림 연동 검토 |
| **메트릭** | 요청 수, 지연 시간, 에러율 등 (선택) |

---

## 3. 데이터·스키마

| 항목 | 설명 |
|------|------|
| **마이그레이션 전략** | `db push` 사용 중이면, 나중에 배포 파이프라인에서는 `prisma migrate deploy`로 버전 관리 권장 |
| **기존 데이터** | `maxExtensionNameLength` 컬럼 추가 시 기본값 20으로 기존 row 채움. 이미 20자 초과 확장자명이 있었다면 스키마 변경 시 주의 |
| **백업** | Neon/DB 백업 정책 확인 |

---

## 4. 프론트엔드·UX

| 항목 | 설명 |
|------|------|
| **설정 변경 UI** | `PATCH /api/extension-policy/settings`는 Swagger/API로만 호출 가능. 관리자가 maxCustomExtensions/maxExtensionNameLength를 바꾸는 UI가 필요하면 설정 페이지 추가 |
| **낙관적 업데이트 실패** | PATCH/POST/DELETE 실패 시 현재는 state 롤백만 함. 재시도 버튼이나 토스트 메시지로 보완 가능 |
| **동시 편집** | 같은 정책을 여러 탭에서 수정 시 마지막 쓰기만 남음. 충돌 감지가 필요하면 버전/ETag 등 고려 |
| **로딩/비활성화** | 버튼 연타 방지용 disabled 상태, 제출 중 로딩 표시 등 |

---

## 5. 테스트·품질

| 항목 | 설명 |
|------|------|
| **E2E** | Playwright 등으로 실제 브라우저에서 정책 조회·추가·삭제 시나리오 검증 |
| **API 통합 테스트** | 실제 DB/Redis(또는 테스트 인스턴스)를 쓰는 통합 테스트. 현재는 유닛(목) 위주 |
| **Swagger와 실제 응답 일치** | 주기적으로 스키마/예시와 실제 API 응답이 맞는지 확인 |

---

## 6. 문서·유지보수

| 항목 | 설명 |
|------|------|
| **README** | 프로젝트 구조·API 개요·환경 변수·실행 방법이 최신 상태인지 점검 (예: settings API, Swagger 경로) |
| **API 버전** | 나중에 하위 호환 깨는 변경이 생기면 `/api/v2/...` 식 버전 경로 검토 |
| **CHANGELOG** | 주요 변경(설정 API, 에러 클래스, 인터셉터 등)을 간단히 기록해 두면 유리 |

---

## 7. 기타

| 항목 | 설명 |
|------|------|
| **ruleSetKey 다중 사용** | 현재 프론트는 `default`만 사용. 다른 ruleSetKey를 쓰는 화면/API가 생기면 목록·선택 UI 필요 |
| **고정 확장자 목록 변경** | 현재는 상수(`DEFAULT_FIXED_EXTENSION_NAMES`)로만 초기 생성. 정책별로 고정 목록을 DB에서 관리하려면 스키마·로직 확장 필요 |
| **감사 로그** | 누가 언제 정책/설정을 바꿨는지 남기려면 audit 테이블 또는 로그 스트림 도입 검토 |

---

우선순위는 **운영 환경(인증 필요 여부, 공개 여부)** 과 **설정을 UI에서 바꿀지**에 따라 정하면 됩니다. 필요해지는 시점에 위 항목 중에서 골라 적용하면 됩니다.

---

## 8. 백엔드 API 응답 속도 (적용 완료)

| 조치 | 내용 |
|------|------|
| **getPolicy Redis** | 버전 키 제거, 정책당 단일 캐시 키 사용. **캐시 히트 시 Redis 2회 → 1회**로 감소. |
| **무효화** | `invalidatePolicyCache`를 Redis 3회(version get, del, incr) → **1회(del)** 로 축소. |
| **addCustomExtension** | `countCustomExtensions` DB 호출 제거. 이미 조회한 `ruleSet.extensions`로 커스텀 개수 계산. **DB 1회 감소.** |

추가로 Vercel 등 서버리스에서는 **DB 연결**이 병목일 수 있음. Neon 사용 시 `DATABASE_URL`을 **Pooler URL**(`*-pooler.*.neon.tech`)로 두면 연결 풀링으로 cold start·연결 수를 줄일 수 있음.

---

## 9. 배포(Vercel) 속도

| 조치 | 설명 |
|------|------|
| **`vercel.json`** | `installCommand: "pnpm install --frozen-lockfile"` 로 lockfile 기준 설치만 수행 → 해석 단계 생략으로 설치 시간 단축. |
| **`packageManager`** | `package.json`에 `"packageManager": "pnpm@9.15.0"` 명시 → Vercel/Corepack이 동일 pnpm 버전 사용, 캐시 효율 향상. |
| **캐시** | Vercel은 lockfile이 바뀌지 않으면 `node_modules`를 캐시함. 두 번째 배포부터는 설치가 훨씬 빨라짐. |
| **빌드 캐시** | Project Settings → General → Build Cache 활성화 권장. |
| **고성능 빌드** | 네트워크/CPU가 병목이면 Vercel 유료 플랜에서 더 큰 빌드 머신 선택 가능. |
| **불필요 의존성** | 사용하지 않는 패키지 제거 시 설치 용량·시간 감소. |
