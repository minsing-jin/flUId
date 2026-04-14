import type { Theme } from "@genui/core";
import { themeToCssVars, resolveTheme, type ThemeTokens } from "./presets.js";

export { themeToCssVars, resolveTheme };
export type { ThemeTokens };

/**
 * Apply a theme to a DOM element by setting CSS variables. If no theme is
 * provided, a sensible default is used so plans without theme still render.
 */
export function applyTheme(target: HTMLElement, theme: Theme | undefined): void {
  const effective: Theme = theme ?? { mood: "serious", density: "comfortable", accent: "indigo" };
  const vars = themeToCssVars(effective);
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value);
  }
  target.setAttribute("data-genui-mood", effective.mood);
  target.setAttribute("data-genui-density", effective.density);
}
