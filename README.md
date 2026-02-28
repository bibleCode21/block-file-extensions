# 파일 확장자 차단 (block-file-extensions)

파일 확장자에 따라 특정 형식의 파일 첨부/전송을 제한하는 정책 설정 UI 프로젝트입니다.

---

## 프로젝트 구조

```
block-file-extensions/
├── app/
│   ├── components/
│   │   └── ExtensionPolicy.tsx   # 확장자 정책 설정 화면 (클라이언트 컴포넌트)
│   └── page.tsx                  # 메인 페이지 (ExtensionPolicy 렌더)
├── lib/
│   └── prisma.ts                 # Prisma 클라이언트 싱글톤
├── prisma/
│   └── schema.prisma             # DB 스키마 (PostgreSQL)
```

- **app/**  
  Next.js App Router 기준. `page.tsx`가 진입점이고, 실제 UI는 `ExtensionPolicy` 한 컴포넌트에 모여 있음.
- **app/components/**  
  페이지 전용 UI 컴포넌트. 현재는 `ExtensionPolicy`만 있으며, 내부에 `SectionRow`, `FixedExtensionList`, `CustomExtensionList` 등 로컬 컴포넌트로 분리되어 있음.
- **lib/**  
  앱 전역에서 쓰는 유틸/클라이언트. Prisma 인스턴스를 개발 시 리로드 시 재생성되지 않도록 싱글톤으로 제공.
- **prisma/**  
  DB 스키마 및 마이그레이션. 데이터소스는 PostgreSQL.

---

## 아키텍처 요약

| 구분 | 내용 |
|------|------|
| **프레임워크** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4 |
| **DB 접근** | Prisma 7, PostgreSQL |
| **언어** | TypeScript |
