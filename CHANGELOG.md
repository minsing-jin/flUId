# CHANGELOG

## [Unreleased] — M-Data (DataConnector + Live Simulation)

### Added
- `packages/core/src/connectors/` — 전체 DataConnector 레이어
  - `DataConnector` 인터페이스 + `ConnectorConfig` 타입
  - `RestConnector` — GET/POST, JSON/text, optional polling, jmespath transform
  - `CsvConnector` — 인라인 CSV 파싱
  - `MockConnector` — 5개 실시간 시뮬레이션 시나리오 (sales-kpi, traffic, server-status, marketing, timeseries). sin + random 기반 시간 변화 데이터
  - `DefaultConnectorRegistry` — type → connector 매핑, subscribe/unsubscribe 관리
  - Static connector — 인라인 JSON fallback
- `UIPlan.dataSources[].connector` — zod validated (type, source, refreshMs, method, headers, transform, targetBlockId)
- `apps/demo-host/src/connector-panel.tsx` — 사용자 REST URL 입력 UI, localStorage 영속화, 활성 토글
- Generic Renderer에 `select` 프리미티브 추가
- button/input/select onClick/onChange → `genui:action` CustomEvent dispatch
- SmartMockPlanner가 생성 plan에 자동 connector 첨부
- App.tsx에서 plan.dataSources[].connector 자동 subscribe + live KPI/chart update

## [Unreleased] — M-JARVIS (Smart Mock + Stagger)

### Added
- `MockPlanner.smartGenerate()` — 9가지 intent 감지로 아무 프롬프트든 의미 있는 UI 생성
- Intent별 차별화: sales/marketing/task/profile/chart/table/map/weather/dashboard
- Theme mood 자동 선택 (sales=serious, marketing=vivid, task=minimal 등)
- 블록 stagger 등장 애니메이션 — 80ms nth-child delay, blur(4)→clear 효과

### Removed
- "Your Request" 빈 fallback 카드 제거

## [Unreleased] — M-UX (Loading · Shadows · DnD)

### Added
- 로딩 스켈레톤 UI — shimmer 애니메이션 + 상단 로딩 바
- `renderer.showLoading()` API
- shadow-sm/md/lg 3단계 그림자 시스템
- 블록 호버 시 translateY + shadow-md 리프트 효과
- 블록 드래그앤드롭 재배치 — HTML5 Drag API
- Layout 내부 children 드래그앤드롭 (grid/flex/stack/card/container/section/box)
- DraggableChildren 래퍼 (재귀 중첩 지원)
- button hover brightness, input focus ring (accent glow)
- scrollbar 스타일링, antialiased font
- 200ms cubic-bezier 트랜지션

## [Unreleased] — M-Flex (Generic Declarative Renderer)

### Added
- `packages/renderer-react/src/generic/` — Generic Declarative Renderer
  - `DeclNode` 타입 + 21 프리미티브 (text, heading, code, card, grid, flex, stack, container, section, box, badge, progress, image, divider, spacer, alert, button, input, link, select, list, table)
  - FORBIDDEN_KEYS 검증 (innerHTML/eval/onclick 등 차단)
  - 재귀 children 렌더링, theme CSS vars 지원
- DefaultReactRenderer에 Generic fallback 자동 라우팅 — 미등록 type은 Generic Renderer가 처리
- GPT system prompt에 "Flexible Block Types" 섹션 — 프리미티브 가이드 + 자유 발명 허용
- MockPlanner 데모 템플릿: UserProfile, WeatherWidget (선언적 children 트리 예시)
- fuzzy keyword matching (2+ keyword 일치 시 템플릿 적중)

## [Unreleased] — M2+M3 (Hardening + Advanced)

### Added
- `ResponseCache` — hash(prompt+plan+snapshot) 키, TTL 10min, LRU 50, hit/miss stats
- 멀티 프로바이더 transport — `OpenAIProvider`, `AnthropicProvider`, `LocalProvider(Ollama)`
- `llmJudge` — 5번째 안전 레이어 (cheap model로 plan 안전성 평가)
- `WorkbenchRuntime.loadSkillpack / unloadSkillpack` — 동적 스킬팩 로드/언로드, CSP 자동 rebuild
- CLI `genui dev [--gpt-spark]` — Vite dev server 자동 기동
- CLI `genui import-tokens <file>` — Figma Variables / Style Dictionary → CSS variables
- `WebSocketFeedMode` — 실시간 피드, auto-reconnect (exponential backoff), backpressure (max queue)
- `DataSource.feedUrl` 필드 추가
- `MultiAgentPlanner` — IntentRouter → SkillSelector(deterministic) → UIGenerator 3-step chain
- `WidgetEventBus` — typed pub/sub, topic allowlist per widget
- `accessibilityCheck` — ARIA role/label/contrast 자동 진단
- `zodToJsonSchema` — OpenAI `response_format.json_schema` 파라미터 호환 변환기

### Fixed
- `ResponseCache`가 GPTPlanner pipeline에 실제 통합되지 않았던 버그 (S030 evolve)

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
