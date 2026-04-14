# GPT Spark Quickstart

10분 안에 생성형 UI를 켜보세요.

## 준비물
- Node 20+
- pnpm 10+
- OpenAI API 키 (또는 프록시 URL)

## 설치

```bash
git clone <repo>
cd flUId
pnpm install
```

## 실행

```bash
pnpm --filter @genui/demo-host dev
```

브라우저가 `http://127.0.0.1:5173` 으로 열립니다.

## 첫 프롬프트

1. 왼쪽 사이드바의 **Bring Your Own Key** 섹션에서 OpenAI API 키를 붙여넣고 `Save` 클릭.
2. 프롬프트 입력란에 원하는 UI를 자연어로 요청:
   ```
   이번 분기 SaaS 매출 대시보드 만들어줘. 지역별 KPI와 월별 추세.
   ```
3. `Generate UI` 버튼 클릭. 스트리밍으로 UI가 렌더링됩니다.

## 내장 Use Case 10종

사이드바 `Use Cases` 섹션에서 A부터 J까지 원클릭 실행:
- A. 매출 대시보드 → 드릴다운
- B. 논문 대시보드 vs 주말 가계부
- C. 주문 급증 피드 감지
- D. 음성/텍스트 — 근처 카페
- E. 스마트 피드백 — 이상치 강조
- F. 코드 에디터 + 실시간 차트 patch
- G. 프레젠테이션 모드 전환
- H. 한영 혼합 입력
- I. 스킬팩 조합 (data + geo)
- J. DevTools — 왜 이런 UI?

## BYOK vs Proxy
- **Direct (BYOK)**: 브라우저에서 OpenAI 직접 호출. 개인 실험·로컬 개발에 적합.
- **Proxy**: 자체 서버가 API 키를 보관하고 요청을 릴레이. 프로덕션에 적합.

## 문제 해결
- `Guardrail violation` 에러: 프롬프트에 injection 패턴 감지. 일반 자연어로 다시 시도하세요.
- `API 500`: 3회 지수 백오프 retry 후 MockPlanner로 자동 fallback. 사이드바 상태 메시지에서 `error` 프리픽스 확인.
- DevTools 패널이 안 보일 때: 왼쪽 `Show DevTools` 버튼 토글.

## 다음 단계
- [Architecture](./gpt-spark-architecture.md)
- [Security Guardrails](./gpt-spark-security.md)
- [Cost Control](./gpt-spark-cost.md)
