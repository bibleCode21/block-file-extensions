# 파일 확장자 차단 (block-file-extensions)
파일 확장자에 따라 특정 형식의 파일 첨부/전송을 제한하는 정책 관리 UI + API.

---

## 프로젝트 구조

```
block-file-extensions/
├── app/
│   ├── api/
│   │   └── extension-policy/
│   │       └── route.ts              # 확장자 정책 조회/저장 API (GET/POST)
│   ├── components/
│   │   └── extension-policy/
│   │       ├── ExtensionPolicy.tsx   # 메인 화면 컴포넌트
│   │       ├── FixedExtensionList.tsx
│   │       ├── CustomExtensionList.tsx
│   │       ├── SectionRow.tsx
│   │       ├── constants.ts          # 기본 고정 확장자, 최대 개수
│   │       ├── types.ts              # UI/API 타입
│   │       ├── validation.ts         # 입력 검증 로직
│   │       └── api.ts                # API 응답 변환 유틸
│   ├── layout.tsx                    # 루트 레이아웃, 폰트/메타데이터
│   └── page.tsx                      # 메인 페이지 (ExtensionPolicy 렌더)
├── lib/
│   └── prisma.ts                     # Prisma 클라이언트 싱글톤
├── prisma/
│   └── schema.prisma                 # DB 스키마 (PostgreSQL, Prisma)
└── .env                              # DATABASE_URL 등 환경 변수
```

- **app/**  
  Next.js App Router 엔트리. `page.tsx`가 진입점이고, 실제 화면은 `components/extension-policy` 밑의 `ExtensionPolicy`가 담당합니다.
- **app/components/extension-policy/**  
  확장자 정책 화면 전용 모듈. UI 조각(리스트, 레이아웃)과 검증/매핑 로직을 파일 단위로 분리했습니다.
- **app/api/extension-policy/**  
  확장자 정책을 조회/저장하는 API 라우트. 기본 정책(`default` 룰셋)에 대해 고정/커스텀 확장자 목록을 동기화합니다.
- **lib/**  
  앱 전역에서 쓰는 유틸. Prisma 클라이언트를 개발 환경에서 싱글톤으로 재사용합니다.
- **prisma/**  
  DB 스키마 정의. `ExtensionRuleSet`/`Extension` 두 모델로 정책과 확장자들을 정규화해서 관리합니다.

---

## 아키텍처 요약

| 구분 | 내용 |
|------|------|
| **프레임워크** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4 |
| **DB 접근** | Prisma 7, PostgreSQL (Neon) |
| **언어** | TypeScript |

- **프론트엔드 흐름**  
  - `ExtensionPolicy`가 마운트될 때 `GET /api/extension-policy`를 호출해 현재 정책을 불러옵니다.  
  - 고정 확장자 토글, 커스텀 확장자 추가/삭제는 로컬 상태로 먼저 반영하고, 추후 저장 API(POST)를 붙여 서버와 동기화합니다.

- **백엔드/API**  
  - `GET /api/extension-policy`: 기본 룰셋(`key = "default"`)의 고정/커스텀 확장자 목록을 JSON으로 반환.  
  - `POST /api/extension-policy`: 전달된 고정/커스텀 확장자 목록을 기준으로 DB의 기본 룰셋을 upsert + 동기화합니다.

- **데이터 모델(Prisma)**  
  - `ExtensionRuleSet` : 정책 메타데이터(id, key, name, isDefault, timestamps).  
  - `Extension` : 개별 확장자 정보(ruleSetId, extensionName, isFixed, enabled).  
  - 하나의 룰셋에 여러 확장자가 매핑되며, `(ruleSetId, extensionName)`은 유니크입니다.

---

## 실행 방법

```bash
# 의존성 설치
pnpm install

# 개발 서버 (http://localhost:3000)
pnpm dev

# Prisma 스키마를 DB에 반영 (최초 1회 또는 스키마 변경 시)
pnpm prisma db push

# 빌드 및 프로덕션 실행
pnpm build
pnpm start
```

`.env` 파일에 `DATABASE_URL`이 설정되어 있어야 Prisma가 Neon DB에 접속할 수 있습니다.  
Neon 등 SSL 연결 시 `sslmode=require` 대신 `sslmode=verify-full`을 쓰면 `pg`의 SSL 관련 경고를 피할 수 있습니다. (예: `...?sslmode=verify-full`)
