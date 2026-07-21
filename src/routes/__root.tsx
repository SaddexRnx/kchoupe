import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { PreferencesProvider } from "@/lib/preferences";
import { ToastProvider } from "@/components/pages/_shared";
import { AutoTranslateProvider } from "@/lib/auto-translate";
import { PwaInstallPrompt } from "@/components/pwa-prompt";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Aurora orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="animate-float absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-accent/25 blur-3xl" style={{ animationDelay: "1.4s" }} />
        <div className="animate-float absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" style={{ animationDelay: "0.7s" }} />
      </div>
      <div className="glass-panel animate-scale-in relative z-10 w-full max-w-lg rounded-3xl p-10 text-center">
        <div className="animate-fade-up font-display text-[8rem] font-black leading-none tracking-tighter">
          <span className="aurora-gradient-text animate-gradient">404</span>
        </div>
        <h2 className="animate-fade-up mt-2 font-display text-2xl font-bold" style={{ animationDelay: "80ms" }}>
          You've drifted off the map
        </h2>
        <p className="animate-fade-up mt-3 text-sm text-muted-foreground" style={{ animationDelay: "160ms" }}>
          The page you're looking for doesn't exist, was renamed, or your AI employee is still learning that route.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap justify-center gap-2" style={{ animationDelay: "240ms" }}>
          <button
            onClick={() => history.back()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 active:scale-[0.98]"
          >
            ← Go back
          </button>
          <Link
            to="/"
            className="animate-glow inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]"
          >
            Take me home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KC — Your AI Workforce for Commerce" },
      { name: "description", content: "Build, train, and deploy AI employees that sell, support, and grow your store 24/7. Made for North Africa first." },
      { name: "author", content: "KC" },
      { property: "og:site_name", content: "KC" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "KC",
              url: "https://kchoupe.lovable.app",
              description: "AI workforce for North African commerce — trilingual AI employees that sell, support and grow your store 24/7.",
            },
            {
              "@type": "WebSite",
              name: "KC",
              url: "https://kchoupe.lovable.app",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="aurora" data-motion="on">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AutoTranslateProvider>
          <ToastProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <PwaInstallPrompt />
          </ToastProvider>
        </AutoTranslateProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
