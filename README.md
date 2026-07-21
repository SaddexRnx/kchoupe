<div align="center">

# ✨ Atlas AI

### The AI workforce for North African commerce.

Trilingual (🇬🇧 English · 🇫🇷 Français · 🇩🇿 العربية) AI employees that answer, upsell and close orders across WhatsApp, Instagram, Telegram and your store — while you sleep.

[![TanStack Start](https://img.shields.io/badge/TanStack-Start-EF4444?style=flat-square)](https://tanstack.com/start)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square)](#license)

</div>

---

## 🎨 Dual theme — beautiful in both

<table>
  <tr>
    <td align="center"><b>🌙 Dark</b></td>
    <td align="center"><b>☀️ Light</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/landing-dark.png" alt="Atlas AI landing — dark mode" /></td>
    <td><img src="docs/screenshots/landing-light.png" alt="Atlas AI landing — light mode" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/login-dark.png" alt="Sign in — dark" /></td>
    <td><img src="docs/screenshots/login-light.png" alt="Sign in — light" /></td>
  </tr>
</table>

---

## 🚀 Features

- 🤖 **AI Employees** — spin up custom bots trained on your catalog, tone and policies.
- 💬 **Omnichannel inbox** — WhatsApp, Instagram, Facebook Messenger, Telegram, live chat.
- 🛍️ **Smart product cards** — the AI recommends real SKUs, buyer taps → order created.
- 🧠 **Continuous learning** — every confirmed sale becomes a lesson for the whole workforce.
- 📦 **Order pipeline** — status tracking, revenue charts, private notes, bulk actions.
- 🌐 **Trilingual RTL** — Arabic, French, English translated in real-time with a `MutationObserver`.
- 🔐 **Admin panel** — every workspace, KPI, ticket, ban/unban in one place.
- 🔗 **Model manager** — bring your own OpenRouter / Gemini / OpenAI-compatible key.
- 🕸️ **Website scraper** — pull products from Shopify JSON, sitemap or plain HTML.
- 💳 **Local rails** — CIB, BaridiMob, Flouci, CMI, Cash on Delivery.
- 🎫 **Support tickets** — direct line from users to admin with realtime updates.
- 🧩 **MCP server** — OAuth-protected Model Context Protocol endpoint for agent integrations.

---

## 🧱 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **TanStack Start** (React 19, SSR on Cloudflare Workers) |
| Bundler | Vite 7 + Lightning CSS |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) + shadcn/ui |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + RLS) |
| AI | Lovable AI Gateway, OpenRouter, Gemini (user BYOK) |
| Charts | Recharts |
| Package manager | Bun |

---

## 🏁 Getting started

```bash
bun install
bun run dev
```

Open http://localhost:8080

### Environment

Copy `.env` from your Supabase project. The following are required:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

Server-only secrets (webhook signatures, model keys) go through Lovable's secret manager.

---

## 🗂️ Project structure

```
src/
├── routes/               # File-based routes (TanStack Start)
│   ├── __root.tsx        # App shell — providers, head, outlet
│   └── api/public/       # Public webhooks & MCP endpoints
├── components/
│   ├── marketing/        # Landing, auth, onboarding
│   ├── pages/            # In-app screens
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── *.functions.ts    # Client-safe server functions (createServerFn)
│   ├── *.server.ts       # Server-only helpers
│   └── mcp/              # MCP tool definitions
├── integrations/supabase # Auto-generated client + auth middleware
└── styles.css            # Tailwind v4 theme tokens (dark + light)
```

---

## 🚢 One-click publish to GitHub

Atlas is built inside [Lovable](https://lovable.dev), which ships with a native, two-way GitHub sync — no CLI, no manual git.

### From the Lovable editor

1. Click the **+ (Plus)** menu in the bottom-left of the chat input.
2. Choose **GitHub → Connect project**.
3. Authorize the **Lovable GitHub App** on the account or organization you want the repo under.
4. Pick the destination account, then click **Create Repository**.

Lovable creates a fresh repo, pushes the full codebase, and enables bidirectional sync — every edit you make in Lovable pushes automatically, and every push you make to GitHub pulls back into Lovable in real time.

> One connection per Lovable account. Reconnecting to a different account is done from **Workspace → Git settings**.

### Verify the sync

- The GitHub badge in the top-right of the Lovable editor turns green.
- Your new repo appears at `https://github.com/<you>/atlas-ai` with the full commit history.
- Push a README tweak from GitHub → watch it land in Lovable within seconds.

### Deploy the live site

Publishing the app itself (to `*.lovable.app` or a custom domain) is a separate one-click:

<div align="left">

**Editor → Publish (top-right) → Update**

</div>

Custom domains connect from **Project Settings → Domains** after the first publish.

---

## 🧪 Scripts

```bash
bun run dev        # Vite dev server on :8080
bun run build      # Production build (Cloudflare Workers target)
bun run typecheck  # tsgo strict typecheck
bun run lint       # ESLint
```

---

## 🤝 Contributing

Issues and PRs welcome. Please keep changes scoped and run `bun run typecheck` before pushing.

## 📄 License

MIT © Atlas AI — Built in Algiers, made for Algeria · Tunisia · Morocco. 🌍
