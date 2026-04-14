# CHANGELOG

## [Unreleased] — M1 GPT Spark

### Added
- `packages/planner-core` 신규 패키지
  - `GPTPlanner` — Planner 인터페이스 구현 (BYOK/proxy dual transport, streaming, model tiering)
  - `CostLedger` — 세션 토큰/비용 추적, 80% warning, 100% polling pause
  - `inputFilter` + `outputStaticCheck` — 3중 prompt-injection 방어 레이어
  - `retryWithBackoff` + recovery ledger — 계층적 에러 복구
  - `buildSystemPrompt` + `buildUserPrompt` + Korean/English locale inference
  - `plannerResponseSchema` — GPT 구조화 응답 zod 검증
- `@genui/core`
  - UIPlan DSL에 `theme: { mood, density, accent, rationale }` 확장
  - `SkillManifest.allowedDomains` 필드 + `buildConnectSrc` / `buildSandboxCsp` CSP 헬퍼
  - `DataSource.pollIntervalMs` 필드
  - `WorkbenchRuntime.refinePlan()` — Mode 2 patch/full 응답 처리
  - `WorkbenchRuntime.devMode` 옵션 + `logEvent` public 메서드
  - `FeedMode` — Mode 3 dataSource polling + 변경 감지
  - Runtime event type 확장 (`refine_*`, `feed_*`, `guardrail_blocked`)
- `@genui/renderer-react`
  - `theme/presets.ts` — 5개 mood, 3개 density, 10개 accent 프리셋
  - `theme/tokens.css` — CSS variable 기본값
  - `applyTheme()` — Theme → CSS variable 적용
  - `WorkbenchDevTools` — 7탭 DevTools 패널 (Request/Response/Validation/History/Patches/Cost/Recovery)
- `apps/demo-host`
  - Vite dev server 추가
  - BYOK 입력 폼 (localStorage 저장)
  - 10개 use case 메뉴 버튼
  - GPTPlanner + MockPlanner 페일오버
- 문서 8종 — quickstart/architecture/security/cost/devtools/theme/roadmap + CHANGELOG
- 테스트 — theme, CSP, guardrails, cost-ledger, prompt-builder, gpt-planner (mocked fetch), recovery

### Changed
- `prd.md` / `prd.json` 에 S016 — S029 GPT Spark 스토리 추가
- `tsconfig.base.json` 에 `@genui/planner-core` path 등록
- `packages/core/src/examples/skillpacks.ts` — 5개 skillpack에 `allowedDomains` 선언

### Security
- Input filter로 injection 패턴 자동 차단
- Output static check로 URL allowlist + 위험 key 탐지
- 동적 CSP 조립 (활성 skillpack 기반)
- Wildcard CSP 엔트리 거부

### Deprecations
- `renderer-web` (Web Components)는 theme 토큰만 유지, 기본 렌더러는 `renderer-react`

---

## [0.1.0] — M0 Foundation
- 모노레포 스캐폴드, core DSL, runtime, renderer-web baseline, widget-iframe, demo-host, seed skillpacks, CLI scaffold. (S001~S015)
