# KC

An AI sales and customer support workspace built for commerce in Algeria, Morocco, and Tunisia. It handles conversations in Arabic (Darija), French, and English across WhatsApp, Instagram, Messenger, and Telegram, with an Algerian delivery module built in.

Stack: TanStack Start, React 19, Tailwind v4, Supabase, Cloudflare Workers.

![Dashboard](docs/screenshots/dashboard-dark.png)

## About

I built KC after watching nearby store owners juggle Instagram DMs, cash on delivery, and shipping by hand. The tools they were sold assumed English and cards, which is not how commerce works here. I'm Saddek, a developer in Algeria. You can see more of what I build at [saddexrnx.github.io](https://saddexrnx.github.io) or message me on [Telegram](https://t.me/Saddex_x).

## Why I built it

Most chat and support tools are made for English-speaking SaaS teams. Commerce in North Africa works differently. Customers write in Darija, they pay cash on delivery, their orders come through Instagram DMs, and their shipping goes through Yalidine or ZR Express. KC is built around those realities instead of treating them as an afterthought.

## What it does

**Conversations.** A shared inbox for WhatsApp, Instagram, Messenger, and Telegram. The AI replies in the customer's language, can see your product catalog, and closes orders right in the chat. It collects the wilaya, commune, and phone number, quotes shipping, confirms the order, and writes it to your database. A human can step in on any thread with one click.

**Delivery.** All Algerian wilayas seeded, per-zone pricing, free-shipping thresholds, COD tracked separately from the order total, carrier assignment (Yalidine, ZR Express, Ecouriers, Rapidex, or manual), and a tracking timeline.

**Products.** Paste a Shopify, WooCommerce, or YouCan URL and KC scrapes the products, images, prices, and stock. It warns you when a custom domain cannot expose stock reliably so the AI does not claim something is available when it is not.

**AI employees.** Create an agent with its own model, tone, persona, and guardrails. Bring your own OpenAI-compatible key, or use Claude, Gemini, Mistral, OpenRouter, or the built-in gateway. Each employee shows a live connection status.

**Learning.** Confirmed good replies go into a learnings feed that feeds back into future prompts, so the assistant gets better on your specific store.

**Admin.** Every workspace, user, and KPI in one place, with live broadcasts, ban and unban, impersonation so you can fix a workspace directly, and a security dashboard showing 2FA adoption and blocked requests.

**Security.** Row level security on every table, TOTP 2FA with backup codes and an 8 hour re-verify window for destructive actions, per-user rate limits, an audit log, GDPR export and delete, guarded fetches, and `noindex` on every authenticated route.

## Stack

- TanStack Start v1 on Cloudflare Workers with streaming SSR
- Supabase for Postgres, auth, storage, and realtime
- Tailwind v4 with monochrome `oklch` tokens, light and dark mode
- `@lovable.dev/mcp-js` exposes workspaces, products, and orders as MCP tools
- Build-time Gemini translation plus a runtime translation layer for dynamic text
- PWA with install prompt and service worker

## Run it locally

```sh
bun install
bun dev
```

The dev server listens on http://localhost:8080. Cloud credentials are provisioned inside Lovable.

## Environment variables

Public (safe to expose): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

Server only: `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or carrier keys per workspace.

## Project structure

```
src/
  routes/            pages and /api/public webhooks
  components/        UI, page shells, admin panel
  lib/               server functions, server-only code, i18n, MCP tools
  integrations/      generated Supabase clients (do not edit)
  styles.css         Tailwind tokens
supabase/migrations/ SQL migrations and RLS policies
docs/screenshots/    images used in this README
```

## Screenshots

The `docs/screenshots/` folder has dark and light versions of the landing page, pricing, about, contact, login, signup, dashboard, AI employees, products, orders, conversations, integrations, knowledge, playground, settings, support, and admin pages.

## License

Proprietary. All rights reserved.
