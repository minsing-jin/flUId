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

## 2026-04-13 — M2+M3 (Ouroboros 정석 사이클)
- Seed: S030-S040 prd.json 등록 (ambiguity 0.1 영역).
- Run (스토리별 개별 게이트):
  - S030 PASS: ResponseCache (hash + TTL 10min + LRU 50), getResponseCache() API.
  - S031 PASS: Provider 추상화 — OpenAIProvider, AnthropicProvider, LocalProvider(Ollama).
  - S032 PASS: LLM-as-judge 5번째 안전 레이어, JudgeResult 반환.
  - S033 PASS: WorkbenchRuntime.loadSkillpack / unloadSkillpack + 자동 CSP rebuild.
  - S034 PASS: CLI `genui dev [--gpt-spark]` + `genui import-tokens`.
  - S035 PASS: WebSocketFeedMode — auto-reconnect, backpressure, DataSource.feedUrl.
  - S036 PASS: MultiAgentPlanner (IntentRouter → SkillSelector → UIGenerator).
  - S037 PASS: WidgetEventBus (topic allowlist per widget, scoped pub/sub).
  - S038 PASS: accessibilityCheck (ARIA/label/contrast 자동 진단).
  - S039 PASS: Figma Variables + Style Dictionary 토큰 import.
  - S040 PASS: zodToJsonSchema 변환기 (OpenAI structured output).
- Evolve: S030 AC4 "GPTPlanner 통합 미완" 발견 → planWithResponse에 cache get/set 통합 수정.
- Evaluate: 57/57 AC pass, 48/48 tests (core 21 + planner 27), quality 0.91 weighted.
- Ralph: 전원 통과.

## 2026-04-14 — M-Flex (Generic Declarative Renderer)
- Seed: `seeds/generic-renderer.yaml` ambiguity 0.08.
- S041 PASS: 22 프리미티브 (text, heading, code, card, grid, flex, stack, container, section, box, badge, progress, image, divider, spacer, alert, button, input, link, select, list, table). FORBIDDEN_KEYS 보안 검증.
- S042 PASS: DefaultReactRenderer에 Generic fallback 자동 라우팅.
- S043 PASS: GPT prompt에 프리미티브 가이드 + Mock 데모 (UserProfile, WeatherWidget).
- S044 Evaluate: 12/12 AC, 48/48 tests, quality 0.94. Ralph: 브라우저 3종 시나리오 검증.

## 2026-04-14 — M-UX (Loading · Shadows · DnD)
- Seed: `seeds/ux-overhaul.yaml` ambiguity 0.05.
- S045 PASS: 로딩 스켈레톤 (shimmer + 로딩 바), fade-in 트랜지션.
- S046 PASS: shadow-sm/md/lg, hover lift, 200ms cubic-bezier, radius 3단계.
- S047 PASS: 블록 드래그앤드롭 (HTML5 Drag API, drop target highlight).
- S048 PASS: 인터랙티브 피드백 (button hover/active, input focus ring).
- S049 Evaluate: 8/8 typecheck, 48/48 tests, 드래그 요소 확인.
- S050 PASS: 레이아웃 내부 컴포넌트 드래그 (DraggableChildren, 재귀 중첩, 32개 드래그 요소 확인).

## 2026-04-14 — M-JARVIS (Smart Mock + Stagger)
- Seed: `seeds/jarvis-smart-mock.yaml` ambiguity 0.07.
- S059 PASS: SmartMockPlanner.smartGenerate() — 9가지 intent 감지, 의도별 KPI/차트/테이블/상태 생성, theme.mood 자동 선택. "Your Request" fallback 제거.
- S060 PASS: blur→clear 블록 stagger 등장 (80ms 간격, nth-child CSS).
- Evolve: Block 타입 import 누락 수정.
- Ralph: 4개 프롬프트(매출/마케팅/할일/아무거나) 모두 풍부한 UI 생성 확인.

## 2026-04-16 — M-Data (DataConnector · Live Simulation)
- Seed: `seeds/data-integration.yaml` ambiguity 0.08.
- S051 PASS: DataConnector 레이어 — RestConnector, CsvConnector, MockConnector (5시나리오), Static, DefaultConnectorRegistry.
- S052 PASS: Live Mock 시뮬레이터 (sin + random 기반 시간 변화 데이터).
- S053 PASS: App.tsx connectorRef 통합 — intent 기반 자동 subscribe, KPI 3s / 차트 5s.
- S054 Evaluate: HTML t=5s vs t=9s 실제 변화 확인.
- S055 PASS: ConnectorPanel 사이드바 UI — REST URL 입력, localStorage 영속화, 활성 토글, 상태 dot.
- S056 PASS: select 프리미티브 + genui:action 커스텀 이벤트 dispatch.
- S057 PASS: DataSource.connector 필드 + 자동 subscribe + SmartMockPlanner가 connector 첨부.
- S058 Ralph: ConnectorPanel 렌더 확인, KPI 실데이터 반영, 8/8 typecheck, 48/48 tests.

## Gap Fill — 2026-04-16
- S041-S060 prd.json에 소급 등록 (이전 이터레이션에서 구현만 됐고 문서 미반영).
- `seeds/jarvis-smart-mock.yaml` 소급 생성.
- progress.md 이터레이션 로그 보강 (본 섹션).
- CHANGELOG.md 업데이트.
