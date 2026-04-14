# Quickstart

## 1) Install

```bash
pnpm install
```

Note: 네트워크가 차단된 환경에서는 의존성 설치가 실패할 수 있습니다.

## 2) Run

```bash
pnpm dev
```

목표:
- `apps/demo-host`가 widget을 mount
- `window.GENUI.mount(...)`로 임의 페이지에 embed 가능

## 3) Embed (script loader style)

```html
<script src="/genui-embed.js"></script>
<script>
  window.GENUI.mount({
    permissions: ["network", "files"],
    skills: ["data-research"],
    position: "right",
    width: 420
  });
</script>
```

## 4) Demo prompt examples
- 리서치해서 A vs B 비교표 만들어줘
- CSV 업로드해서 KPI랑 차트 보여줘
- 캠페인 브리프 만들고 SNS 프리뷰
- 리드 리스트 보여주고 점수화
- 지도에서 근처 카페 찾아
- 이 자리에서 차트 코드로 만들어
- 새 툴 스텁 만들어줘
