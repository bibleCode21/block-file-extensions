# Next.js 정석 대비 리팩토링 검토

현재까지 리팩토링한 구조를 Next.js 공식 문서 및 관례와 비교한 결과입니다.

---

## ✅ 문제 없는 부분

- **App Router 구조**: `app/`, `app/api/`, `app/page.tsx`, `app/layout.tsx` 사용 적절.
- **Route Handler**: `route.ts`에서 `GET`/`PATCH`/`POST` export, `Request`/`NextResponse` 사용 올바름.
- **API 경로**: `app/api/extension-policy/route.ts`, `app/api/extension-policy/init/route.ts` 세그먼트 구조 적절.
- **클라이언트 경계**: `ExtensionPolicy.tsx`에 `'use client'` 있고, 서버 전용 코드(prisma/서비스)는 import하지 않음. 상수만 `@/backend/controllers`에서 사용 → 번들/실행 문제 없음.
- **프로젝트 파일 위치**: “Store project files outside of app” 전략과 일치. `backend/`, `lib/` 등 루트 공유 폴더 사용은 문서상 허용.
- **tsconfig paths**: `"@/*": ["./*"]` 일반적 설정.
- **Prisma**: `lib/prisma.ts`에서 싱글톤 + `globalThis` 패턴으로 개발 시 다중 인스턴스 방지 → 권장 패턴과 일치.

---

## ✅ 적용 완료한 개선 사항

다음 항목은 모두 반영된 상태입니다.

| 항목 | 적용 내용 |
|------|-----------|
| **1. API Route 캐시 명시** | `app/api/extension-policy/route.ts`, `app/api/extension-policy/init/route.ts`에 `export const dynamic = 'force-dynamic'` 추가 |
| **2. 서버 전용 모듈 보호** | `server-only` 패키지 설치, `backend/services/extension-policy-service.ts` 최상단에 `import 'server-only'` 추가 |
| **3. 루트 레이아웃 `lang`** | `app/layout.tsx`에서 `<html lang="ko">` 사용 |
| **4. 에러 바운더리** | `app/error.tsx` 추가 — 에러 메시지 + "다시 시도" 버튼으로 `reset()` 호출 |
| **5. 로딩 UI** | `app/loading.tsx` 추가 — 루트 세그먼트 로딩 시 스켈레톤 표시 |

---

## 요약

- **정석을 벗어난 구조나 사용 방식은 없습니다.** App Router, Route Handler, 클라이언트/서버 분리, 프로젝트 구조 모두 Next.js 문서와 맞습니다.
- 위 개선안(캐시 명시, server-only, lang, error/loading)은 모두 적용 완료되었습니다.