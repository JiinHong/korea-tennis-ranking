# 프로젝트 폴더 구조 정리 설계

## 목표

처음 프로젝트를 여는 사람이 URL, 화면, 운영 규칙, 데이터 저장소, 데이터 보정 도구의 위치를 빠르게 찾을 수 있도록 전체 폴더 구조를 정리한다. 기존 URL과 사용자 동작은 변경하지 않는다.

## 정리 원칙

1. `app`은 URL과 화면 소유권을 보여준다.
2. 화면 전용 컴포넌트는 해당 라우트의 `_components`에 둔다.
3. 화면 전용 보조 로직은 해당 라우트의 `_lib`에 둔다.
4. 여러 화면과 API에서 공유하는 규칙과 데이터 접근은 `lib`에 둔다.
5. 데이터 생성·보정 도구는 `scripts`에서 제품 영역과 목적별로 나눈다.
6. 테스트는 검증 대상 파일 옆에 두되, 프로젝트 전체 구조 테스트만 `tests/architecture`에 둔다.
7. 파일 이동 후에도 모든 기존 URL, API 경로, 테스트 대상 동작을 유지한다.

## 목표 구조

```text
app/
├── _components/
│   ├── analytics/
│   ├── national-ranking/
│   └── site/
├── [club]/
│   ├── _components/
│   ├── _lib/
│   ├── matches/
│   ├── players/
│   └── rules/
├── admin/
│   ├── matches/_components/
│   ├── monthly/_components/
│   └── players/_components/
├── api/
├── clubs/[clubSlug]/_components/
├── internal/analytics/_components/
└── methodology/_components/

lib/
├── admin/
├── analytics/
├── campusRanking/
├── googleSheets/
├── nationalRanking/
└── supabase/

scripts/
├── campus-ranking/
├── national-ranking/
│   └── corrections/
└── README.md

data/
├── national-ranking/
└── README.md

tests/
└── architecture/
```

## 책임 경계

### `app`

- `page.tsx`, `layout.tsx`, `route.ts`는 Next.js가 실행하는 진입점이다.
- `_components`는 해당 URL 영역의 화면 조각이다.
- `_lib`는 해당 URL 영역에서만 쓰는 경로 생성 등 보조 로직이다.
- `app/api`는 HTTP 요청 해석과 응답 생성만 담당하고 실제 규칙은 `lib`를 호출한다.

### `lib`

- 브라우저 화면, API, 관리자 화면이 함께 쓰는 도메인 규칙과 저장소 접근을 담당한다.
- 이미 책임별 하위 폴더가 있으므로 이번 작업에서는 구조를 유지한다.

### `scripts`

- `campus-ranking`은 대학별 단식 랭킹 초기 데이터 도구를 둔다.
- `national-ranking`은 전국 동아리 랭킹 데이터 생성 도구를 둔다.
- `national-ranking/corrections`는 원자료 검수 결과를 데이터셋에 반영하는 일회성 보정 도구를 둔다.

### `data`

- 애플리케이션에서 읽는 정적 원자료와 버전별 데이터셋만 둔다.
- 데이터 생성 코드는 `scripts`, DB 스키마 변경은 `supabase/migrations`가 소유한다.

## 호환성과 검증

- `@/` 절대 import를 사용해 이동 후 상대경로 혼란을 줄인다.
- 구조 테스트가 주요 파일의 새 위치와 루트에 남은 느슨한 컴포넌트·스크립트가 없는지 검사한다.
- 기존 테스트 전체, ESLint, Next.js production build를 모두 통과해야 한다.
- 환경변수, 데이터 내용, URL, Supabase 스키마는 변경하지 않는다.
