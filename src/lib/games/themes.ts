import { puzzleDateISO, puzzleNumberFor } from "@/lib/daily";

// -- Palette types ----------------------------------------------------------

export type TilePalette = {
  base: string;
  glow: string;
  text: string;
};

export type ThemePalette = {
  correct: TilePalette;
  present: TilePalette;
  absent: TilePalette;
  bg: string;
  accent: string;
  tileText: string;
};

export type Theme = {
  key: string;
  label: string;
  light: ThemePalette;
  dark: ThemePalette;
  colorblind: {
    correct: TilePalette & { icon: string };
    present: TilePalette & { icon: string };
    absent: TilePalette & { icon: string };
  };
};

// -- Themes -----------------------------------------------------------------

const DEFAULT_THEME: Theme = {
  key: "default",
  label: "Default",
  light: {
    correct: { base: "#16a34a", glow: "rgba(22,163,74,0.3)", text: "#ffffff" },
    present: { base: "#ca8a04", glow: "rgba(202,138,4,0.25)", text: "#ffffff" },
    absent: { base: "#6b7280", glow: "rgba(107,114,128,0.1)", text: "#ffffff" },
    bg: "#ffffff",
    accent: "#0a0a0a",
    tileText: "#ffffff",
  },
  dark: {
    correct: { base: "#22c55e", glow: "rgba(34,197,94,0.35)", text: "#ffffff" },
    present: { base: "#eab308", glow: "rgba(234,179,8,0.3)", text: "#0a0a0a" },
    absent: { base: "#4b5563", glow: "rgba(75,85,99,0.15)", text: "#ffffff" },
    bg: "#0a0a0a",
    accent: "#fafafa",
    tileText: "#ffffff",
  },
  colorblind: {
    correct: { base: "#2563eb", glow: "rgba(37,99,235,0.3)", text: "#ffffff", icon: "◆" },
    present: { base: "#f97316", glow: "rgba(249,115,22,0.25)", text: "#ffffff", icon: "●" },
    absent: { base: "#6b7280", glow: "rgba(107,114,128,0.1)", text: "#ffffff", icon: "✕" },
  },
};

const HOLI_THEME: Theme = {
  key: "holi",
  label: "Holi",
  light: {
    correct: { base: "#059669", glow: "rgba(5,150,105,0.35)", text: "#ffffff" },
    present: { base: "#d97706", glow: "rgba(217,119,6,0.3)", text: "#ffffff" },
    absent: { base: "#78716c", glow: "rgba(120,113,108,0.12)", text: "#ffffff" },
    bg: "#fffbf5",
    accent: "#7c3aed",
    tileText: "#ffffff",
  },
  dark: {
    correct: { base: "#34d399", glow: "rgba(52,211,153,0.35)", text: "#0a0a0a" },
    present: { base: "#fbbf24", glow: "rgba(251,191,36,0.3)", text: "#0a0a0a" },
    absent: { base: "#57534e", glow: "rgba(87,83,78,0.15)", text: "#ffffff" },
    bg: "#0c0a09",
    accent: "#a78bfa",
    tileText: "#ffffff",
  },
  colorblind: DEFAULT_THEME.colorblind,
};

const DIWALI_THEME: Theme = {
  key: "diwali",
  label: "Diwali",
  light: {
    correct: { base: "#15803d", glow: "rgba(21,128,61,0.4)", text: "#ffffff" },
    present: { base: "#b45309", glow: "rgba(180,83,9,0.35)", text: "#ffffff" },
    absent: { base: "#78716c", glow: "rgba(120,113,108,0.1)", text: "#ffffff" },
    bg: "#fefce8",
    accent: "#b45309",
    tileText: "#ffffff",
  },
  dark: {
    correct: { base: "#4ade80", glow: "rgba(74,222,128,0.4)", text: "#0a0a0a" },
    present: { base: "#f59e0b", glow: "rgba(245,158,11,0.35)", text: "#0a0a0a" },
    absent: { base: "#57534e", glow: "rgba(87,83,78,0.15)", text: "#ffffff" },
    bg: "#0c0a09",
    accent: "#fbbf24",
    tileText: "#ffffff",
  },
  colorblind: DEFAULT_THEME.colorblind,
};

