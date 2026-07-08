<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Development Rules

- 기능 추가, 버그 수정, 리팩터링, 동작 변경은 반드시 TDD로 진행한다.
- 프로덕션 코드를 바꾸기 전에 실패하는 테스트를 먼저 작성하고, 그 테스트가 기대한 이유로 실패하는 것을 확인한다.
- 실패 테스트를 확인한 뒤 테스트를 통과시키는 최소 구현을 작성하고, 통과 상태에서만 리팩터링한다.
- 예외가 필요한 경우에는 작업 전에 사용자에게 명시적으로 확인을 받는다.
- 기본 검증 명령은 `npm test`, `npm run lint`, `npm run build`다.
- 작업이 완료되면 기본적으로 검증을 통과한 변경사항만 커밋하고 `origin/main`에 push한다. 사용자가 명시적으로 보류를 요청하거나, 검증 실패/충돌/시크릿 노출 위험이 있으면 push하지 않는다.
