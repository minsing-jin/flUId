# flUId UX 룰북

> **모든 UI는 이유가 있어야 한다.** GPT가 생성하든 사람이 짜든.
> 이 문서는 "왜 그렇게 생겼는가"를 명문화해서 **결정의 부담을 줄이고**
> 생성된 UI의 일관성을 높인다. 시스템 프롬프트에도 압축본이 들어간다.

---

## 1. 정보 위계 (Information Hierarchy)

### 룰 1.1 — 한 화면에 1개의 가장 큰 숫자
**이유**: 가장 큰 글자 = "이 화면에서 가장 중요한 1개의 답"이라는 약속.
KPI를 4개 두면 모두 비슷한 크기여야 한다 (병렬). 다른 위계가 섞이면 시선 혼란.

### 룰 1.2 — 텍스트 크기는 4단계만
| 등급 | 크기 | 용도 |
|------|------|------|
| **Hero** | 32-48px | 슬라이드 제목, 단일 KPI 핵심 숫자 |
| **Heading** | 18-24px | 카드/블록 제목 |
| **Body** | 13-15px | 본문, 설명 |
| **Meta** | 10-12px | 캡션, 시간, 단위 |

5단계 이상 쓰면 위계가 흐려진다.

### 룰 1.3 — 색상으로 위계를 흉내내지 마라
중요한 건 **위치 + 크기**로 표현한다. 색상은 *의미*에만 쓴다 (성공=녹색, 위험=빨강, 강조=accent).

---

## 2. 색상 사용 (Color Semantics)

### 룰 2.1 — 의미 색상 5종만 사용
| 의미 | 토큰 | 용도 |
|------|------|------|
| Foreground | `--genui-fg` | 본문 텍스트 |
| Muted | `--genui-muted` | 보조 텍스트, 캡션 |
| Border | `--genui-border` | 구분선, 카드 외곽 |
| **Accent** | `--genui-accent` | "여기가 행동 지점" 신호 (버튼, 핵심 숫자, 활성 탭) |
| Background | `--genui-bg` | 카드/패널 배경 |

추가: `#22c55e` (성공/+), `#ef4444` (오류/-), `#f59e0b` (경고).

### 룰 2.2 — Accent는 화면당 평균 3-5회만
액센트 색이 화면을 도배하면 강조의 의미가 사라진다. 하나의 페이지에 액센트는:
- 메인 CTA 버튼 1개
- 핵심 KPI 숫자 1-3개
- 활성 탭/현재 슬라이드 인디케이터 1개

### 룰 2.3 — Theme.mood가 색상을 결정한다
- `serious`: 차분한 슬레이트, 작은 채도 (금융/대시보드/오퍼레이션)
- `playful`: 따뜻한 amber/rose, 큰 radius (개인/주말/생활)
- `minimal`: 무채색, 모노스페이스 (포커스/단일 작업)
- `vivid`: 채도 높은 violet/cyan (마케팅/캠페인)
- `dark`: 짙은 배경 + 밝은 액센트 (야간/모니터링/프레젠테이션)

GPT는 프롬프트의 *온도*를 읽어 mood를 선택한다. "회의록 정리" → serious, "주말 가계부" → playful.

---

## 3. 간격 (Spacing) — Density 기반

### 룰 3.1 — 간격은 4의 배수
4, 8, 12, 16, 24, 32, 48, 64. 그 외 값을 쓰지 마라.

### 룰 3.2 — Density가 기본 간격을 곱한다
- `compact` × 0.75 → 정보 밀도 높은 BI 대시보드
- `comfortable` × 1.0 → 기본
- `spacious` × 1.35 → 프레젠테이션, 단일 작업, 모바일

### 룰 3.3 — 카드 사이 간격 ≥ 카드 내부 패딩
카드 사이가 더 좁으면 두 카드가 한 덩어리로 보인다. 시각적 그루핑은 간격이 만든다.

---

## 4. 애니메이션 (Motion)

### 룰 4.1 — 200~600ms 사이만
| 길이 | 용도 |
|------|------|
| 100-200ms | 호버, 상태 변경 (즉각 반응) |
| 300-500ms | 등장, 트랜지션 (눈치챌 수 있는 변화) |
| 500-700ms | 슬라이드, 강조 (의식적 이동) |

700ms 초과하면 답답함. 100ms 미만은 변화 자체를 못 느낌.

### 룰 4.2 — Easing은 자연 곡선
- 등장: `cubic-bezier(0.16, 1, 0.3, 1)` — 부드럽게 자리잡음
- 호버/클릭: `cubic-bezier(0.4, 0, 0.2, 1)` — 빠르게 반응
- 절대 `linear` 쓰지 마라 (기계적임)

### 룰 4.3 — Stagger는 80~150ms 간격
여러 카드가 동시에 나타나면 화면이 깜박이는 느낌. 80~150ms씩 시간차를 두면 시선이 흐름을 따라간다.
**8개 이상은 stagger 의미 없음** — 다 모아서 한 번에 등장시켜라.

### 룰 4.4 — 페이지 전환은 한 가지 방향만
좌→우 슬라이드라면 페이지 내 모든 등장도 좌→우. 방향이 섞이면 멀미.

---

## 5. 상호작용 피드백 (Feedback)

### 룰 5.1 — 100ms 안에 반응
사용자가 클릭/입력했는데 100ms 안에 시각적 반응이 없으면 "안 되는 줄" 안다.
- 즉각: hover/active 상태 (CSS만으로)
- 100~300ms 안: 작업 시작 표시 (스피너, 로딩 바, 스켈레톤)

