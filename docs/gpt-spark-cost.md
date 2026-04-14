# GPT Spark Cost Control

## 리스크
Mode 3(피드 polling)는 기본 30~60초마다 GPT 호출. 활성 대시보드 1개당 일일 수천 건이 나올 수 있음. 비용 통제가 필수.

## 1. 모델 티어링

`CostLedger.selectModel(triggerMode)`:

| Trigger | Default Model | 이유 |
|---------|--------------|------|
| `prompt` | `gpt-4o` | 전체 UIPlan 생성은 복잡한 구조 추론 필요 |
| `interaction` | `gpt-4o-mini` | Patch는 작은 delta, 저렴한 모델로 충분 |
| `feedPoll` | `gpt-4o-mini` | 가장 자주 호출됨, 비용 민감도 최고 |

GPTPlanner 생성 시 `modelTier` 옵션으로 교체 가능:
```ts
new GPTPlanner({
  transport: ...,
  modelTier: { full: "gpt-4.1", patch: "gpt-4.1-mini" }
})
```

## 2. 토큰 버짓 Cap

`CostLedger` 옵션:
- `dailyTokenBudget`: 기본 100,000 토큰/일
- `warnThresholdRatio`: 기본 0.8 (80% 도달 시 warning)
- 100% 도달 시 자동으로 `pollingPaused=true` → Mode 3 멈춤

자정 기준 UTC 롤오버로 자동 리셋. 수동 리셋은 `ledger.resetDaily()`.

## 3. 스트리밍

기본 ON. GPT 첫 토큰이 즉시 DevTools와 렌더러에 반영되어 레이턴시 체감이 크게 줄어듦.

## 4. 캐싱 (M2 예정)
M1은 캐싱 미구현. M2에서 `hash(prompt + plan + dataSourceSnapshot)` 기반 10분 TTL LRU 캐시 계획.

## DevTools에서 확인
DevTools → `Cost` 탭에서 실시간 토큰·달러 집계.

## 대략적 비용 시뮬
가정: 대시보드 1개, Mode 3 60초 polling, 24h 운영, 호출당 평균 1,200 토큰.

- `gpt-4o-mini` ($0.60/1M): **~$1.04/일**
- `gpt-4o` ($10/1M): **~$17.28/일**

티어링 하나만으로 16배 차이.

## 권장 설정

### 개발
```ts
{ dailyTokenBudget: 50_000, modelTier: { full: "gpt-4o-mini", patch: "gpt-4o-mini" } }
```

### 데모
```ts
{ dailyTokenBudget: 200_000, modelTier: { full: "gpt-4o", patch: "gpt-4o-mini" } }
```

### 프로덕션
프록시 서버에서 per-user 버짓 추가, 본 CostLedger는 세션 내 안전망 역할.
