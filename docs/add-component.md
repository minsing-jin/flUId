# Add Component

## Manual
1. `packages/core/src/registry/default-component-catalog.ts`에 타입/스키마/메타를 추가한다.
2. `packages/renderer-web/src/components/index.ts`에 Web Component 구현을 추가한다.
3. renderer 미구현 타입은 placeholder 전략을 사용한다.
4. 외부 low-level 라이브러리는 직접 노출하지 말고 `MeasuredText`처럼 선언형 props를 가진 블록으로 감싼다.

## CLI
```bash
genui add-component MyComponent
```

생성 경로:
- `packages/core/src/registry/generated-components/my-component.ts`
