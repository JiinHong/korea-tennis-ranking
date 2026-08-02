# Korea Campus Tennis Ranking

전국 대학 테니스 동아리의 대회 성적과 대학별 단식 랭킹을 제공하는 Next.js 프로젝트입니다.

## 주요 기능

- 전국 대학 테니스 동아리 남자부·여자부·종합 랭킹
- 동아리별 대회 성적과 랭킹 산정 방식 공개
- 서울과기대 느티나무, 고려대 체육교육과 PETC 단식 랭킹
- 경기 결과 입력, 선수 상세 기록, 전체 경기 기록
- 선수·경기·월간 정산을 관리하는 관리자 화면
- Supabase 데이터 저장과 기존 Google Sheets 데이터 이전
- Amplitude 사용자 행동 분석과 내부 트래픽 분리

## 화면 주소

| 주소 | 역할 |
| --- | --- |
| `/` | 전국 대학 테니스 동아리 랭킹 |
| `/clubs/[clubSlug]` | 동아리별 대회 성적 |
| `/[club]` | 대학별 단식 랭킹 (`seoultech`, `petc`) |
| `/[club]/players/[player]` | 선수 상세 기록 |
| `/[club]/matches` | 전체 경기 기록 |
| `/[club]/rules` | 단식 랭킹 운영 규칙 |
| `/admin` | 관리자 기능 진입점 |
| `/methodology` | 전국 랭킹 계산 방식 |

## 폴더 구조

```text
app/                         화면, 주소, API 진입점
  _components/               여러 최상위 화면이 함께 쓰는 UI
  [club]/                    대학별 단식 랭킹 화면
    _components/             단식 랭킹 전용 UI
    _lib/                    단식 랭킹 화면 전용 보조 코드
  admin/                     관리자 화면
  api/                       HTTP 요청과 응답을 처리하는 API
  clubs/[clubSlug]/          동아리별 대회 성적 화면
lib/                         화면과 API가 함께 쓰는 업무 규칙과 데이터 접근
scripts/                     데이터 이전·보정·SQL 생성 도구
data/                        버전 관리되는 전국 랭킹 원자료
tests/                       프로젝트 전체 규칙을 검증하는 테스트
docs/                        설계와 작업 계획 기록
public/                      로고, 왕관, 공유 이미지 등 정적 파일
```

세부 역할은 [lib/README.md](lib/README.md), [scripts/README.md](scripts/README.md), [data/README.md](data/README.md)에서 확인할 수 있습니다.

## 파일을 둘 위치

- 주소를 만드는 `page.tsx`, `layout.tsx`, `route.ts`는 `app`의 해당 주소 폴더에 둡니다.
- 한 화면 영역에서만 쓰는 UI는 그 영역의 `_components`에 둡니다.
- 여러 화면이나 API가 함께 쓰는 운영 규칙과 데이터 접근은 `lib`에 둡니다.
- 브라우저 요청을 받아 검증하고 응답하는 코드는 `app/api`에 둡니다.
- 데이터 수정용 일회성 도구는 제품 영역에 맞는 `scripts` 하위 폴더에 둡니다.
- 테스트는 가능한 한 대상 파일 옆에 두고, 구조처럼 프로젝트 전체를 검사하는 테스트만 `tests`에 둡니다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 검증 명령

```bash
npm test
npm run lint
npm run build
```

## 환경 변수

로컬 값은 Git에 포함되지 않는 `.env.local`에 저장합니다. 비밀키의 실제 값은 문서나 코드에 기록하지 않습니다.

| 이름 | 역할 |
| --- | --- |
| `SUPABASE_URL` | Supabase 프로젝트 주소 |
| `SUPABASE_PUBLISHABLE_KEY` | 공개 조회에 사용하는 Supabase 키 |
| `GOOGLE_SHEET_ID` | 서울과기대 기존 Google Sheets 문서 ID |
| `PETC_GOOGLE_SHEET_ID` | PETC 기존 Google Sheets 문서 ID |
| `RANKING_DATA_SOURCE` | 랭킹 데이터 원본 선택 |
| `INTERNAL_ANALYTICS_SECRET` | 내부 분석 사용자 등록용 비밀값 |
| `PUBLIC_MATCH_WRITE_SECRET` | 공개 경기 입력 보호 설정 |
| `NATIONAL_RANKING_SOURCE_ROOT` | 전국 랭킹 원본 파일을 추가 검증할 때만 사용하는 로컬 경로 |

## 배포

`main` 브랜치가 Vercel 프로젝트에 연결되어 있습니다. 검증을 통과한 변경을 GitHub에 푸시하면 프로덕션 배포가 시작됩니다.
