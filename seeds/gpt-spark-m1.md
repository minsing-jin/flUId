# GPT Spark M1 — Seed Specification

**Interview**: `interview_20260407_075148` · **Ambiguity**: 0.15 · **Created**: 2026-04-10

## Goal

기존 flUId Workbench Framework 위에 **프로덕션 수준의 생성형 UI 레이어**를 구축한다. MockPlanner를 실제 GPT Planner로 교체하되, 3중 가드레일(injection 필터 · system prompt 거부 · 출력 정적 검사 + zod)과 동적 CSP를 유지한다. 세 가지 트리거 모드(프롬프트 · 상호작용 patch · 피드 polling)를 모두 지원하고, skillpack을 지능적으로 선택·조합하며, shadcn/ui 기반으로 **시각적 디자인까지 GPT가 결정**하는 일급 시민으로 승격한다.

## North Star

> "말로 설명하면 UI가 만들어지고, 상호작용하면 UI가 진화하고, 데이터가 변하면 UI가 스스로 반응한다 — 가드레일은 단단하고, 시각적으로 아름답게."

## Constraints (18)

1. 기존 Core runtime API 보존 (DSL/validator/patches/bindings)
2. Planner는 실행 코드가 아니라 검증 가능한 UIPlan DSL만 생성
3. 모든 GPT 출력은 zod + allowlist + permission + unsafe-HTML 검사 통과
4. 미등록 위젯은 iframe sandbox에서만 렌더링
5. CSP `connect-src`는 `'self'` + skillpack 선언 도메인만 (와일드카드 금지)
6. Host↔Sandbox 브릿지: tools + scoped state + pub/sub만, auth token·routing 노출 X
7. Dual transport (BYOK direct / proxy) 필수
8. Streaming 기본 ON
9. Model tiering 필수 (full 생성은 비싼 모델, patch/polling은 저렴한 모델)
10. 세션 토큰 버짓 100k/일, 80% warning, 100% polling pause
11. Core·planner-core에서 `any` 금지
12. widget-iframe protocol 버전은 minor만 bump
13. M1은 새 백엔드 인프라 비의존 (선택적 Node proxy만)
14. renderer-react가 주력, renderer-web은 토큰만 유지·deprecate
15. 시각 품질은 Vercel json-render 이상
16. 허용되지 않은 tool / permission 호출 절대 금지
17. 기존 CI (typecheck/test/e2e) 통과 유지 — 추가만
18. 문서는 렌즈/용도별로 풀세트 제공

## Acceptance Criteria (20)

### 아키텍처
- [ ] `packages/planner-core` 존재, `GPTPlanner` 구현체 export
- [ ] `GPTPlanner` 가 `transport: 'direct' | 'proxy'` 지원
- [ ] 싱글 GPT 호출로 `{selectedSkills, uiPlan, theme}` 구조화 응답 (zod 스키마)
- [ ] UIPlan DSL에 `theme.mood` / `theme.density` / `theme.accent` 확장
- [ ] Streaming 동작 + demo-host 점진 렌더링 확인

### 3개 모드
- [ ] **모드 1**: 한국어/영어 프롬프트 → 전체 UIPlan → shadcn 렌더링
- [ ] **모드 2**: 블록 상호작용 → `{mode: 'patch'|'full', payload}` → `applyPatch()` 적용
- [ ] **모드 3**: dataSource polling → 변경 감지 → GPT patch → UI 업데이트
- [ ] 스킬팩 지능 조합 시연 (예: data-research + geo-maps)
- [ ] Theme mood 차이 시연 ("논문 대시보드" vs "주말 가계부")

### 가드레일 & 복구
- [ ] 계층적 에러 복구 (API x3 retry → MockFallback / zod self-heal x1 / block-level ErrorPlaceholder)
- [ ] 3중 injection 방어 (입력 필터 + system prompt + 출력 정적 검사 + zod)
- [ ] 동적 CSP 조립 (skillpack allowedDomains 기반)

### 비용 · 관찰 가능성
- [ ] 세션 토큰 버짓 enforce (80% warning / 100% polling pause / budget panel)
- [ ] DevTools 패널 (GPT 요청·응답·validation·UIPlan 히스토리·patch diff·cost timeline)

