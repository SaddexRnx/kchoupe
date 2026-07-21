# Full FR + AR translation coverage

The current `src/lib/i18n.tsx` only has keys for a portion of the app. Most page bodies (dashboard cards, product/order/integration copy, playground, admin, marketing, auth, onboarding, 404, toasts, modals) render hardcoded English. That's why switching to FR/AR only translates ~30% of the UI.

Chasing every literal string by hand across 40+ files is guaranteed to miss things. Instead I'll combine two layers so nothing slips through.

## Approach

### Layer 1 — Runtime auto-translator (catches everything)

A new `AutoTranslate` provider that, when the active language is `fr` or `ar`:

1. Walks the rendered DOM (MutationObserver on `document.body`) and collects visible English text nodes + `placeholder` / `title` / `aria-label` attributes.
2. Looks each string up in a persistent cache (`localStorage` key `atlas.i18n.<lang>.v1`, seeded with the existing dictionary keys so nothing already translated re-hits the network).
3. Batches unknown strings (up to 50 per call, debounced 200 ms) and sends them to a new server function `translateBatch` that calls Lovable AI (`google/gemini-3-flash-preview`) with a strict "return JSON array, same order, no explanations, preserve punctuation, keep {placeholders}" system prompt.
4. Writes the returned strings back into the DOM and the cache. All future renders are instant.
5. Skips: nodes inside `<code>`, `<pre>`, `[data-noi18n]`, inputs the user is typing in, and anything whose text is already non-Latin (for AR) / already contains diacritics (for FR heuristic).

This guarantees 100% coverage even for strings I never touched.

### Layer 2 — Expand the static dictionary (fast + free for known copy)

Extend `src/lib/i18n.tsx` with FR + AR entries for every key that already exists in the `en` dict but is missing translations (currently ~40% of AR keys and ~20% of FR keys are missing/fallback). This keeps the common, hot UI instant and cheap, and reduces AI calls.

### RTL correctness

`<html dir="rtl">` is already toggled by `preferences.tsx` for AR. I'll audit the shell/layout for any `left-*` / `right-*` / `ml-*` / `mr-*` that break in RTL and swap to logical `start-*` / `end-*` / `ms-*` / `me-*` on the top-level chrome (sidebar, topbar, drawers, modals).

## Files touched

- `src/lib/i18n.tsx` — fill in every missing FR + AR entry.
- `src/lib/auto-translate.tsx` (new) — provider, DOM walker, cache, batching.
- `src/lib/translate.functions.ts` (new) — `translateBatch` server function using Lovable AI.
- `src/routes/__root.tsx` — mount `<AutoTranslateProvider>` inside the existing providers so it runs on every page (marketing + app).
- `src/components/app-shell.tsx` + `src/components/marketing/page-shell.tsx` — a handful of `ml/mr` → `ms/me` swaps for RTL polish.

## Non-goals

- Not switching to `i18next` / `react-intl` — too invasive for what's needed.
- Not translating user-generated content (product names, customer messages, admin-entered notes). Only UI chrome.
- Not touching the DB schema.

## Cost note

First page-load in FR or AR triggers one or two batched AI calls (~1–2 s of background work); subsequent loads are instant from `localStorage`. Uses your existing `LOVABLE_API_KEY`, no new secret.
