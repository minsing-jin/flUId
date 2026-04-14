# Add Skill

## Manual
1. `packages/core/src/examples/skillpacks.ts`에 `SkillManifest`를 추가한다.
2. `permissionsRequested`, `components`, `tools`, `suggestedPrompts`를 명시한다.
3. `apps/demo-host/src/index.ts`에서 enable/disable 검증한다.

## CLI
```bash
genui add-skill my-skillpack
```

생성 경로:
- `packages/core/src/examples/generated-skills/my-skillpack.ts`
