# scripts 폴더 안내

서비스 실행 중 호출되는 코드가 아니라 데이터 이전, SQL 생성, 원자료 보정에 사용하는 도구를 모아둡니다.

## 폴더별 역할

- `campus-ranking`: 대학별 단식 랭킹 데이터를 Google Sheets에서 읽어 Supabase 이전 SQL을 생성
- `national-ranking`: 검증된 전국 랭킹 원자료로 Supabase 시드 SQL을 생성
- `national-ranking/corrections`: 대진표 검수와 동아리 확인 결과를 원자료에 반영한 일회성 보정 기록

## 자주 쓰는 명령

전국 랭킹 SQL을 화면에 출력합니다.

```bash
npm run seed:national:sql
```

파일로 저장하려면 출력 경로를 지정합니다.

```bash
npm run seed:national:sql -- --out /tmp/national-ranking.sql
```

서울과기대 단식 랭킹 이전 SQL을 생성합니다.

```bash
npm run seed:sql -- seoultech --out /tmp/seoultech.sql
```

PETC는 동아리 식별자만 바꿉니다.

```bash
npm run seed:sql -- petc --out /tmp/petc.sql
```

## 주의사항

- `corrections` 파일은 이미 반영된 검수 결정을 기록하는 이력입니다. 목적과 입력 버전을 확인하지 않고 다시 실행하지 않습니다.
- 생성된 SQL과 개인 PC의 원본 경로는 Git에 추가하지 않습니다.
- 반복해서 서비스에서 사용할 기능은 스크립트에 두지 않고 `lib`로 옮긴 뒤 테스트를 추가합니다.