### 룰 5.2 — 1초 이상 걸리면 진행 상태 표시
스피너만으로는 부족. 진행률 바 또는 단계 표시. 시간이 길수록 사용자에게 무엇이 진행 중인지 더 구체적으로 보여준다.

### 룰 5.3 — 실패는 침묵하지 마라
에러는 다음을 모두 포함한다:
1. 무엇이 실패했는지 (구체적으로)
2. 사용자가 할 수 있는 다음 행동
3. 혹시 자동 복구되었는지

```
❌ "오류가 발생했습니다"
✅ "GPT 응답이 형식에 맞지 않아 한 번 더 요청했어요. 그래도 실패하면 다른 프롬프트로 시도해 주세요."
```

---

## 6. 슬라이드 (Presentation Mode)

### 룰 6.1 — 한 슬라이드 한 메시지
하나의 슬라이드는 *하나의 명제*만 전달한다. 두 개를 담고 싶으면 두 슬라이드로 쪼개라.

### 룰 6.2 — Hero 슬라이드는 텍스트 ≤ 12 단어
첫 슬라이드, 섹션 전환 슬라이드는 큰 글자 + 짧은 문장. 청중이 읽는 시간을 빼앗지 마라.

### 룰 6.3 — 데이터 슬라이드는 KPI 4개 또는 차트 1개
4개 초과하면 청중은 어디 봐야 할지 모른다. 더 보여주고 싶으면:
- 다음 슬라이드로 넘기거나
- 1개 차트 + 3개 보조 카드로 분리

### 룰 6.4 — 슬라이드 등장 애니메이션은 한 가지 종류
한 슬라이드 안에서는 stagger만, 여러 종류 (fade + slide + bounce) 섞지 마라. 어지럽다.

### 룰 6.5 — 풀스크린 모드에서는 캐럿 X
풀스크린에서 보조 컨트롤은 숨기고, 키보드 단축키로 모두 가능해야 한다 (←/→/F/Esc).

---

## 7. 인터랙티브 컴포넌트

### 룰 7.1 — 버튼 라벨은 동사 + 목적어
| ❌ | ✅ |
|----|----|
| 확인 | 슬라이드 추가 |
| OK | 키 저장 |
| 제출 | 캠페인 시작 |

### 룰 7.2 — 입력 필드에 placeholder만 두지 마라
placeholder는 사용자가 타이핑 시작하면 사라진다. 항상 필요한 정보는 *위에 라벨*로 두어야 한다.

### 룰 7.3 — 토글/투표는 즉시 시각 반영
사용자가 옵션 A를 누르면 진행 바, 카운트가 *즉시* 업데이트되어야 한다. 백엔드 통신을 기다리지 말고 optimistic UI.

---

## 8. Generative UI 특화 룰

### 룰 8.1 — Mock 데이터도 *그럴듯해야* 한다
"$1,234,567" 같은 명확히 진짜 같은 숫자, "@brand" 같은 자연스러운 핸들. "Lorem ipsum"은 절대 금지.

### 룰 8.2 — 빈 상태도 디자인되어 있어야
데이터가 0개일 때:
- 친근한 일러스트 (이모지 OK)
- "왜 비어있는가" 한 줄
- "다음 행동" 버튼

### 룰 8.3 — 컴포넌트 자유 발명 가능 (Flexible UI)
GPT는 `KPIGrid`처럼 등록된 타입뿐 아니라 `WeatherWidget`, `SNSDashboard` 같은 새 타입도 자유롭게 만들 수 있다. 미등록 타입은 Generic Renderer가 `props.children` 트리를 해석해 렌더한다.

### 룰 8.4 — 라이브 데이터를 가짜로 위장하지 마라
mock도 시간에 따라 변하면 "라이브 같은 느낌". 단, 사용자가 명시적으로 묻기 전엔 "Mock"이라고 라벨을 붙이거나 의심하게 만들지 말 것.

---

## 9. 접근성 (Accessibility — 자동 검사 항목)

| 룰 | 검사 |
|----|------|
| 모든 인터랙티브 컴포넌트는 라벨이 있다 | `accessibilityCheck` 자동 |
| ChartBlock은 `ariaLabel` 또는 `title` 필수 | 자동 |
| 색상 단독 의미 전달 금지 | StatusIndicator는 dot+label |
| 어두운 테마 텍스트 명도 대비 ≥ 4.5:1 | 수동 검토 |
| 키보드 네비게이션 가능 | 인터랙티브 카운트 > 3이면 자동 경고 |

---

## 10. GPT가 따라야 할 압축 룰셋 (시스템 프롬프트 주입용)

> 다음은 모든 UIPlan 생성 시 GPT system prompt에 자동 주입된다.

```
- One screen, one biggest number. Never two equal-sized "most important" things.
- Use only 4 text sizes (Hero/Heading/Body/Meta). Don't invent in-between sizes.
- Accent color appears 3-5 times max per screen.
- Theme.mood reflects prompt register (finance=serious, weekend=playful, marketing=vivid).
- Spacing in 4-multiples. Card-gap ≥ card-padding.
- Animations 200-600ms. Stagger 80-150ms, max 8 items.
- Buttons say verb+object, not "OK". Toggle/poll updates UI optimistically.
- Empty states are designed: emoji + reason + next-action button. Never blank.
- Mock data must look real ($1.24M, "@brand"). No "Lorem ipsum".
- Slides: one message per slide. Hero ≤ 12 words. Data ≤ 4 KPIs or 1 chart.
- Errors say what failed + what user does next. Not "An error occurred".
```
