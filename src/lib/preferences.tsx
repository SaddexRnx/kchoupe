import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "fr" | "ar";
export type ThemeId = "aurora" | "midnight" | "cloud" | "sunset" | "forest" | "rose" | "ocean" | "mono" | "candy" | "sand" | "royal";
export type Mode = "dark" | "light";

const LIGHT_THEMES: ThemeId[] = ["cloud", "sand"];

type Prefs = {
  lang: Lang;
  theme: ThemeId;
  motion: boolean; // true = animations on
  mode: Mode;
  setLang: (l: Lang) => void;
  setTheme: (t: ThemeId) => void;
  setMotion: (v: boolean) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
};

const Ctx = createContext<Prefs | null>(null);

const KEY = "kc.prefs.v1";

function readInitial(): { lang: Lang; theme: ThemeId; motion: boolean; mode: Mode } {
  if (typeof window === "undefined") return { lang: "en", theme: "aurora", motion: true, mode: "dark" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const theme = (p.theme as ThemeId) ?? "aurora";
      return {
        lang: (p.lang as Lang) ?? "en",
        theme,
        motion: p.motion ?? true,
        mode: (p.mode as Mode) ?? (LIGHT_THEMES.includes(theme) ? "light" : "dark"),
      };
    }
  } catch {}
  return { lang: "en", theme: "aurora", motion: true, mode: "dark" };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<ThemeId>("aurora");
  const [motion, setMotion] = useState<boolean>(true);
  const [mode, setMode] = useState<Mode>("dark");

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    const p = readInitial();
    setLang(p.lang);
    setTheme(p.theme);
    setMotion(p.motion);
    setMode(p.mode);
  }, []);

  // Apply to <html> and persist. Mode wins over theme for background/text.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const effective: ThemeId = mode === "light"
      ? (LIGHT_THEMES.includes(theme) ? theme : "cloud")
      : (LIGHT_THEMES.includes(theme) ? "aurora" : theme);
    html.setAttribute("data-theme", effective);
    html.setAttribute("data-mode", mode);
    html.classList.toggle("dark", mode === "dark");
    html.classList.toggle("light", mode === "light");
    html.setAttribute("data-motion", motion ? "on" : "off");
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ lang, theme, motion, mode }));
    } catch {}
  }, [lang, theme, motion, mode]);

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <Ctx.Provider value={{ lang, theme, motion, mode, setLang, setTheme, setMotion, setMode, toggleMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrefs must be used inside PreferencesProvider");
  return v;
}


export const THEMES: { id: ThemeId; name: string; swatches: string[] }[] = [
  { id: "aurora",   name: "Glass Aurora",     swatches: ["#1a1a2e", "#16213e", "#a78bfa", "#4ade80"] },
  { id: "midnight", name: "Midnight Indigo",  swatches: ["#0b1220", "#1e293b", "#6366f1", "#22d3ee"] },
  { id: "cloud",    name: "Cloud White",      swatches: ["#f8fafc", "#e2e8f0", "#8b5cf6", "#10b981"] },
  { id: "sunset",   name: "Sahara Sunset",    swatches: ["#1a0f1f", "#2d1a2e", "#fb923c", "#f43f5e"] },
  { id: "forest",   name: "Atlas Forest",     swatches: ["#0f1a17", "#152922", "#34d399", "#eab308"] },
  { id: "rose",     name: "Rose Quartz",      swatches: ["#1f1420", "#2b1a2a", "#f472b6", "#818cf8"] },
  { id: "ocean",    name: "Deep Ocean",       swatches: ["#0b1a2b", "#132a45", "#38bdf8", "#22d3ee"] },
  { id: "mono",     name: "Mono Noir",        swatches: ["#0a0a0a", "#1c1c1c", "#e5e5e5", "#a3a3a3"] },
  { id: "candy",    name: "Candy Pop",        swatches: ["#1f0f2a", "#2d1a3a", "#f472b6", "#22d3ee"] },
  { id: "sand",     name: "Desert Sand",      swatches: ["#f5efe4", "#e6dcc5", "#b45309", "#10b981"] },
  { id: "royal",    name: "Royal Amethyst",   swatches: ["#150b2b", "#221040", "#a78bfa", "#facc15"] },
];

export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "fr", label: "French",  native: "Français" },
  { id: "ar", label: "Arabic",  native: "العربية" },
];