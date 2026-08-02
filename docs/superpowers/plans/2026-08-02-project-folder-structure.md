# Project Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트의 화면, 공용 로직, 데이터 도구를 책임별 폴더로 재배치해 처음 보는 사람도 파일 위치를 예측할 수 있게 한다.

**Architecture:** Next.js App Router의 URL 폴더는 그대로 유지하고, 라우트 전용 코드는 비공개 `_components`와 `_lib` 폴더에 배치한다. 공용 규칙은 기존 `lib` 구조를 유지하며, 실행 스크립트는 대학별 단식 랭킹과 전국 동아리 랭킹으로 분리한다.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Vitest, ESLint

## Global Constraints

- 기존 URL, API 경로, 화면 동작, 데이터 내용은 변경하지 않는다.
- 프로덕션 파일을 이동하기 전에 목표 구조를 검사하는 테스트가 기대한 이유로 실패해야 한다.
- 테스트 파일은 대상 코드와 함께 이동한다.
- 검증 명령은 `npm test`, `npm run lint`, `npm run build`다.

---

### Task 1: 프로젝트 구조 계약

**Files:**
- Move: `lib/architecture/folderStructure.test.ts`
- Create: `tests/architecture/projectStructure.test.ts`

**Interfaces:**
- Consumes: Node.js `fs`, `path`
- Produces: 앱, 공용 모듈, 스크립트의 필수 위치를 검증하는 Vitest 계약

- [ ] 새 목표 위치가 존재하고 이전의 느슨한 위치가 비었는지 검사하도록 테스트를 작성한다.
- [ ] `npm test -- tests/architecture/projectStructure.test.ts`를 실행해 이동 전 경로 때문에 실패하는지 확인한다.

### Task 2: App Router 화면 코드 정리

**Files:**
- Move: `app/AmplitudeAnalytics*` → `app/_components/analytics/`
- Move: `app/National*` → `app/_components/national-ranking/`
- Move: `app/SiteFooter*` → `app/_components/site/`
- Move: `app/[club]/*.tsx` → `app/[club]/_components/`
- Move: `app/[club]/playerPaths.ts` → `app/[club]/_lib/`
- Move: 관리자, 동아리 성적, 내부 분석, 계산 방식 화면 컴포넌트 → 각 라우트 `_components/`
- Modify: 이동 파일을 참조하는 모든 import와 mock 경로

**Interfaces:**
- Consumes: 기존 컴포넌트 export와 Next.js 라우트 진입점
- Produces: 동일한 export와 사용자 동작을 새 경로에서 제공

- [ ] 컴포넌트와 테스트를 소유 라우트의 `_components`로 이동한다.
- [ ] 보조 로직을 `_lib`로 이동한다.
- [ ] 전체 import와 Vitest mock 경로를 새 절대경로로 갱신한다.
- [ ] 구조 테스트와 영향받은 화면 테스트를 실행해 통과시킨다.

### Task 3: 데이터 도구 정리

**Files:**
- Move: `scripts/build-supabase-seed-sql.ts` → `scripts/campus-ranking/`
- Move: `scripts/build-national-ranking-seed-sql.ts` → `scripts/national-ranking/`
- Move: `scripts/resolve-*.ts`, `scripts/consolidate-*.ts` → `scripts/national-ranking/corrections/`
- Create: `scripts/README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: 기존 스크립트 CLI와 npm script 이름
- Produces: 같은 npm 명령으로 새 파일 경로를 실행하는 도구

- [ ] 스크립트를 제품 영역과 목적별로 이동한다.
- [ ] 내부 import와 `package.json` 실행 경로를 갱신한다.
- [ ] `scripts/README.md`에 각 폴더와 실행 명령을 설명한다.
- [ ] 구조 테스트와 seed SQL 테스트를 실행한다.

### Task 4: 프로젝트 안내 문서와 정리

**Files:**
- Modify: `README.md`
- Create: `data/README.md`
- Delete: 로컬 `.DS_Store`

**Interfaces:**
- Consumes: 최종 프로젝트 구조와 npm 명령
- Produces: 새 개발자가 따라갈 수 있는 프로젝트 지도

- [ ] 기본 Next.js README를 프로젝트 목적, 구조, 실행 흐름, 검증 명령으로 교체한다.
- [ ] `data`의 원자료 소유권과 버전 규칙을 설명한다.
- [ ] Git에서 제외되는 로컬 메타데이터를 제거한다.

### Task 5: 전체 검증과 배포 저장소 반영

**Files:**
- Verify: 전체 변경 파일

**Interfaces:**
- Consumes: 정리된 전체 코드베이스
- Produces: 테스트, lint, production build가 검증된 커밋

- [ ] `npm test`를 실행해 모든 테스트가 통과하는지 확인한다.
- [ ] `npm run lint`를 실행해 오류가 없는지 확인한다.
- [ ] `npm run build`를 실행해 production build가 성공하는지 확인한다.
- [ ] diff와 git status를 확인한 뒤 커밋하고 `origin/main`에 push한다.
