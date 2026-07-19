import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  MessageCircle,
  Mail,
  BookOpen,
  Users,
  Zap,
  CreditCard,
  Truck,
  Megaphone,
  BarChart3,
  Phone,
  X,
  Check,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Activity,
  Settings2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
} from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";

type Status = "connected" | "available" | "reauth" | "beta";

type Integration = {
  name: string;
  tag: string; // short tagline
  status: Status;
  usedBy?: string[]; // AI employee names
  accent: string; // gradient class
  initials: string;
};

type Category = {
  id: string;
  label: string;
  icon: typeof Plug;
  blurb: string;
  items: Integration[];
};

// AI employees available to assign — kept in sync with /ai-employees mock roster.
const EMPLOYEES = [
  { name: "Nova", role: "Sales Lead", emoji: "🚀" },
  { name: "Atlas", role: "Support Concierge", emoji: "🛎️" },
  { name: "Sage", role: "Onboarding Coach", emoji: "🌿" },
  { name: "Echo", role: "Marketing Analyst", emoji: "📡" },
  { name: "Orbit", role: "Product Advisor", emoji: "🪐" },
  { name: "Lumen", role: "Retention Specialist", emoji: "💡" },
];

// Default capabilities per category — shown in the details drawer.
const CATEGORY_CAPS: Record<string, string[]> = {
  commerce: ["Sync product catalog", "Read live inventory", "Create + fulfill orders", "Push draft carts", "Listen to order webhooks"],
  payments: ["Create checkout links", "Charge one-off + recurring", "Issue refunds", "Read payout history", "Listen to charge webhooks"],
  social: ["Read DMs, comments, mentions", "Reply as page/profile", "Fetch conversation history", "Trigger on new message", "Attach media"],
  email: ["Read inbox + threads", "Draft + send replies", "Apply labels / tags", "Attach files", "Trigger on new message"],
  crm: ["Create + update contacts", "Log deals + activities", "Sync pipeline stages", "Search records", "Attach notes from chats"],
  knowledge: ["Index docs + pages", "Chunk + embed on change", "Cite source in replies", "Refresh on schedule", "Respect access controls"],
  marketing: ["Draft campaigns", "Read audience segments", "Push metrics into chat", "Trigger on ad events", "Sync creative assets"],
  analytics: ["Read events + funnels", "Query cohorts", "Attach charts in replies", "Alert on anomalies", "Cross-source joins"],
  logistics: ["Fetch tracking status", "Estimate delivery ETA", "Book labels", "Notify on delay", "Attach POD"],
  voice: ["Place + receive calls", "Send SMS / MMS", "Transcribe voicemail", "Route by intent", "Log call summaries"],
  automation: ["Trigger workflows", "Send + receive webhooks", "Call custom endpoints", "Read/write shared vars", "Chain multi-step actions"],
};

