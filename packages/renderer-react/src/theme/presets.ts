import type { Theme, ThemeDensity, ThemeMood } from "@genui/core";

export interface ThemeTokens {
  colorBg: string;
  colorFg: string;
  colorMuted: string;
  colorBorder: string;
  colorAccent: string;
  colorAccentFg: string;
  spacingScale: number;
  radius: number;
  fontFamily: string;
  fontSize: number;
}

const PRESET_ACCENTS: Record<string, string> = {
  indigo: "#4f46e5",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  slate: "#475569",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  pink: "#ec4899",
  neutral: "#737373"
};

function resolveAccent(accent: string): string {
  if (accent.startsWith("#")) return accent;
  return PRESET_ACCENTS[accent] ?? "#4f46e5";
}

const MOOD_BASE: Record<ThemeMood, Omit<ThemeTokens, "spacingScale" | "fontSize" | "colorAccent" | "colorAccentFg">> = {
  serious: {
    colorBg: "#f8fafc",
    colorFg: "#0f172a",
    colorMuted: "#64748b",
    colorBorder: "#e2e8f0",
    radius: 6,
    fontFamily: "'Inter', 'Pretendard', system-ui, sans-serif"
  },
  playful: {
    colorBg: "#fff7ed",
    colorFg: "#78350f",
    colorMuted: "#a16207",
    colorBorder: "#fed7aa",
    radius: 14,
    fontFamily: "'Quicksand', 'Pretendard', system-ui, sans-serif"
  },
  minimal: {
    colorBg: "#ffffff",
    colorFg: "#111111",
    colorMuted: "#808080",
    colorBorder: "#ededed",
    radius: 2,
    fontFamily: "'IBM Plex Mono', ui-monospace, 'Pretendard', sans-serif"
  },
  vivid: {
    colorBg: "#fefce8",
    colorFg: "#1e1b4b",
    colorMuted: "#7c3aed",
    colorBorder: "#fde68a",
    radius: 10,
    fontFamily: "'Space Grotesk', 'Pretendard', system-ui, sans-serif"
  },
  dark: {
    colorBg: "#0b1120",
    colorFg: "#e2e8f0",
    colorMuted: "#94a3b8",
    colorBorder: "#1e293b",
    radius: 8,
    fontFamily: "'Inter', 'Pretendard', system-ui, sans-serif"
  }
};

const DENSITY_SPACING: Record<ThemeDensity, number> = {
  compact: 0.75,
  comfortable: 1,
  spacious: 1.35
};

const DENSITY_FONT: Record<ThemeDensity, number> = {
  compact: 13,
  comfortable: 14,
  spacious: 15
};

function contrastOn(color: string): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#111827" : "#ffffff";
  }
  return "#ffffff";
}

export function resolveTheme(theme: Theme): ThemeTokens {
  const base = MOOD_BASE[theme.mood];
  const accent = resolveAccent(theme.accent);
  return {
    ...base,
    colorAccent: accent,
    colorAccentFg: contrastOn(accent),
    spacingScale: DENSITY_SPACING[theme.density],
    fontSize: DENSITY_FONT[theme.density]
  };
}

export function themeToCssVars(theme: Theme): Record<string, string> {
  const tokens = resolveTheme(theme);
  return {
    "--genui-bg": tokens.colorBg,
    "--genui-fg": tokens.colorFg,
    "--genui-muted": tokens.colorMuted,
    "--genui-border": tokens.colorBorder,
    "--genui-accent": tokens.colorAccent,
    "--genui-accent-fg": tokens.colorAccentFg,
    "--genui-radius": `${tokens.radius}px`,
    "--genui-spacing": `${tokens.spacingScale}`,
    "--genui-font-size": `${tokens.fontSize}px`,
    "--genui-font-family": tokens.fontFamily
  };
}
