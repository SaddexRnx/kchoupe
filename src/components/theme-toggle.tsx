import { Moon, Sun } from "lucide-react";
import { usePrefs } from "@/lib/preferences";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, toggleMode } = usePrefs();
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        "glass-panel relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/10 " +
        className
      }
    >
      <Sun
        className={
          "absolute h-4 w-4 transition-all duration-500 " +
          (isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 text-amber-500")
        }
      />
      <Moon
        className={
          "absolute h-4 w-4 transition-all duration-500 " +
          (isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")
        }
      />
    </button>
  );
}
