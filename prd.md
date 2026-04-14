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
