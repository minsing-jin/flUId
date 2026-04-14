export interface PermissionDecision {
  requested: string[];
  granted: string[];
}

export function isPermissionGranted(decision: PermissionDecision, permission: string): boolean {
  return decision.granted.includes(permission);
}

export function allPermissionsGranted(decision: PermissionDecision, required: string[]): boolean {
  return required.every((permission) => isPermissionGranted(decision, permission));
}