### 디자인 시스템
- [ ] renderer-react가 주력, 30+ shadcn 기반 컴포넌트
- [ ] renderer-web deprecated (토큰만 유지)

### 배포 · DX
- [ ] demo-host에 Vite dev server + BYOK 폼 + 3-mode 데모 프리셋
- [ ] 10개 use case 시연 가능 (아래 참조)
- [ ] `pnpm install && pnpm typecheck && pnpm test && pnpm --filter @genui/widget-iframe run test:e2e` 통과
- [ ] GPTPlanner 단위 테스트 + 3-mode e2e + visual regression screenshots
- [ ] 문서 8종 publish (quickstart/architecture/security/cost/devtools/theme/roadmap/CHANGELOG)
- [ ] prd.json에 `S016..S0NN` 스토리 블록 추가

## 10 Use Cases (M1 시연 대상)

| # | 시나리오 | 검증 포인트 |
|---|---------|-----------|
| A | "매출 대시보드" → 데이터 클릭 → 드릴다운 | 대화식 patch 진화 |
| B | "논문 대시보드" vs "주말 가계부" 비교 | theme.mood 시각 차이 |
| C | 주문 시뮬 → 급증 감지 → 자동 알림 배너 | 피드 polling |
| D | 음성 "근처 카페 찾아줘" → 지도+리스트 | 멀티모달 입력 |
| E | "이 데이터 이상해 보여" → 이상치 강조 추가 | 스마트 피드백 |
| F | 코드 에디터 + 실시간 차트 patch | 인터랙티브 분석 |
| G | "프레젠테이션 모드로" → 레이아웃 재구성 | density/mode 전환 |
| H | 한국어/영어 혼합 입력 | 다국어 UIPlan |
| I | 스킬팩 조합 (data + geo) → 지오 분석 | 지능적 스킬 선택 |
| J | "이 차트가 왜 이래?" → DevTools Why 패널 | 투명성 |

## Ontology (핵심 데이터 구조)

| Field | Type | Description |
|-------|------|-------------|
| `plannerRequest` | object | prompt · locale · context · currentPlan · dataSourceSnapshot · mode |
| `plannerResponse` | object | selectedSkills · uiPlan · theme · responseMode · patches |
| `uiPlan` | object | 기존 DSL + theme{mood,density,accent} + skillpackBinding |
| `skillpackManifest` | object | 기존 + allowedDomains (CSP 조립용) |
| `sandboxBridgeMessage` | object | scoped-state get/set + pub/sub event topics |
| `guardrailResult` | object | 3중 방어 + zod 결과 |
| `costLedger` | object | 토큰 · budget · polling 상태 |
| `devToolsSnapshot` | object | GPT 원문 · streaming · validation · patch diff · timeline |
| `errorRecoveryEvent` | object | layer · attempt · outcome · fallback |
| `transportConfig` | object | mode · key · proxyUrl · model tier map |
| `triggerMode` | string | `prompt \| interaction \| feedPoll` |
| `themeDecision` | object | mood · density · accent · rationale |

## Evaluation Principles (우선순위 가중치)

| # | Principle | Weight |
|---|-----------|--------|
| 1 | Guardrail integrity | **0.20** |
| 2 | Three-mode coverage | **0.18** |
| 3 | Visual quality (shadcn/mood) | **0.15** |
| 4 | Latency & streaming | 0.10 |
| 5 | Error resilience | 0.10 |
| 6 | Cost control | 0.08 |
| 7 | Observability | 0.08 |
| 8 | API backward compat | 0.06 |
| 9 | DX & docs | 0.05 |

## Exit Conditions

- 모든 AC 통과
- CI 그린 (typecheck · test · e2e)
- 3-mode 데모 각각 작동 확인
- 10개 use case 모두 menu에서 실행 가능
- 문서 8종 존재 및 README 링크
- prd.json에 새 스토리 반영

---

**References**: Vercel json-render · shadcn/ui · CopilotKit Generative UI patterns · MCP-UI · A2UI

## Next Steps

1. `seeds/gpt-spark-m1.yaml` 을 실행 엔진에 넘겨 Ralph Loop 재개
2. 또는 직접 `prd.json` 에 S016~S0NN 스토리로 풀어 쓰기
3. 최우선 구현 시작점: `packages/planner-core/src/gpt-planner.ts`
