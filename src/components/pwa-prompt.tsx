import { useEffect, useState } from "react";

type BIPE = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PwaInstallPrompt() {
  const [evt, setEvt] = useState<BIPE | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("atlas.pwa.dismissed") === "1",
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPE);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt || dismissed) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[92vw] rounded-2xl border border-white/10 bg-black/85 backdrop-blur px-4 py-3 shadow-xl text-white animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center gap-3">
        <div className="text-2xl">📲</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Install Atlas AI</div>
          <div className="text-xs opacity-70">One tap for faster access on your device.</div>
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded-lg bg-white text-black font-medium hover:bg-white/90"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setEvt(null);
          }}
        >
          Install
        </button>
        <button
          aria-label="Dismiss"
          className="text-white/50 hover:text-white text-lg px-1"
          onClick={() => {
            localStorage.setItem("atlas.pwa.dismissed", "1");
            setDismissed(true);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
