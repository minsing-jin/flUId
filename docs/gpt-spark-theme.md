# GPT Spark Theme Customization

GPT Spark에서 시각 디자인은 **일급 시민**입니다. UIPlan DSL에 `theme` 필드가 있고 GPT가 분위기에 맞게 채웁니다.

## DSL 필드

```ts
theme: {
  mood: "serious" | "playful" | "minimal" | "vivid" | "dark",
  density: "compact" | "comfortable" | "spacious",
  accent: string,  // 6-digit hex or preset keyword
  rationale?: string  // why this visual choice
}
```

## Mood 프리셋

| Mood | 배경 | 전경 | 폰트 | 용도 |
|------|------|------|------|------|
| `serious` | `#f8fafc` | `#0f172a` | Inter | 금융, 운영, BI 대시보드 |
| `playful` | `#fff7ed` | `#78350f` | Quicksand | 개인, 주말, 가계부 |
| `minimal` | `#ffffff` | `#111111` | IBM Plex Mono | 단일 작업, 집중 |
| `vivid` | `#fefce8` | `#1e1b4b` | Space Grotesk | 마케팅, 캠페인 |
| `dark` | `#0b1120` | `#e2e8f0` | Inter | 야간, 오퍼레이션 센터 |

## Density 스케일

- `compact`: spacing ×0.75, font 13px — 정보 밀도 높은 대시보드
- `comfortable`: spacing ×1.0, font 14px — 기본값
- `spacious`: spacing ×1.35, font 15px — 프레젠테이션, 단일 작업

## Accent 컬러

Hex 또는 프리셋 키워드:
- `indigo`, `emerald`, `rose`, `amber`, `slate`
- `violet`, `cyan`, `teal`, `pink`, `neutral`

accent의 전경색(`--genui-accent-fg`)은 luminance를 계산해 자동으로 검정/흰색 선택.

## 커스텀 프리셋 추가
`packages/renderer-react/src/theme/presets.ts`의 `MOOD_BASE` / `PRESET_ACCENTS` 확장.

## GPT가 mood를 잘못 고르면
시스템 프롬프트의 design guidance가 힌트를 줍니다:
- 금융/운영 → serious
- 개인/주말 → playful
- 포커스/단일 작업 → minimal
- 마케팅 → vivid
- 야간 → dark

프롬프트에 "mood는 XXX로 해줘" 같이 명시적으로 요청해도 GPT가 존중합니다.

## CSS 변수 사용

```css
.my-component {
  background: var(--genui-bg);
  color: var(--genui-fg);
  border: 1px solid var(--genui-border);
  border-radius: var(--genui-radius);
  padding: calc(16px * var(--genui-spacing));
}
```

`applyTheme(element, plan.theme)` 호출이 CSS variable을 실시간 갱신합니다.
