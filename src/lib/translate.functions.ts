import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  lang: z.enum(["fr", "ar"]),
  texts: z.array(z.string().min(1).max(2000)).min(1).max(80),
});

const LANG_NAME: Record<"fr" | "ar", string> = {
  fr: "French (français)",
  ar: "Arabic (العربية)",
};

// Simple in-process per-user rate limit to prevent credit drain via scripted
// calls. Signed-in only; window is best-effort per server instance.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateHits = new Map<string, number[]>();
function checkRate(userId: string) {
  const now = Date.now();
  const arr = (rateHits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) throw new Error("Too many translation requests. Please slow down.");
  arr.push(now);
  rateHits.set(userId, arr);
}

export const translateBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<{ translations: string[] }> => {
    checkRate(context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are a professional UI translator for a SaaS product called "KC".
Translate every input string from English into ${LANG_NAME[data.lang]}.
Rules:
- Output ONLY a JSON array of strings, same length and same order as input. No prose, no keys, no code fences.
- Preserve leading/trailing whitespace, punctuation, emojis, and casing style.
- Keep placeholders like {name}, {n}, {t}, {q}, %s, %d, $variable, #hashtag EXACTLY as-is.
- Keep URLs, emails, file paths, code snippets, brand names ("KC", "Lovable", "WhatsApp", "Shopify", "Telegram", "Instagram", "Facebook", "Stripe", "Nova", "Ember", "Aurora", "KC") UNTRANSLATED.
- Keep numeric values and currency codes unchanged.
- Never add explanations, quotes around the array, or trailing commas.
- If a string is already in the target language or has no translatable words, return it unchanged.`;

    const prompt = JSON.stringify(data.texts);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
    });

    // Extract JSON array from the response
    let arr: unknown;
    const raw = text.trim();
    try {
      arr = JSON.parse(raw);
    } catch {
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start >= 0 && end > start) {
        try { arr = JSON.parse(raw.slice(start, end + 1)); } catch {}
      }
    }
    if (!Array.isArray(arr) || arr.length !== data.texts.length) {
      // Fallback: return originals so caller doesn't break
      return { translations: data.texts };
    }
    return { translations: arr.map((v, i) => (typeof v === "string" && v.length > 0 ? v : data.texts[i])) };
  });
