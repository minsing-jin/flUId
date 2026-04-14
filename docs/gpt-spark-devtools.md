# GPT Spark DevTools

개발 중에는 GPT 파이프라인 전체를 투명하게 관찰할 수 있어야 합니다.

## 활성화
`WorkbenchRuntime` 옵션에 `devMode: true` 전달. 그러면 demo-host 사이드바의 `Show DevTools` 버튼이 패널을 엽니다.

## 탭 구성

| 탭 | 표시 내용 |
|----|-----------|
| **Request** | GPT에 보낸 system + user 메시지 원문 |
| **Response** | 스트리밍으로 받은 원본 문자 (JSON 누적) |
| **Validation** | zod/guardrail 에러 내용 또는 `All validations passed` |
| **Plan History** | 각 턴의 UIPlan 스냅샷 (시간순) |
| **Patches** | 적용된 JSON Patch diff |
| **Cost** | 시각·모델·토큰·달러 타임라인 |
| **Recovery** | retry/self-heal/block-isolate 이벤트 로그 |

## 사용 팁
- "왜 이런 UI가 나왔는가"를 확인하려면 `Request` → `Response` 순서로 읽으세요.
- 에러가 나면 `Validation` 과 `Recovery` 탭을 먼저 보세요.
- 비용 스파이크 추적은 `Cost` 탭의 토큰 컬럼.

## 프로그램 적으로 접근

```ts
const planner = new GPTPlanner(config, deps);
await planner.plan("...");
const trace = planner.getLastTrace();
// trace.request, trace.rawResponse, trace.recoveryEvents, trace.costSnapshot
```

DevTools 패널은 이 trace를 매 호출 후 화면에 흘려넣을 뿐이므로, 커스텀 로깅/모니터링을 원하면 `getLastTrace()` 를 직접 사용.

## 주의
- DevTools는 **dev 모드 전용**. 프로덕션 빌드에서는 `runtime.isDevMode()` 를 체크해 아예 렌더하지 마세요.
- 토큰 패널에 민감한 프롬프트가 포함될 수 있으니 화면 녹화 시 주의.
