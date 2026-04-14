# flUId

## Ralph Loop 사용법

이 저장소는 `prd.json` 기반으로 Ralph Loop(Builder/Verifier) 반복을 수행합니다.

기본 정책: `ralph-loop-codex` 요청 시 **항상 연속 루프**로 동작합니다.
- `todo` 스토리가 남아 있으면 다음 스토리를 계속 처리
- 중단 조건: `todo` 소진 또는 치명적 실패 발생
- `1회 iteration만`을 원하면 명시적으로 단일 실행을 요청

1. `prd.json`에서 `status: "todo"`인 스토리 하나를 선택합니다.
2. Builder 단계에서 최소 변경으로 구현합니다.
3. 테스트/린트/타입체크를 실행합니다.
4. Verifier 단계에서 acceptance criteria 충족 여부를 검증합니다.
5. 통과 시 `status: "done"`으로 갱신하고 `progress.md`에 기록합니다.

## 실행 프롬프트 예시

Codex에게 아래처럼 지시하면 루프를 돌릴 수 있습니다.

```text
ralph-loop-codex로 연속 실행해. prd.json의 todo를 끝날 때까지 계속 돌리고,
각 iteration마다 빌더/검증 결과와 실행 커맨드를 보고해.
```
