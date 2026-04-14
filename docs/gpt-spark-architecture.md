# GPT Spark Architecture

## 파이프라인

```
User Input (text/voice)
        │
        ▼
┌───────────────────┐
│ Input Filter       │  guardrails/input-filter.ts
│ (injection patterns)│
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Prompt Builder     │  prompt-builder.ts
│ (system + user)    │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ GPT API            │  transport.ts (direct | proxy)
│ streaming JSON     │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ zod schema check   │  response-schema.ts
│ + self-heal retry  │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Output Static Check│  guardrails/static-check.ts
│ (CSP, keys)        │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ WorkbenchRuntime   │  core/runtime
│ loadPlan / applyPatch│
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ renderer-react     │  shadcn tokens + theme
└───────────────────┘
```

## 3개 트리거 모드

### Mode 1 — Prompt
사용자가 자연어로 요청. `GPTPlanner.plan(prompt)` 한 번 호출 → 전체 UIPlan.

### Mode 2 — Interactive Patch Evolution
사용자가 생성된 UI와 상호작용. Runtime이 `refinePlan(feedback, planner)` 호출. GPT가 `{mode:'patch'|'full', payload}` 로 응답. 작은 변경은 JSON Pointer patch, 큰 재설계는 전체 plan.

### Mode 3 — Data Feed Polling
`FeedMode`가 `dataSource.pollIntervalMs` 주기로 fetcher 호출. 변경 감지 시 GPT에 `triggerMode='feedPoll'` 로 refine 요청. CostLedger가 `pollingPaused=true`면 skip.

## 패키지 구조

```
packages/
├── core/                # DSL, runtime, validator, patches, feed-mode
├── planner-core/        # GPTPlanner, guardrails, cost-ledger, recovery
├── renderer-react/      # React + shadcn tokens + DevTools
├── renderer-web/        # Web Components baseline (token-only, deprecated)
├── widget-iframe/       # postMessage bridge + sandbox
└── cli/                 # genui add-component/tool/skill
apps/
├── demo-host/           # Vite + React + BYOK + 10 use cases
└── demo-widget/
```

## 데이터 흐름 Invariant

1. GPT 출력은 **항상** zod 검증을 통과해야 Runtime에 도달.
2. 동적 컴포넌트는 **항상** iframe sandbox에서만 실행.
3. 외부 URL은 **항상** 활성 skillpack의 `allowedDomains` 안에 있어야 함.
4. Tool 호출은 **항상** permission gate 통과.

## 확장 포인트
- `Planner` 인터페이스 구현체 교체 (다른 LLM 프로바이더)
- `ComponentRegistry.registerComponent()` 로 신규 위젯
- `ToolRegistry.registerTool()` 로 신규 툴
- `SkillManifest.allowedDomains` 로 CSP 확장
