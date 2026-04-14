# GPT Spark Security Guardrails

GPT Spark는 **3중 방어 + 동적 CSP** 조합으로 생성형 UI의 공격 표면을 방어합니다.

## 공격 체인
```
사용자 입력 → GPT → UIPlan DSL → Runtime → iframe sandbox (fetch 가능)
```

한 단계만 뚫리면 데이터 유출, XSS, 토큰 탈취 가능성이 생깁니다.

## Layer 1: Input Filter
`packages/planner-core/src/guardrails/input-filter.ts`

의심 패턴 감지로 사용자 입력을 선필터링:
- `ignore previous instructions` 등 override 시도
- `system:` 프리픽스 역할 주입
- `<|im_start|>` 등 ChatML 제어 토큰
- `document.cookie`, `localStorage`
- `fetch('http://` 원시 호출

탐지 시 `GuardrailError` 발생, GPT 호출 없이 즉시 차단.

## Layer 2: System Prompt Refusal
`packages/planner-core/src/prompt-builder.ts`

System prompt에 명시적 거부 규칙 포함:
- 이전 지시 무시 요청 거부
- 시스템 프롬프트 공개 거부
- 외부 전송 위젯/액션 금지
- 실행 코드 금지 (선언적 DSL만)

## Layer 3: Output Static Check
`packages/planner-core/src/guardrails/static-check.ts`

GPT가 생성한 UIPlan을 실제 렌더링 전에 정적 분석:
- `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `__proto__`, `srcdoc` 등 의심 key 탐지
- 모든 URL 추출 후 **활성 skillpack의 `allowedDomains`** 와 대조
- 허용되지 않은 도메인은 `DOMAIN_NOT_ALLOWLISTED` 에러

## Layer 4: zod Schema Validation
`packages/core/src/dsl/validator.ts` + `packages/planner-core/src/response-schema.ts`

모든 UIPlan 필드는 strict zod schema 통과 필수:
- 미등록 컴포넌트 차단
- 미등록 tool 차단
- Props 타입 불일치 차단
- Unsafe HTML 패턴 차단

실패 시 GPT에 self-heal 재질의 1회. 재실패 시 에러.

## 동적 CSP
`packages/core/src/skills/csp.ts`

iframe sandbox의 `connect-src`는 활성 skillpack의 `allowedDomains`에서 동적 조립:

```typescript
const csp = buildSandboxCsp(activeSkillpacks);
// default-src 'none';
// script-src 'self' 'unsafe-inline';
// style-src 'self' 'unsafe-inline';
// connect-src 'self' https://api.mapbox.com https://nominatim.openstreetmap.org;
// frame-src 'none'
```

와일드카드(`*`)는 **항상** 거부.

## Trust Boundary

Host ↔ Sandbox 브릿지(`widget-iframe/protocol`)는 다음만 노출:
- allowlist tool 호출
- 자신의 블록 scoped state 읽기/쓰기
- pub/sub event bus (다른 위젯과 통신)

**노출하지 않음:**
- Raw auth token
- Routing API
- Cross-widget state 직접 쓰기

인증이 필요한 외부 호출은 모두 `tool.proxy_fetch` 같은 host proxy를 통과.

## 위협별 대응 요약

| 위협 | 방어 레이어 |
|------|-----------|
| Prompt injection | Input filter + system prompt + self-heal |
| XSS via props | zod + unsafe HTML detection + suspicious key scan |
| Data exfiltration | Dynamic CSP + domain allowlist |
| Token theft | postMessage bridge + no raw tokens |
| Unauthorized tool call | Permission gate + tool allowlist |
