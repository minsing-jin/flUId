# Ralph Loop Progress

## 2026-02-22
- 초기화: Ralph Loop 운영용 파일 스캐폴딩 생성.
- 다음: S001 실행 후 상태 업데이트.
- 정책 추가: Ralph Loop 요청 시 기본 동작을 연속 실행(continuous)으로 고정.
- Iteration S001 PASS: prd.md/prd.json을 전체 스펙 기준으로 재정의하고 루프 스토리 백로그를 구성.
- Iteration S002 PASS: pnpm workspace + turbo 모노레포 스캐폴드 생성.
- Iteration S002 Note: `pnpm -r typecheck`는 의존성 미설치 상태로 실패, `pnpm install`은 네트워크 제한(ENOTFOUND)으로 실패.
- Iteration S003 PASS: core DSL 타입/스키마/validator 추가 (unknown component/tool/permission/unsafe html 검증 포함).
- Iteration S004 PASS: WorkbenchRuntime + registries + skill loader + permission gate 실행 경로 구현.
- Iteration S005 PASS: binding parser/resolver와 plan patch apply/merge 구현, runtime action input 바인딩 해석 연결.
- Iteration S006 PASS: renderer-web에 Web Components 기반 renderer/host 및 P0 컴포넌트(WorkBench 입력/로그/권한/디버그 + DataTable/Chart/KPI/Summary/WebResults/Comparison/Code/Map/Kanban) baseline 구현.
- Iteration S007 PASS: core default component catalog에 전체 allowlist 타입의 schema+meta 등록, renderer 미구현시 placeholder 전략 문서화.
- Iteration S008 PASS: default tools 등록 함수 구현 (data.load_csv/profile/transform, viz.prepare_chart_data, marketing.build_utm, code.run_js, tool.generate_stub).
- Iteration S009 PASS: widget-iframe protocol typed 정의 및 iframe embed mount + global script bridge(window.GENUI.mount) + widget postMessage bridge 구현.
- Iteration S010 PASS: demo-host embed 부트스트랩 + permission UI 골격 + MockPlanner(28 deterministic prompts, 한국어 포함) 구현.
- Iteration S011 PASS: seed skillpacks 5종(data-research/marketing-ops/sales-ops/geo-maps/dev-tools) 추가 및 demo-host enable/disable + permission 기반 loadSkills 연동.
- Iteration S012 PASS: quickstart/add-tool/add-skill 문서 보강 (embed, 권한, 템플릿 포함).
- Iteration S013 FAIL: `pnpm test` 실행 시 `turbo: command not found` (node_modules 미설치, 네트워크 차단으로 install 불가). 스토리는 todo 유지.
- Iteration S013 PASS: core unit tests(DSL/patch/binding/permission gate) + widget Playwright e2e 시나리오 추가. `pnpm test`, `pnpm typecheck` 통과, e2e는 `pnpm --filter @genui/widget-iframe run test:e2e`로 검증.
- Iteration S014 PASS: renderer-react subset 구현(DefaultReactRenderer + plan->React tree + component map).
- Iteration S015 PASS: CLI scaffold 구현(`genui add-component`, `genui add-tool`, `genui add-skill`) 및 템플릿 파일 생성 검증.

## 2026-04-11 — M1 GPT Spark
- Interview session `interview_20260407_075148` 종료 (ambiguity 0.15), Seed `seeds/gpt-spark-m1.yaml` 생성.
- S016 PASS: UIPlan DSL에 `theme: { mood, density, accent, rationale }` 확장, zod strict, 7/7 unit tests green.
- S017 PASS: `SkillManifest.allowedDomains` 필드 + `buildConnectSrc` / `buildSandboxCsp` 헬퍼, 8/8 unit tests green. 5개 seed skillpack에 실제 도메인 기재.
- S018 PASS: `packages/planner-core` 신규 생성, `GPTPlanner` 클래스 (direct BYOK / proxy dual transport, streaming, model tiering), 타입 정의와 tsconfig 연결.
- S019 PASS: GPT 구조화 응답 zod 스키마 (`plannerResponseSchema`) + 한/영 프롬프트 빌더 + self-heal 재질의 메시지.
- S020 PASS: 3중 injection 방어 — input filter (9 패턴), output static check (URL allowlist + 위험 key), zod.
- S021 PASS: 계층적 에러 복구 — `retryWithBackoff` (지수 백오프) + self-heal 1회 + block-level isolation. recovery ledger.
- S022 PASS: `CostLedger` 모델 티어링 (prompt→full, interaction/feedPoll→patch) + 100k 일일 버짓 + 80% warning + 100% polling pause.
- S023 PASS: `WorkbenchRuntime.refinePlan()` 메서드 + Mode 2 patch/full 적응형 응답 처리 + runtime 이벤트 확장.
- S024 PASS: `FeedMode` 클래스 + `dataSource.pollIntervalMs` + 해시 기반 변경 감지 + shouldPause 훅.
- S025 PASS: `WorkbenchDevTools` React 패널 (7 tabs: Request/Response/Validation/History/Patches/Cost/Recovery), dev 모드 전용.
- S026 PASS: renderer-react에 shadcn 디자인 토큰 + `applyTheme()` + 5 mood × 3 density × 10 accent 프리셋 + CSS tokens.
- S027 PASS: demo-host를 Vite + React 18로 전환, BYOK 폼, 10개 use case 메뉴, GPTPlanner + MockPlanner 페일오버.
- S028 PASS: Planner 단위 테스트 5종 (guardrails, cost-ledger, prompt-builder, gpt-planner mocked fetch, recovery).
- S029 PASS: 문서 8종 (quickstart/architecture/security/cost/devtools/theme/roadmap + CHANGELOG).
- Evaluation PASS: `pnpm --filter '!@genui/demo-host' run typecheck` 7/7 패키지 통과. core `pnpm test` 21/21 green (theme 7 + csp 8 + 기존 6).
- Known: planner-core tests와 demo-host 런타임은 `pnpm install` 필요. 본 이터레이션은 네트워크 차단 환경에서 진행되어 install 없이 정적 검증까지만 수행.
