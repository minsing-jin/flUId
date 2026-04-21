# Generative UI Workbench Framework PRD

## North Star
정적 UX를 깨는 생성형 워크벤치 프레임워크를 구축한다. 사용자의 텍스트/음성 입력을 안전한 UI Plan DSL로 변환하고, 런타임이 동적으로 렌더링한다.

## Non-Negotiables
- Core runtime은 프레임워크 비종속이어야 한다.
- 모델 출력은 실행 코드가 아니라 검증 가능한 UI Plan DSL이어야 한다.
- 렌더링은 플러그형 Renderer Adapter로 분리한다.
- 모든 기능은 allowlist + schema validation + permission gate를 통과해야 한다.

## Scope
- P0: 모노레포, core runtime, renderer-web, widget-iframe, demo-host, seed skillpacks, 핵심 docs
- P1: renderer-react, 컴포넌트/툴 확장, DX 개선
- P2: 고급 자동화/geo/viz

## Architecture
Input(text/voice) -> Planner(mock) -> UIPlan DSL -> Validator -> Runtime -> Renderer Adapter -> Interaction -> Tool Call -> Patch -> UI Update

## Quality
- Core에서 `any` 금지
- DSL/patch/binding/permission unit tests 필수
- widget embed e2e 최소 시나리오 필수

## Definition of Done (M0)
- `pnpm install && pnpm dev`로 demo-host에서 widget mount
- deterministic MockPlanner 프롬프트 매핑(한국어 포함)
- strict validation + allowlist + permission gating 동작
- tool call -> patch -> UI 갱신 + ActivityLog 이벤트
- 컴포넌트/툴/스킬 추가 절차 문서화

## GPT Spark M1 (Next Milestone)
Seed: `seeds/gpt-spark-m1.yaml` · Interview: `interview_20260407_075148` · Ambiguity: 0.15

### North Star
실제 LLM(GPT)이 UIPlan DSL을 직접 생성하고, 시각 디자인까지 결정하며, 3가지 트리거 모드(프롬프트·상호작용·피드)가 가드레일 아래에서 모두 동작하는 생성형 워크벤치.

### Key Decisions (23)
1. GPT structured output → UIPlan DSL 직접 생성 + zod 후검증
2. 싱글 GPT 호출로 `{selectedSkills, uiPlan, theme}` 동시 출력
3. 동적 allowlist 확장 + iframe sandbox generic fallback
4. Host↔Sandbox 브릿지: tools + scoped state + pub/sub
5. `packages/planner-core` 신설, BYOK direct + proxy dual transport
6. 3개 트리거 모드 M1 병렬 구현
7. 3중 injection 방어 + 동적 CSP
8. shadcn/ui 전면 이식 (renderer-react 주력 승격)
9. UIPlan DSL에 `theme.mood/density/accent` 확장
10. 계층적 에러 복구 + 모델 티어링 + 토큰 버짓 cap
11. 내장 DevTools 패널 + streaming 기본 ON
12. Vite dev server + BYOK 폼

### M1 Stories
- S016: UIPlan DSL 확장 (theme)
- S017: SkillManifest 확장 (allowedDomains)
- S018: packages/planner-core + GPTPlanner skeleton
- S019: GPT structured output 스키마 + 프롬프트 빌더
- S020: 3중 injection 방어
- S021: 계층적 에러 복구
- S022: 비용 제어 (티어링 + 토큰 버짓)
- S023: Mode 2 — 적응형 patch/full 응답
- S024: Mode 3 — dataSource polling + 변경 감지
- S025: DevTools 패널
- S026: renderer-react shadcn 토큰 레이어
- S027: demo-host Vite + BYOK + 모드 프리셋
- S028: 테스트 (unit + 3-mode e2e + visual regression)
- S029: 문서 풀세트 (quickstart/architecture/security/cost/devtools/theme/roadmap/CHANGELOG)

## M2 Hardening (S030-S034) — Done
- S030 Response Cache (hash + TTL 10min + LRU 50, GPTPlanner 통합)
- S031 Multi-provider transport (OpenAI / Anthropic Claude / Local Ollama)
- S032 LLM-as-judge 5번째 안전 레이어
- S033 Dynamic Skillpack load/unload + CSP 자동 rebuild
- S034 CLI `genui dev [--gpt-spark]` + `genui import-tokens`

## M3 Advanced (S035-S040) — Done
- S035 WebSocketFeedMode (폴링 대체, auto-reconnect)
- S036 Multi-Agent Planner (IntentRouter → SkillSelector → UIGenerator)
- S037 WidgetEventBus (typed pub/sub, scoped permissions)
- S038 ARIA accessibility auto-check
- S039 Design Token import (Figma Variables + Style Dictionary)
- S040 Structured Output (zodToJsonSchema for OpenAI json_schema)

## M-Flex Generic Declarative Renderer (S041-S044) — Done
- 22 프리미티브 엔진 + 자동 fallback 라우팅
- GPT가 미등록 컴포넌트 타입도 자유롭게 발명 가능
- MockPlanner에 UserProfile / WeatherWidget 데모

## M-UX Loading · Shadows · DnD (S045-S050) — Done
- 로딩 스켈레톤 + fade-in + shimmer 애니메이션
- 그림자/호버/트랜지션 shadcn 수준 시각 퀄리티
- 블록 드래그앤드롭 (블록 레벨 + 레이아웃 내부 컴포넌트 레벨)
- 버튼/입력 인터랙티브 피드백

## M-JARVIS Smart Mock (S059-S060) — Done
- 9가지 intent 감지로 아무 프롬프트든 의미 있는 UI 생성
- 블록 순차 등장 (80ms stagger, blur→clear)

## M-Data Integration (S051-S058) — Done
- DataConnector 레이어: REST · CSV · Mock · Static · WebSocket 어댑터
- Live Mock 5 시나리오 (sales-kpi / traffic / server-status / marketing / timeseries)
- ConnectorPanel 사이드바 UI (REST URL 입력 → 라이브 연결)
- select 프리미티브 + genui:action 이벤트 dispatch
- UIPlan.dataSources에 connector config 필드 + 자동 subscribe

## M-GapFill (GAP-1~GAP-7) — Done
- llmJudge를 GPTPlanner config.enableJudge로 실제 통합
- zodToJsonSchema를 OpenAI json_schema responseFormat으로 연결 (config.useStructuredOutput)
- accessibilityCheck를 DevTools 8번째 탭으로 추가 + plan 변경 시 자동 실행
- 신규 테스트 5종: providers, llm-judge, multi-agent, schema-converter, connectors
- prd.md + CHANGELOG + progress.md 동기화, 21→22 primitive count 수정
