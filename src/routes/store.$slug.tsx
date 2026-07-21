// Public storefront — anonymous browsers can view an enabled workspace's catalog.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const loadStorefront = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => i)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const c = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (u, i) => {
        const h = new Headers(i?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(u, { ...i, headers: h });
      }},
    });
    const { data: ws } = await c.from("public_storefronts").select("*").eq("slug", data.slug).maybeSingle();
    if (!ws) return null;
    const { data: prods } = await c.from("public_storefront_products")
      .select("id,name,description,price,currency,image_emoji,sku,stock,category")
      .eq("workspace_slug", data.slug).limit(200);
    return { ws, products: prods ?? [] };
  });

export const Route = createFileRoute("/store/$slug")({
  loader: async ({ params }) => {
    const res = await loadStorefront({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.ws.name} — Atlas Store` },
      { name: "description", content: loaderData.ws.storefront_tagline ?? `Shop ${loaderData.ws.name} online.` },
      { property: "og:title", content: `${loaderData.ws.name} — Atlas Store` },
      { property: "og:description", content: loaderData.ws.storefront_tagline ?? "" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] : [{ title: "Store" }],
  }),
  component: StorePage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <p className="text-muted-foreground mt-2">This storefront doesn't exist or isn't public yet.</p>
      </div>
    </div>
  ),
});

function StorePage() {
  const { ws, products } = Route.useLoaderData()!;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center gap-4">
          {ws.logo_url && <img src={ws.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />}
          <div>
            <h1 className="text-2xl font-bold">{ws.name}</h1>
            {ws.storefront_tagline && <p className="text-sm text-muted-foreground">{ws.storefront_tagline}</p>}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {products.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">No products available yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:-translate-y-0.5 transition">
                <div className="aspect-square rounded-xl bg-white/5 flex items-center justify-center text-5xl mb-3">{p.image_emoji || "📦"}</div>
                <div className="text-sm font-semibold line-clamp-2">{p.name}</div>
                {p.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="font-bold">{Number(p.price).toLocaleString()} {p.currency}</div>
                  {p.stock <= 0 ? (
                    <span className="text-[10px] uppercase tracking-wider text-amber-400">Out</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400">In stock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
        Powered by <a href="/" className="underline hover:text-foreground">Atlas AI</a>
      </footer>
    </div>
  );
}
