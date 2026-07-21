import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const Input = z.object({
  lang: z.enum(["fr", "ar"]),
  texts: z.array(z.string().min(1).max(2000)).min(1).max(80),
});

const LANG_NAME: Record<"fr" | "ar", string> = {
  fr: "French (français)",
  ar: "Arabic (العربية)",
};

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ translations: string[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are a professional UI translator for a SaaS product called "Atlas AI".
Translate every input string from English into ${LANG_NAME[data.lang]}.
Rules:
- Output ONLY a JSON array of strings, same length and same order as input. No prose, no keys, no code fences.
- Preserve leading/trailing whitespace, punctuation, emojis, and casing style.
- Keep placeholders like {name}, {n}, {t}, {q}, %s, %d, $variable, #hashtag EXACTLY as-is.
- Keep URLs, emails, file paths, code snippets, brand names ("Atlas AI", "Lovable", "WhatsApp", "Shopify", "Telegram", "Instagram", "Facebook", "Stripe", "Nova", "Ember", "Aurora", "Atlas") UNTRANSLATED.
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
