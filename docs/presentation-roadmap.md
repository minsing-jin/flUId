# Presentation 기능 로드맵

## 현재 (M-Present v1) — 구현 완료

| 기능 | 구현 |
|------|------|
| `slidedeck` / `slide` / `animate` / `poll` 프리미티브 | ✅ Generic Renderer |
| 키보드 네비게이션 (←/→/Space/F/E/Esc) | ✅ |
| 풀스크린 모드 | ✅ |
| 라이브 JSON 편집 모드 (E 키) | ✅ |
| 라이브 투표 (optimistic UI) | ✅ poll 프리미티브 |
| 8가지 등장 애니메이션 (fade/slide/scale/bounce/blur) | ✅ |
| Stagger 애니메이션 (delay) | ✅ |
| PDF Export (브라우저 print) | ✅ Export PDF 버튼 |
| GPT system prompt에 슬라이드 룰 주입 | ✅ |
| MockPlanner가 5장 deck 자동 생성 | ✅ |
| UX 룰북 문서 | ✅ docs/ux-rules.md |

## 다음 우선순위 (M-Present v2)

### 1. GPT 자동 슬라이드 생성 (최우선)
**상태**: 부분 — system prompt에 룰은 있지만, GPT가 풍부한 deck을 생성하는지 nightly e2e 테스트 필요.
**작업**:
- 프롬프트 → 5-7장 슬라이드 deck 자동 작성 검증
- 각 슬라이드의 `animate` kind와 delay 자동 결정
- 데이터 슬라이드의 KPI는 dataSources connector로 자동 연결

### 2. Live Q&A (poll의 자매)
- 청중이 입력 박스에 질문 → 발표자 화면에 실시간 모임
- WebSocket 또는 폴링 기반
- `qa-feed` 프리미티브로 추가 가능

### 3. 발표자 노트 (Speaker Notes)
- 슬라이드 옆에 발표자만 보는 노트 영역
- 풀스크린 모드에서 보조 화면(extended display) 활용

## 명시적 non-goal — 의도적으로 안 하는 것

### PPTX 파일 import
**왜 안 함**:
- `pptxgenjs` 같은 라이브러리는 무거움 (수 MB 번들 증가)
- PPTX는 OOXML 압축 형식 — 구조 매우 복잡 (마스터/레이아웃/테마 분리)
- 변환된 결과는 거의 항상 **flUId의 다이내믹 강점을 잃음** — 정적 슬라이드를 그대로 옮기면 flUId의 가치 (애니메이션/라이브 데이터/투표)가 사라짐
- 원본 PPTX의 특정 폰트/이미지가 안 보이는 문제

**대안**:
- **신규 작성**: GPT에 "이런 주제로 발표 만들어줘" → 처음부터 다이내믹하게
- **재구성**: 사용자가 PPTX 슬라이드별 텍스트만 추출 → 프롬프트로 입력 → GPT가 다이내믹 deck 생성

### MP4 영상 export
**왜 안 함**:
- `ffmpeg.wasm`이나 서버 사이드 렌더링 필요
- 스크롤/투표 같은 인터랙션은 동영상으로 표현 불가
- 화면 녹화 도구(QuickTime/OBS)가 이미 충분

**대안**: Cmd+Shift+5 (macOS) / Win+G (Windows) 화면 녹화

## 알려진 이슈 / 개선 후보

- 슬라이드 deck 안의 카드 호버 시 슬라이드 자체가 미세하게 움직임 (transform 충돌) — 추후 격리 필요
- `poll`은 새로고침 시 표 초기화 (의도적, demo용) — 영구 저장이 필요하면 connector 연결
- 발표자 키보드 단축키와 사이드바 입력 필드 키 충돌 가능 (textarea 안에서는 비활성)
