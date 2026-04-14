# Add Tool

## Manual
1. `packages/core/src/registry/default-tools.ts` 또는 신규 파일에 tool definition을 추가한다.
2. `inputSchema`, `outputSchema`를 `zod` strict 스키마로 정의한다.
3. permission 최소 권한을 설정한다.

## CLI
```bash
genui add-tool domain.my_tool
```

생성 경로:
- `packages/core/src/registry/generated-tools/domain-my-tool.ts`
