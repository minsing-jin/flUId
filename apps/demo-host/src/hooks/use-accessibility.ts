import { useEffect } from "react";
import type { UIPlan } from "@genui/core";
import { accessibilityCheck, type AccessibilityIssue } from "@genui/renderer-react";

export interface UseAccessibilityArgs {
  plan: UIPlan | null;
  onIssues: (issues: AccessibilityIssue[]) => void;
}

/**
 * Runs the ARIA accessibility checker each time the plan changes,
 * and forwards issues to the caller (typically for DevTools display).
 */
export function useAccessibility({ plan, onIssues }: UseAccessibilityArgs): void {
  useEffect(() => {
    if (!plan) {
      onIssues([]);
      return;
    }
    onIssues(accessibilityCheck(plan));
  }, [plan, onIssues]);
}
