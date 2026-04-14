# GPT Spark Roadmap

## M1 — Foundation (현재)
Seed: `seeds/gpt-spark-m1.yaml` · Ambiguity 0.15

**Scope:**
- `packages/planner-core` 와 GPTPlanner
- 3 트리거 모드 (prompt / interaction / feedPoll)
- 3중 injection 방어 + 동적 CSP
- 계층적 에러 복구
- 모델 티어링 + 토큰 버짓 cap
- UIPlan DSL에 theme/mood/density/accent 확장
- renderer-react에 shadcn 토큰 레이어 + theme 적용
- 내장 DevTools 패널 (dev 모드)
- demo-host Vite + BYOK + 10 use case
- 문서 8종 + CHANGELOG

**Stories:** S016 — S029 (prd.json 참고)

## M2 — Hardening & Polish

**주요 항목:**
- 응답 캐싱 (hash 기반, 10분 TTL, LRU eviction)
- LLM-as-judge 옵션 (5번째 방어 레이어)
- 스킬팩 동적 로딩/언로딩 API
- 지원 공급자 확장 (Anthropic, 로컬 모델)
- CLI `genui dev --gpt-spark` 명령
- Storybook 기반 컴포넌트 카탈로그
- 실 배포 가능한 레퍼런스 데모 사이트
- E2E 시나리오 20개 이상, GPT nightly smoke 테스트

## M3 — Advanced Capabilities

**주요 항목:**
- WebSocket 기반 실시간 피드 (dataSource polling 대체)
- 멀티 에이전트 플래닝 (Intent Router → Skill Selector → UI Generator 분리)
- Sandbox 강화 (per-widget W3C permission prompt)
- Cross-widget state pub/sub 공식 API
- 생성된 UI의 접근성(ARIA) 자동 검사
- 디자인 토큰 import (Figma Variables, Style Dictionary)
- GPT 응답 structured output mode (OpenAI schema parameter)

## 장기 비전
- 멀티 플랫폼 렌더러 (React Native, Flutter, Kotlin Compose)
- 오프라인 로컬 모델 번들 (Llama, Phi)
- 엔터프라이즈 심사 모드 (프롬프트 → 심사 → 승인 → 실행)
- 시각/음성 멀티모달 입력 표준화