// Editable settings shown in the drawer, per category. `secret: true` masks the
// value behind a reveal toggle. Values persist in component state only (mock).
type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  required?: boolean;
  help?: string;
};
const CATEGORY_FIELDS: Record<string, FieldDef[]> = {
  commerce: [
    { key: "storeUrl", label: "Store URL", placeholder: "https://your-shop.myshopify.com", required: true },
    { key: "apiKey", label: "API key", placeholder: "sk_live_…", secret: true, required: true },
    { key: "apiSecret", label: "API secret", placeholder: "shpss_…", secret: true },
    { key: "webhookSecret", label: "Webhook signing secret", placeholder: "whsec_…", secret: true, help: "Used to verify order + inventory webhooks." },
  ],
  payments: [
    { key: "publishableKey", label: "Publishable key", placeholder: "pk_live_…", required: true },
    { key: "secretKey", label: "Secret key", placeholder: "sk_live_…", secret: true, required: true },
    { key: "webhookSecret", label: "Webhook secret", placeholder: "whsec_…", secret: true },
  ],
  social: [
    { key: "pageId", label: "Page / account ID", placeholder: "1234567890", required: true },
    { key: "accessToken", label: "Access token", placeholder: "EAAG…", secret: true, required: true },
    { key: "verifyToken", label: "Webhook verify token", placeholder: "any random string", secret: true },
  ],
  email: [
    { key: "fromAddress", label: "From address", placeholder: "support@yourbrand.com", required: true },
    { key: "apiKey", label: "API key", placeholder: "SG.…", secret: true, required: true },
    { key: "signingDomain", label: "Signing domain", placeholder: "mail.yourbrand.com" },
  ],
  crm: [
    { key: "portalId", label: "Portal / org ID", placeholder: "26492834", required: true },
    { key: "apiKey", label: "Private app token", placeholder: "pat-na1-…", secret: true, required: true },
  ],
  knowledge: [
    { key: "workspace", label: "Workspace / drive", placeholder: "Atlas Wiki", required: true },
    { key: "apiKey", label: "Integration token", placeholder: "secret_…", secret: true, required: true },
    { key: "rootPath", label: "Root path (optional)", placeholder: "/handbook" },
  ],
  marketing: [
    { key: "accountId", label: "Ad account / list ID", placeholder: "act_123456", required: true },
    { key: "apiKey", label: "API key", placeholder: "pk-…", secret: true, required: true },
  ],
  analytics: [
    { key: "propertyId", label: "Property / project ID", placeholder: "GA4-123456789", required: true },
    { key: "serviceAccount", label: "Service account JSON", placeholder: "{ \"type\": \"service_account\", … }", secret: true, required: true },
  ],
  logistics: [
    { key: "accountNumber", label: "Carrier account", placeholder: "ACCT-4820", required: true },
    { key: "apiKey", label: "API key", placeholder: "live_…", secret: true, required: true },
  ],
  voice: [
    { key: "phoneNumber", label: "Phone number", placeholder: "+1 415 555 0132", required: true },
    { key: "accountSid", label: "Account SID", placeholder: "AC…", required: true },
    { key: "authToken", label: "Auth token", placeholder: "•••", secret: true, required: true },
  ],
  automation: [
    { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.example.com/…", required: true },
    { key: "signingSecret", label: "Signing secret", placeholder: "whsec_…", secret: true },
  ],
};

const CATEGORIES: Category[] = [
  {
    id: "commerce",
    label: "Shops & Commerce",
    icon: ShoppingBag,
    blurb: "Sync catalog, stock and orders so agents can quote, upsell and take checkout.",
    items: [
      { name: "Shopify", tag: "Storefront + Admin API", status: "connected", usedBy: ["Nova", "Atlas"], accent: "from-emerald-400 to-lime-300", initials: "SH" },
      { name: "WooCommerce", tag: "WordPress store", status: "available", accent: "from-violet-400 to-fuchsia-400", initials: "WC" },
      { name: "BigCommerce", tag: "Headless catalog", status: "available", accent: "from-sky-400 to-cyan-300", initials: "BC" },
      { name: "Magento / Adobe Commerce", tag: "Enterprise catalog", status: "available", accent: "from-orange-400 to-amber-300", initials: "MG" },
      { name: "PrestaShop", tag: "Open-source shop", status: "available", accent: "from-rose-400 to-pink-300", initials: "PS" },
      { name: "Squarespace Commerce", tag: "Sites + storefront", status: "available", accent: "from-zinc-300 to-white", initials: "SQ" },
      { name: "Wix Stores", tag: "Wix e-commerce", status: "available", accent: "from-blue-400 to-indigo-300", initials: "WX" },
      { name: "Ecwid by Lightspeed", tag: "Embeddable shop", status: "available", accent: "from-teal-400 to-emerald-300", initials: "EC" },
      { name: "Lightspeed Retail", tag: "POS + inventory", status: "available", accent: "from-red-400 to-rose-300", initials: "LS" },
      { name: "Square", tag: "POS + online", status: "available", accent: "from-neutral-200 to-neutral-400", initials: "SQ" },
      { name: "Etsy", tag: "Marketplace shop", status: "available", accent: "from-orange-400 to-amber-300", initials: "ET" },
      { name: "Amazon Seller", tag: "SP-API marketplace", status: "available", accent: "from-amber-400 to-yellow-300", initials: "AM" },
      { name: "eBay", tag: "Listings + orders", status: "available", accent: "from-red-400 to-yellow-300", initials: "EB" },
      { name: "Walmart Marketplace", tag: "US retailer", status: "available", accent: "from-blue-400 to-yellow-300", initials: "WM" },
      { name: "AliExpress / Alibaba", tag: "Dropship supply", status: "available", accent: "from-orange-500 to-red-400", initials: "AL" },
      { name: "TikTok Shop", tag: "Social commerce", status: "beta", accent: "from-pink-400 to-cyan-300", initials: "TS" },
      { name: "Instagram Shopping", tag: "IG product tags", status: "beta", accent: "from-pink-400 to-orange-300", initials: "IG" },
      { name: "Facebook Shop", tag: "Meta commerce", status: "available", accent: "from-blue-400 to-sky-300", initials: "FB" },
      { name: "Google Merchant Center", tag: "Shopping feed", status: "available", accent: "from-yellow-400 to-red-300", initials: "GM" },
      { name: "Shopware", tag: "EU headless", status: "available", accent: "from-sky-400 to-blue-500", initials: "SW" },
      { name: "Salla", tag: "MENA storefronts", status: "available", accent: "from-fuchsia-400 to-rose-300", initials: "SL" },
      { name: "Zid", tag: "MENA commerce", status: "available", accent: "from-violet-400 to-blue-400", initials: "ZD" },
      { name: "Bonanza", tag: "Marketplace", status: "available", accent: "from-emerald-400 to-teal-300", initials: "BZ" },
      { name: "Rakuten", tag: "JP marketplace", status: "available", accent: "from-red-400 to-rose-500", initials: "RK" },
      { name: "Mercado Libre", tag: "LATAM marketplace", status: "available", accent: "from-yellow-400 to-blue-400", initials: "ML" },
    ],
  },
  {
    id: "payments",
    label: "Payments & Checkout",
    icon: CreditCard,
    blurb: "Charge cards, subscriptions and links so agents can close a sale in-chat.",
    items: [
      { name: "Stripe", tag: "Cards + subscriptions", status: "connected", usedBy: ["Nova"], accent: "from-indigo-400 to-purple-300", initials: "ST" },
      { name: "PayPal", tag: "Global wallet", status: "available", accent: "from-sky-400 to-blue-500", initials: "PP" },
      { name: "Adyen", tag: "Enterprise gateway", status: "available", accent: "from-emerald-400 to-teal-300", initials: "AD" },
      { name: "Klarna", tag: "Buy now pay later", status: "available", accent: "from-pink-300 to-rose-300", initials: "KL" },
      { name: "Afterpay", tag: "BNPL", status: "available", accent: "from-emerald-300 to-lime-300", initials: "AP" },
      { name: "Apple Pay", tag: "Wallet checkout", status: "available", accent: "from-neutral-200 to-neutral-400", initials: "AP" },
      { name: "Google Pay", tag: "Wallet checkout", status: "available", accent: "from-blue-400 to-emerald-300", initials: "GP" },
      { name: "Razorpay", tag: "India payments", status: "available", accent: "from-blue-500 to-cyan-300", initials: "RP" },
      { name: "Mollie", tag: "EU payments", status: "available", accent: "from-rose-400 to-pink-300", initials: "MO" },
      { name: "Paddle", tag: "Merchant of record", status: "available", accent: "from-amber-400 to-orange-300", initials: "PD" },
      { name: "Tap Payments", tag: "MENA cards", status: "available", accent: "from-emerald-400 to-cyan-300", initials: "TP" },
      { name: "HyperPay", tag: "MENA gateway", status: "available", accent: "from-blue-500 to-indigo-400", initials: "HP" },
    ],
  },
  {
    id: "social",
    label: "Social & Messaging",
    icon: MessageCircle,
    blurb: "Reply to DMs, comments and threads wherever your customers hang out.",
    items: [
      { name: "Instagram", tag: "DMs, comments, stories", status: "connected", usedBy: ["Nova", "Sage"], accent: "from-pink-400 to-orange-300", initials: "IG" },
      { name: "Facebook Pages", tag: "Messenger + posts", status: "connected", usedBy: ["Nova"], accent: "from-blue-500 to-sky-300", initials: "FB" },
      { name: "Facebook Messenger", tag: "1:1 chat", status: "available", accent: "from-sky-400 to-indigo-400", initials: "MS" },
      { name: "WhatsApp Business", tag: "Cloud API", status: "reauth", usedBy: ["Atlas"], accent: "from-emerald-400 to-green-300", initials: "WA" },
      { name: "X (Twitter)", tag: "Posts, DMs, mentions", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "X" },
      { name: "TikTok", tag: "DMs + comments", status: "available", accent: "from-pink-400 to-cyan-300", initials: "TT" },
      { name: "YouTube", tag: "Comments + community", status: "available", accent: "from-red-500 to-rose-400", initials: "YT" },
      { name: "LinkedIn", tag: "Pages + InMail", status: "available", accent: "from-sky-500 to-blue-400", initials: "IN" },
      { name: "Snapchat", tag: "Snap ads + chat", status: "available", accent: "from-yellow-300 to-amber-300", initials: "SC" },
      { name: "Pinterest", tag: "Pins + inbox", status: "available", accent: "from-rose-500 to-red-400", initials: "PT" },
      { name: "Reddit", tag: "Subreddits + DMs", status: "available", accent: "from-orange-500 to-red-400", initials: "RD" },
      { name: "Discord", tag: "Community servers", status: "connected", usedBy: ["Sage"], accent: "from-indigo-400 to-violet-400", initials: "DC" },
      { name: "Slack", tag: "Team channels", status: "connected", usedBy: ["Atlas"], accent: "from-fuchsia-400 to-rose-300", initials: "SL" },
      { name: "Telegram", tag: "Bots + groups", status: "available", accent: "from-sky-400 to-cyan-300", initials: "TG" },
      { name: "Signal", tag: "Private messaging", status: "beta", accent: "from-indigo-400 to-blue-500", initials: "SG" },
      { name: "Line", tag: "JP/TW/TH chat", status: "available", accent: "from-green-400 to-emerald-300", initials: "LN" },
      { name: "KakaoTalk", tag: "Korea chat", status: "available", accent: "from-yellow-300 to-amber-400", initials: "KK" },
      { name: "WeChat", tag: "China messaging", status: "available", accent: "from-green-500 to-emerald-400", initials: "WC" },
      { name: "Viber", tag: "Business messages", status: "available", accent: "from-violet-400 to-purple-400", initials: "VB" },
      { name: "Twitch", tag: "Streams + chat", status: "available", accent: "from-violet-500 to-purple-400", initials: "TW" },
      { name: "Mastodon", tag: "Fediverse posts", status: "available", accent: "from-indigo-400 to-sky-400", initials: "MA" },
      { name: "Bluesky", tag: "AT proto", status: "available", accent: "from-sky-300 to-blue-400", initials: "BS" },
      { name: "Threads", tag: "Meta text app", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "TH" },
    ],
  },
  {
    id: "email",
    label: "Email & Support",
    icon: Mail,
    blurb: "Triage inboxes and tickets, and reply with brand-safe drafts.",
    items: [
      { name: "Gmail", tag: "Google Workspace", status: "connected", usedBy: ["Atlas"], accent: "from-red-400 to-yellow-300", initials: "GM" },
      { name: "Outlook", tag: "Microsoft 365", status: "available", accent: "from-blue-500 to-sky-300", initials: "OL" },
      { name: "Yahoo Mail", tag: "IMAP inbox", status: "available", accent: "from-violet-500 to-purple-400", initials: "YM" },
      { name: "IMAP / SMTP", tag: "Any mailbox", status: "available", accent: "from-neutral-300 to-neutral-500", initials: "IM" },
      { name: "Zendesk", tag: "Ticket support", status: "available", accent: "from-emerald-400 to-teal-300", initials: "ZD" },
      { name: "Intercom", tag: "Messenger + inbox", status: "connected", usedBy: ["Nova"], accent: "from-sky-400 to-blue-500", initials: "IC" },
      { name: "Freshdesk", tag: "Helpdesk", status: "available", accent: "from-emerald-400 to-lime-300", initials: "FD" },
      { name: "Help Scout", tag: "Shared inbox", status: "available", accent: "from-indigo-400 to-blue-400", initials: "HS" },
      { name: "Front", tag: "Team email", status: "available", accent: "from-violet-400 to-purple-400", initials: "FR" },
      { name: "Gorgias", tag: "E-com support", status: "available", accent: "from-pink-400 to-rose-300", initials: "GO" },
      { name: "Crisp", tag: "Live chat", status: "available", accent: "from-blue-500 to-cyan-300", initials: "CR" },
      { name: "Tidio", tag: "Chat + bot", status: "available", accent: "from-sky-400 to-indigo-400", initials: "TD" },
    ],
  },
  {
    id: "crm",
    label: "CRM & Sales",
    icon: Users,
    blurb: "Push leads, deals and notes so nothing your agents learn is lost.",
    items: [
      { name: "HubSpot", tag: "CRM + marketing", status: "connected", usedBy: ["Atlas"], accent: "from-orange-500 to-amber-300", initials: "HS" },
      { name: "Salesforce", tag: "Enterprise CRM", status: "available", accent: "from-sky-400 to-blue-500", initials: "SF" },
      { name: "Pipedrive", tag: "Sales pipeline", status: "available", accent: "from-emerald-400 to-green-300", initials: "PD" },
      { name: "Zoho CRM", tag: "SMB CRM", status: "available", accent: "from-rose-400 to-red-300", initials: "ZO" },
      { name: "Attio", tag: "Modern CRM", status: "beta", accent: "from-neutral-200 to-neutral-500", initials: "AT" },
      { name: "Close", tag: "Inside sales", status: "available", accent: "from-emerald-400 to-teal-300", initials: "CL" },
      { name: "Copper", tag: "Google CRM", status: "available", accent: "from-orange-400 to-yellow-300", initials: "CP" },
      { name: "Freshsales", tag: "Sales CRM", status: "available", accent: "from-emerald-400 to-lime-300", initials: "FS" },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge & Docs",
    icon: BookOpen,
    blurb: "Feed the knowledge base so agents answer with facts, not vibes.",
    items: [
      { name: "Notion", tag: "Docs + wiki", status: "connected", usedBy: ["Sage"], accent: "from-neutral-200 to-neutral-500", initials: "NT" },
      { name: "Google Drive", tag: "Docs + Sheets", status: "connected", usedBy: ["Sage"], accent: "from-yellow-400 to-blue-400", initials: "GD" },
      { name: "OneDrive / SharePoint", tag: "Microsoft files", status: "available", accent: "from-blue-500 to-sky-400", initials: "OD" },
      { name: "Dropbox", tag: "File sync", status: "available", accent: "from-sky-400 to-blue-500", initials: "DB" },
      { name: "Confluence", tag: "Atlassian wiki", status: "available", accent: "from-sky-400 to-indigo-400", initials: "CF" },
      { name: "GitBook", tag: "Product docs", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "GB" },
      { name: "Web crawler", tag: "Your website", status: "connected", accent: "from-emerald-400 to-teal-300", initials: "WW" },
      { name: "Sitemap import", tag: "XML sitemap", status: "available", accent: "from-violet-400 to-purple-400", initials: "SM" },
      { name: "Airtable", tag: "Ops databases", status: "available", accent: "from-yellow-400 to-amber-300", initials: "AT" },
      { name: "Coda", tag: "Docs + tables", status: "available", accent: "from-rose-400 to-red-300", initials: "CD" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Ads",
    icon: Megaphone,
    blurb: "Draft campaigns, publish content, and let agents react to ad performance.",
    items: [
      { name: "Meta Ads", tag: "FB + IG ads", status: "available", accent: "from-blue-500 to-sky-300", initials: "MA" },
      { name: "Google Ads", tag: "Search + PMax", status: "available", accent: "from-yellow-400 to-red-300", initials: "GA" },
      { name: "TikTok Ads", tag: "Video ads", status: "available", accent: "from-pink-400 to-cyan-300", initials: "TA" },
      { name: "Snapchat Ads", tag: "AR + video", status: "available", accent: "from-yellow-300 to-amber-300", initials: "SA" },
      { name: "Pinterest Ads", tag: "Idea + pin ads", status: "available", accent: "from-rose-500 to-red-400", initials: "PA" },
      { name: "LinkedIn Ads", tag: "B2B campaigns", status: "available", accent: "from-sky-500 to-blue-400", initials: "LA" },
      { name: "Mailchimp", tag: "Email marketing", status: "available", accent: "from-yellow-400 to-amber-300", initials: "MC" },
      { name: "Klaviyo", tag: "E-com email + SMS", status: "connected", usedBy: ["Nova"], accent: "from-neutral-200 to-neutral-500", initials: "KL" },
      { name: "Sendgrid", tag: "Transactional email", status: "available", accent: "from-sky-400 to-blue-500", initials: "SG" },
      { name: "Postmark", tag: "Transactional email", status: "available", accent: "from-yellow-400 to-orange-300", initials: "PM" },
      { name: "Buffer", tag: "Social scheduling", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "BF" },
      { name: "Hootsuite", tag: "Social publisher", status: "available", accent: "from-yellow-400 to-amber-300", initials: "HT" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & Data",
    icon: BarChart3,
    blurb: "Give agents context: traffic, funnels, revenue, cohorts.",
    items: [
      { name: "Google Analytics 4", tag: "Web analytics", status: "connected", accent: "from-yellow-400 to-orange-300", initials: "GA" },
      { name: "Mixpanel", tag: "Product analytics", status: "available", accent: "from-violet-400 to-purple-400", initials: "MX" },
      { name: "Amplitude", tag: "Behavior analytics", status: "available", accent: "from-sky-400 to-blue-500", initials: "AM" },
      { name: "PostHog", tag: "Open product analytics", status: "available", accent: "from-orange-400 to-red-300", initials: "PH" },
      { name: "Segment", tag: "CDP", status: "available", accent: "from-emerald-400 to-teal-300", initials: "SG" },
      { name: "Snowflake", tag: "Warehouse", status: "available", accent: "from-sky-400 to-cyan-300", initials: "SF" },
      { name: "BigQuery", tag: "GCP warehouse", status: "available", accent: "from-blue-500 to-sky-300", initials: "BQ" },
      { name: "Looker Studio", tag: "Dashboards", status: "available", accent: "from-yellow-400 to-red-300", initials: "LS" },
    ],
  },
  {
    id: "logistics",
    label: "Shipping & Fulfillment",
    icon: Truck,
    blurb: "Track parcels and let agents answer 'where is my order?' correctly.",
    items: [
      { name: "ShipStation", tag: "Multi-carrier ship", status: "available", accent: "from-sky-400 to-blue-500", initials: "SS" },
      { name: "Shippo", tag: "Rates + labels", status: "available", accent: "from-violet-400 to-purple-400", initials: "SH" },
      { name: "EasyPost", tag: "Shipping API", status: "available", accent: "from-emerald-400 to-teal-300", initials: "EP" },
      { name: "AfterShip", tag: "Delivery tracking", status: "connected", accent: "from-neutral-200 to-neutral-500", initials: "AS" },
      { name: "DHL", tag: "Global carrier", status: "available", accent: "from-yellow-400 to-red-400", initials: "DH" },
      { name: "FedEx", tag: "Global carrier", status: "available", accent: "from-violet-400 to-orange-300", initials: "FX" },
      { name: "UPS", tag: "Global carrier", status: "available", accent: "from-amber-400 to-yellow-300", initials: "UP" },
      { name: "USPS", tag: "US postal", status: "available", accent: "from-blue-500 to-red-300", initials: "US" },
      { name: "Aramex", tag: "MENA carrier", status: "available", accent: "from-red-400 to-rose-500", initials: "AR" },
      { name: "SMSA", tag: "KSA carrier", status: "available", accent: "from-emerald-400 to-lime-300", initials: "SM" },
    ],
  },
  {
    id: "voice",
    label: "Voice & Telephony",
    icon: Phone,
    blurb: "Route calls and voicemails through AI agents.",
    items: [
      { name: "Twilio", tag: "SMS + voice API", status: "connected", usedBy: ["Atlas"], accent: "from-red-400 to-rose-300", initials: "TW" },
      { name: "Vonage", tag: "Voice + video", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "VN" },
      { name: "MessageBird", tag: "Omnichannel", status: "available", accent: "from-sky-400 to-blue-500", initials: "MB" },
      { name: "Aircall", tag: "Cloud phone", status: "available", accent: "from-emerald-400 to-teal-300", initials: "AC" },
      { name: "RingCentral", tag: "Business phone", status: "available", accent: "from-orange-400 to-red-400", initials: "RC" },
      { name: "Zoom Phone", tag: "Meetings + calls", status: "available", accent: "from-sky-400 to-blue-500", initials: "ZM" },
    ],
  },
  {
    id: "automation",
    label: "Automation & Dev",
    icon: Zap,
    blurb: "Wire anything else via webhooks, Zapier or your own APIs.",
    items: [
      { name: "Zapier", tag: "6k+ apps", status: "connected", accent: "from-orange-500 to-red-400", initials: "ZP" },
      { name: "Make (Integromat)", tag: "Visual automations", status: "available", accent: "from-violet-400 to-purple-400", initials: "MK" },
      { name: "n8n", tag: "Self-host workflows", status: "available", accent: "from-rose-400 to-red-300", initials: "N8" },
      { name: "Pipedream", tag: "Serverless workflows", status: "available", accent: "from-emerald-400 to-teal-300", initials: "PD" },
      { name: "Webhooks", tag: "Custom endpoints", status: "connected", accent: "from-neutral-200 to-neutral-500", initials: "WH" },
      { name: "REST / GraphQL API", tag: "Custom API", status: "available", accent: "from-sky-400 to-blue-500", initials: "AP" },
      { name: "GitHub", tag: "Issues + PRs", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "GH" },
      { name: "GitLab", tag: "DevOps", status: "available", accent: "from-orange-400 to-red-300", initials: "GL" },
      { name: "Linear", tag: "Product tracker", status: "available", accent: "from-indigo-400 to-violet-400", initials: "LN" },
      { name: "Jira", tag: "Atlassian tracker", status: "available", accent: "from-sky-400 to-blue-500", initials: "JR" },
      { name: "Notion Automations", tag: "Notion triggers", status: "available", accent: "from-neutral-200 to-neutral-500", initials: "NA" },
    ],
  },
];

function statusChip(s: Status) {
  if (s === "connected") return <Chip tone="emerald"><CheckCircle2 className="h-3 w-3" /> Connected</Chip>;
  if (s === "reauth") return <Chip tone="amber"><AlertTriangle className="h-3 w-3" /> Re-auth</Chip>;
  if (s === "beta") return <Chip tone="violet"><Sparkles className="h-3 w-3" /> Beta</Chip>;
  return <Chip tone="muted">Available</Chip>;
}

export function IntegrationsPage() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [assignments, setAssignments] = useState<Record<string, string[]>>(() => {
    const seed: Record<string, string[]> = {};
    CATEGORIES.forEach((c) =>
      c.items.forEach((i) => {
        seed[i.name] = i.usedBy ? [...i.usedBy] : [];
      })
    );
    return seed;
  });
  const [editing, setEditing] = useState<{ integration: Integration; categoryId: string } | null>(null);

  const toggleEmployee = (integration: string, employee: string) => {
    setAssignments((prev) => {
      const cur = prev[integration] ?? [];
      const next = cur.includes(employee)
        ? cur.filter((n) => n !== employee)
        : [...cur, employee];
      return { ...prev, [integration]: next };
    });
  };

  const totals = useMemo(() => {
    const all = CATEGORIES.flatMap((c) => c.items);
    return {
      total: all.length,
      connected: all.filter((i) => i.status === "connected").length,
      reauth: all.filter((i) => i.status === "reauth").length,
      categories: CATEGORIES.length,
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.map((c) => ({
      ...c,
      items: c.items.filter(
        (i) =>
          (activeCat === "all" || activeCat === c.id) &&
          (q === "" || i.name.toLowerCase().includes(q) || i.tag.toLowerCase().includes(q))
      ),
    })).filter((c) => c.items.length > 0);
  }, [query, activeCat]);

  return (
    <>
      <PageHeader
        eyebrow="Integrations"
        title="Plug Atlas into everything you run"
        description="Connect shops, socials, inboxes, CRMs, warehouses and automations. Your AI employees inherit every connection instantly."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30">
            <Plug className="h-4 w-4" /> Request integration
          </button>
        }
      />

      {/* Stats bento */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Panel>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Available</div>
          <div className="mt-1 font-display text-3xl font-bold">{totals.total}+</div>
          <div className="text-xs text-muted-foreground">across {totals.categories} categories</div>
        </Panel>
        <Panel>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Connected</div>
          <div className="mt-1 font-display text-3xl font-bold text-emerald-300">{totals.connected}</div>
          <div className="text-xs text-muted-foreground">live in your workspace</div>
        </Panel>
        <Panel>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Needs re-auth</div>
          <div className="mt-1 font-display text-3xl font-bold text-amber-300">{totals.reauth}</div>
          <div className="text-xs text-muted-foreground">tokens expiring soon</div>
        </Panel>
        <Panel className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Aurora tip</div>
          <div className="mt-1 text-sm">
            Connect <span className="text-foreground">WhatsApp</span> to give Nova a
            <span className="text-foreground"> 3.4× </span> reply lift.
          </div>
        </Panel>
      </div>

      {/* Search + category tabs */}
      <Panel className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 150+ integrations…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CategoryPill label="All" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
            {CATEGORIES.map((c) => (
              <CategoryPill
                key={c.id}
                label={c.label}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              />
            ))}
          </div>
        </div>
      </Panel>

      <div className="space-y-8">
        {filtered.map((c) => {
          const Icon = c.icon;
          return (
            <section key={c.id} className="animate-fade-up">
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 animate-float">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="font-display text-xl font-semibold">{c.label}</h2>
                    <span className="text-xs text-muted-foreground">· {c.items.length}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {c.items.map((i, idx) => (
                  <IntegrationCard
                    key={c.id + i.name}
                    i={i}
                    index={idx}
                    usedBy={assignments[i.name] ?? []}
                    onOpen={() => setEditing({ integration: i, categoryId: c.id })}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <Panel className="text-center text-sm text-muted-foreground">
            No integrations match “{query}”. Try another name or clear filters.
          </Panel>
        )}
      </div>

      {editing && (
        <IntegrationDrawer
          integration={editing.integration}
          categoryId={editing.categoryId}
          selected={assignments[editing.integration.name] ?? []}
          onToggle={(emp) => toggleEmployee(editing.integration.name, emp)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-primary/40 bg-gradient-to-r from-primary/20 to-accent/10 text-foreground"
          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

function IntegrationCard({
  i,
  index = 0,
  usedBy,
  onOpen,
}: {
  i: Integration;
  index?: number;
  usedBy: string[];
  onOpen: () => void;
}) {
  const isConnected = i.status === "connected";
  return (
    <button
      onClick={onOpen}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className="glass-panel card-sheen animate-fade-up group relative flex h-full flex-col overflow-hidden rounded-2xl p-0 text-left transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
    >
      {/* accent band */}
      <div className={"h-1 w-full bg-gradient-to-r animate-gradient " + i.accent} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-neutral-900 shadow-lg ring-1 ring-white/10 transition duration-300 group-hover:scale-110 group-hover:-rotate-3 " +
                i.accent
              }
            >
              {i.initials}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold leading-tight">{i.name}</div>
              <div className="truncate text-xs text-muted-foreground">{i.tag}</div>
            </div>
          </div>
          <div className="shrink-0">{statusChip(i.status)}</div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
          {usedBy.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {usedBy.slice(0, 4).map((u) => (
                  <span
                    key={u}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-gradient-to-br from-primary to-accent text-[10px] font-semibold text-primary-foreground"
                    title={u}
                  >
                    {u[0]}
                  </span>
                ))}
              </div>
              {usedBy.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{usedBy.length - 4}</span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">No employees assigned</span>
          )}
          <span
            className={
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
              (isConnected
                ? "bg-white/5 text-foreground group-hover:bg-white/10"
                : "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/20")
            }
          >
            {isConnected ? "Details" : i.status === "reauth" ? "Reconnect" : "Connect"}
          </span>
        </div>
      </div>
    </button>
  );
}

type TestState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "ok"; latency: number; at: string }
  | { phase: "fail"; message: string; at: string };

type ReauthState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "done"; at: string };

function IntegrationDrawer({
  integration,
  categoryId,
  selected,
  onToggle,
  onClose,
}: {
  integration: Integration;
  categoryId: string;
  selected: string[];
  onToggle: (employee: string) => void;
  onClose: () => void;
}) {
  const [test, setTest] = useState<TestState>({ phase: "idle" });
  const fields = CATEGORY_FIELDS[categoryId] ?? [
    { key: "apiKey", label: "API key", placeholder: "sk_live_…", secret: true, required: true },
  ];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        integration.status === "connected" || integration.status === "reauth"
          ? f.secret
            ? "••••••••••••" + integration.initials
            : f.key === "storeUrl"
            ? "https://" + integration.name.toLowerCase().replace(/\s+/g, "-") + ".example.com"
            : "atlas-" + integration.initials.toLowerCase()
          : "",
      ])
    )
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [reauth, setReauth] = useState<ReauthState>({ phase: "idle" });
  const [statusOverride, setStatusOverride] = useState<Status | null>(null);
  const status = statusOverride ?? integration.status;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runTest = () => {
    setTest({ phase: "running" });
    // Mock latency 700-1800ms; reauth cards deterministically fail.
    const latency = Math.round(700 + Math.random() * 1100);
    window.setTimeout(() => {
      const at = new Date().toLocaleTimeString();
      if (status === "reauth") {
        setTest({ phase: "fail", message: "Token expired — reconnect required.", at });
      } else if (status === "available") {
        setTest({ phase: "fail", message: "Not connected yet — connect first.", at });
      } else {
        setTest({ phase: "ok", latency, at });
      }
    }, latency);
  };

  const runReauth = () => {
    setReauth({ phase: "running" });
    window.setTimeout(() => {
      setReauth({ phase: "done", at: new Date().toLocaleTimeString() });
      setStatusOverride("connected");
    }, 1400);
  };

  const saveSettings = () => {
    setSavedAt(new Date().toLocaleTimeString());
    setDirty(false);
  };

  const missingRequired = fields.some((f) => f.required && !values[f.key]?.trim());

  const caps = CATEGORY_CAPS[categoryId] ?? ["Read data", "Write data", "Listen to events"];
  const isConnected = status === "connected";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="glass-panel h-full w-full max-w-md overflow-y-auto rounded-none border-l border-white/10 p-0 shadow-2xl md:max-w-lg animate-drawer-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          <div className={"h-24 w-full bg-gradient-to-br opacity-40 " + integration.accent} />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-background/60 text-muted-foreground backdrop-blur hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="-mt-8 flex items-end gap-3 px-6">
            <div
              className={
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-neutral-900 shadow-xl ring-2 ring-background " +
                integration.accent
              }
            >
              {integration.initials}
            </div>
            <div className="min-w-0 pb-1">
              <div className="font-display text-xl font-semibold leading-tight">
                {integration.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">{integration.tag}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 px-6">
            {statusChip(status)}
            <Chip tone="muted">
              <ShieldCheck className="h-3 w-3" /> OAuth 2.0
            </Chip>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Capabilities */}
          <section>
            <SectionTitle icon={Zap}>Capabilities</SectionTitle>
            <ul className="mt-2 grid grid-cols-1 gap-1.5">
              {caps.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Integration settings */}
          <section>
            <div className="flex items-center justify-between">
              <SectionTitle icon={Settings2}>Integration settings</SectionTitle>
              {status === "reauth" && (
                <Chip tone="amber">
                  <AlertTriangle className="h-3 w-3" /> Re-auth needed
                </Chip>
              )}
            </div>
            <div className="mt-2 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              {fields.map((f) => {
                const show = !f.secret || revealed[f.key];
                const val = values[f.key] ?? "";
                const missing = f.required && !val.trim();
                return (
                  <div key={f.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {f.label}
                        {f.required && <span className="ml-1 text-amber-300">*</span>}
                      </label>
                      {f.secret && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealed((r) => ({ ...r, [f.key]: !r[f.key] }))
                          }
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {show ? (
                            <><EyeOff className="h-3 w-3" /> Hide</>
                          ) : (
                            <><Eye className="h-3 w-3" /> Reveal</>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      type={f.secret && !show ? "password" : "text"}
                      value={val}
                      placeholder={f.placeholder}
                      onChange={(e) => {
                        setValues((v) => ({ ...v, [f.key]: e.target.value }));
                        setDirty(true);
                        setSavedAt(null);
                      }}
                      className={
                        "w-full rounded-lg border bg-background/40 px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 " +
                        (missing ? "border-amber-400/40" : "border-white/10")
                      }
                    />
                    {f.help && (
                      <div className="mt-1 text-[10px] text-muted-foreground">{f.help}</div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                <div className="text-[11px] text-muted-foreground">
                  {savedAt
                    ? "Saved · " + savedAt
                    : dirty
                    ? "Unsaved changes"
                    : missingRequired
                    ? "Required fields missing"
                    : "All good"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runReauth}
                    disabled={reauth.phase === "running"}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {reauth.phase === "running" ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-authorizing…</>
                    ) : (
                      <><RefreshCw className="h-3.5 w-3.5" /> Re-authorize</>
                    )}
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={!dirty || missingRequired}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
              {reauth.phase === "done" && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Re-authorized · {reauth.at}
                </div>
              )}
            </div>
          </section>

          {/* Test connection */}
          <section>
            <SectionTitle icon={Activity}>Test connection</SectionTitle>
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Ping the {integration.name} sandbox and time the round-trip.
                </div>
                <button
                  onClick={runTest}
                  disabled={test.phase === "running"}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition disabled:opacity-60"
                >
                  {test.phase === "running" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing…
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" /> Run test
                    </>
                  )}
                </button>
              </div>
              <div className="mt-3 min-h-[46px] rounded-lg border border-white/5 bg-background/40 p-3 text-xs">
                {test.phase === "idle" && (
                  <span className="text-muted-foreground">No tests yet — click Run test to ping.</span>
                )}
                {test.phase === "running" && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Establishing handshake…
                  </span>
                )}
                {test.phase === "ok" && (
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-medium">Success</span>
                    <span className="text-muted-foreground">
                      · {test.latency}ms · {test.at}
                    </span>
                  </div>
                )}
                {test.phase === "fail" && (
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-medium">Failed</span>
                    <span className="text-muted-foreground">· {test.message} · {test.at}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Assign employees */}
          <section>
            <SectionTitle icon={Users}>AI employees using this</SectionTitle>
            <div className="mt-2 space-y-1.5">
              {EMPLOYEES.map((e) => {
                const on = selected.includes(e.name);
                return (
                  <button
                    key={e.name}
                    onClick={() => onToggle(e.name)}
                    className={
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition " +
                      (on
                        ? "border-primary/40 bg-gradient-to-r from-primary/15 to-accent/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10")
                    }
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-lg">
                      {e.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{e.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{e.role}</div>
                    </div>
                    <div
                      className={
                        "flex h-5 w-5 items-center justify-center rounded-md border transition " +
                        (on
                          ? "border-primary bg-gradient-to-br from-primary to-accent text-primary-foreground"
                          : "border-white/20 bg-transparent")
                      }
                    >
                      {on && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {selected.length} of {EMPLOYEES.length} assigned
            </div>
          </section>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" /> Read docs
            </button>
            <button
              className={
                "rounded-lg px-4 py-2 text-xs font-semibold transition " +
                (isConnected
                  ? "border border-white/10 bg-white/5 text-foreground hover:bg-white/10"
                  : "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/20")
              }
            >
              {isConnected
                ? "Disconnect"
                : integration.status === "reauth"
                ? "Reconnect"
                : "Connect " + integration.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Zap;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </div>
  );
}