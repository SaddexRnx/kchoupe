# Atlas AI — Backend Plan

Turn the current UI mock into a real product on **Lovable Cloud** (managed Postgres + Auth + Storage + server functions) and the **Lovable AI Gateway** (for the AI employees). All work stays inside this TanStack Start project — no separate Next.js backend to run.

## Phase 1 — Foundation (auth + workspace)

1. Enable Lovable Cloud.
2. Auth: email/password + Google sign-in wired into the existing `/login` and `/signup` pages; session persisted; `/dashboard`, `/ai-employees`, etc. moved under an `_authenticated` layout that redirects to `/login` when signed out.
3. Schema (with RLS + grants):
   - `profiles` (id → auth.users, name, avatar, country, locale)
   - `workspaces` (id, name, plan, currency, country)
   - `workspace_members` (workspace_id, user_id, role)
   - `user_roles` enum table for admin/owner/member (separate table — never on profile)
4. `/onboarding` wizard writes real rows: workspace, region, initial preferences.

## Phase 2 — AI Employees + Playground (real chat)

1. Tables: `ai_employees` (name, role, model, system_prompt, status), `custom_models` (label, base_url, model_id, encrypted api_key), `conversations`, `messages`.
2. Server function `sendPlaygroundMessage` using **Lovable AI Gateway** (default models: `google/gemini-2.5-flash`, `openai/gpt-5`, `anthropic/claude-sonnet-4-5`), plus optional user-supplied OpenAI-compatible endpoints (key encrypted with `APP_USER_CONNECTION_KEY_SECRET`).
3. Wire the existing Playground UI and AI Employees CRUD to these server functions.

## Phase 3 — Knowledge base + web scraping

1. Tables: `knowledge_sources` (type: url/file/social, status), `knowledge_chunks` (embedding vector, source_id, content).
2. Storage bucket for uploaded files.
3. Server functions: `scrapeWebsite` (fetch + extract), `ingestFile`, `embedChunks` (Lovable AI Gateway embeddings). Retrieval used by AI employees at chat time.

## Phase 4 — Products, orders, conversations inbox

1. Tables: `products` (user inventory), `orders` (with `confirmed_by_ai` flag), `customers`, `inbox_conversations`, `inbox_messages`.
2. Replace all mocks in `products.tsx`, `orders.tsx`, `conversations.tsx` with real reads/writes; CSV import/export server-side.
3. Dashboard stats become real aggregates (MRR, confirmed-by-AI-today, etc.).

## Phase 5 — Integrations hub (real connectors, North-Africa first)

1. Table: `integrations` (workspace_id, connector_id, status, encrypted credentials, assigned_ai_employees).
2. Priority connectors: WhatsApp Business, Instagram/Facebook Messenger, Shopify, WooCommerce, Google Sheets, plus the "add my website / social page" scraping flow from Phase 3.
3. OAuth via Lovable's App User Connector where available; API-key form otherwise. Test-connection + re-authorize buttons hit real endpoints.

## Phase 6 — Billing (Algeria / Tunisia / Morocco)

1. Stripe for international cards + Paddle where useful.
2. Track local payment methods (CIB, BaridiMob, Flouci, CMI) as **manual** payment records first — user marks paid, invoice generated. Automated local rails added as providers become available.
3. `subscriptions` table, plan gates on server functions.

## Phase 7 — Settings, notifications, security hardening

1. Persist all `settings.tsx` sections (profile, workspace, team invites, API keys, webhooks, appearance/language).
2. Server-side webhooks (`/api/public/webhooks/*`) with HMAC verification.
3. Email/notifications via Lovable AI Gateway or Resend.
4. Full security pass: RLS on every table, `service_role` grants correct, secrets encrypted, role checks through `has_role()`.

## Technical notes

- All app-internal calls: `createServerFn` in `*.functions.ts` files.
- External callers (webhooks, cron): `src/routes/api/public/*` with signature verification.
- AI calls: Lovable AI Gateway (no separate provider keys needed for defaults).
- Secrets/API keys stored encrypted per user via the App User Connection Key pattern.
- Every new public table gets `GRANT` + `ENABLE RLS` + policies in the same migration.

## Suggested order to ship

Phase 1 → 2 → 4 → 3 → 5 → 6 → 7. This gets a signed-in user talking to a real AI employee about real products/orders as fast as possible, then layers knowledge, integrations, and billing.

Reply with **"go"** and the phase number to start (e.g. "go phase 1"), or ask me to reshuffle priorities.
