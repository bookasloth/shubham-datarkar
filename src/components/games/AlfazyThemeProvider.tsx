"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveTheme, getTheme, type Theme, type ThemePalette } from "@/lib/games/themes";
import { useColorblind } from "@/components/games/use-colorblind";

type ThemeCtx = {
  themeKey: string;
  theme: Theme;
  colorblind: boolean;
  setColorblind: (v: boolean) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function useAlfazyTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlfazyTheme must be used within AlfazyThemeProvider");
  return ctx;
}

export default function AlfazyThemeProvider({
  now,
  children,
}: {
  now: number;
  children: ReactNode;
}) {
  // Shared read + `game:setting` sync (same hook Integra uses); the provider owns
  // persistence so the exposed setColorblind toggle still writes through.
  const [colorblind, setColorblind] = useColorblind("alfazy");

  useEffect(() => {
    localStorage.setItem("alfazy:colorblind", String(colorblind));
  }, [colorblind]);

  const override = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("theme");
  }, []);

  const themeKey = resolveTheme(now, undefined, override);
  const theme = getTheme(themeKey);

  const isDark = useIsDark();

  const ctx = useMemo(
    () => ({ themeKey, theme, colorblind, setColorblind }),
    [themeKey, theme, colorblind],
  );

  return (
    <Ctx.Provider value={ctx}>
      <div style={buildCSSVars(theme, colorblind, isDark)} data-alfazy-theme={themeKey}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

function buildCSSVars(theme: Theme, colorblind: boolean, isDark: boolean): React.CSSProperties {
  const palette: ThemePalette = isDark ? theme.dark : theme.light;

  const correct = colorblind ? theme.colorblind.correct : palette.correct;
  const present = colorblind ? theme.colorblind.present : palette.present;
  const absent = colorblind ? theme.colorblind.absent : palette.absent;

  return {
    "--alfazy-correct-base": correct.base,
    "--alfazy-correct-glow": correct.glow,
    "--alfazy-correct-text": correct.text,
    "--alfazy-present-base": present.base,
    "--alfazy-present-glow": present.glow,
    "--alfazy-present-text": present.text,
    "--alfazy-absent-base": absent.base,
    "--alfazy-absent-glow": absent.glow,
    "--alfazy-absent-text": absent.text,
    "--alfazy-bg": palette.bg,
    "--alfazy-accent": palette.accent,
    "--alfazy-tile-text": palette.tileText,
    "--alfazy-cb-correct-icon": colorblind ? `"${theme.colorblind.correct.icon}"` : '""',
    "--alfazy-cb-present-icon": colorblind ? `"${theme.colorblind.present.icon}"` : '""',
    "--alfazy-cb-absent-icon": colorblind ? `"${theme.colorblind.absent.icon}"` : '""',
  } as React.CSSProperties;
}