const CHRISTMAS_THEME: Theme = {
  key: "christmas",
  label: "Christmas",
  light: {
    correct: { base: "#166534", glow: "rgba(22,101,52,0.35)", text: "#ffffff" },
    present: { base: "#a16207", glow: "rgba(161,98,7,0.3)", text: "#ffffff" },
    absent: { base: "#9ca3af", glow: "rgba(156,163,175,0.12)", text: "#ffffff" },
    bg: "#fef2f2",
    accent: "#dc2626",
    tileText: "#ffffff",
  },
  dark: {
    correct: { base: "#4ade80", glow: "rgba(74,222,128,0.35)", text: "#0a0a0a" },
    present: { base: "#facc15", glow: "rgba(250,204,21,0.3)", text: "#0a0a0a" },
    absent: { base: "#4b5563", glow: "rgba(75,85,99,0.15)", text: "#ffffff" },
    bg: "#0f0f0f",
    accent: "#ef4444",
    tileText: "#ffffff",
  },
  colorblind: DEFAULT_THEME.colorblind,
};

const BIRTHDAY_THEME: Theme = {
  key: "birthday",
  label: "Birthday",
  light: {
    correct: { base: "#059669", glow: "rgba(5,150,105,0.35)", text: "#ffffff" },
    present: { base: "#d97706", glow: "rgba(217,119,6,0.3)", text: "#ffffff" },
    absent: { base: "#9ca3af", glow: "rgba(156,163,175,0.1)", text: "#ffffff" },
    bg: "#fdf4ff",
    accent: "#a855f7",
    tileText: "#ffffff",
  },
  dark: {
    correct: { base: "#34d399", glow: "rgba(52,211,153,0.35)", text: "#0a0a0a" },
    present: { base: "#fbbf24", glow: "rgba(251,191,36,0.3)", text: "#0a0a0a" },
    absent: { base: "#4b5563", glow: "rgba(75,85,99,0.15)", text: "#ffffff" },
    bg: "#0a0a0a",
    accent: "#c084fc",
    tileText: "#ffffff",
  },
  colorblind: DEFAULT_THEME.colorblind,
};

export const THEMES: Record<string, Theme> = {
  default: DEFAULT_THEME,
  holi: HOLI_THEME,
  diwali: DIWALI_THEME,
  christmas: CHRISTMAS_THEME,
  birthday: BIRTHDAY_THEME,
};

// -- Festival dates (2026, hardcoded for Phase 1) ---------------------------

type FestivalWindow = { theme: string; start: string; end: string; priority: number };

const FESTIVAL_DATES_2026: FestivalWindow[] = [
  { theme: "holi", start: "2026-03-03", end: "2026-03-04", priority: 10 },
  { theme: "diwali", start: "2026-11-06", end: "2026-11-10", priority: 10 },
  { theme: "christmas", start: "2026-12-24", end: "2026-12-26", priority: 8 },
  { theme: "christmas", start: "2026-12-31", end: "2027-01-01", priority: 8 },
];

// -- resolveTheme (pure function) -------------------------------------------

/**
 * Resolves the active theme for a given timestamp.
 * Uses the same IST date as the puzzle engine — no independent Date() calls.
 * User param is a stub for Phase 3 (birthday).
 */
export function resolveTheme(
  now: number,
  user?: { birthday?: string },
  override?: string | null,
): string {
  if (override && THEMES[override]) return override;

  const puzzleNum = puzzleNumberFor(now);
  const dateISO = puzzleDateISO(puzzleNum);

  if (user?.birthday) {
    const [, bMonth, bDay] = user.birthday.split("-");
    const [, dMonth, dDay] = dateISO.split("-");
    if (bMonth === dMonth && bDay === dDay) return "birthday";
  }

  const match = FESTIVAL_DATES_2026
    .filter((f) => dateISO >= f.start && dateISO <= f.end)
    .sort((a, b) => b.priority - a.priority)[0];

  if (match) return match.theme;

  return "default";
}

export function getTheme(key: string): Theme {
  return THEMES[key] ?? THEMES.default;
}
