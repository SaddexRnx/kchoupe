import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/marketing/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas AI — Your AI Workforce for Commerce" },
      { name: "description", content: "Build, train, and deploy AI employees that sell, support, and grow your store 24/7. Made for North Africa first." },
      { property: "og:title", content: "Atlas AI — Your AI Workforce for Commerce" },
      { property: "og:description", content: "Build, train, and deploy AI employees that sell, support, and grow your store 24/7. Made for North Africa first." },
      { property: "og:url", content: "https://kchoupe.lovable.app/" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23445867-2acf-42b4-946f-3462dd592ae4/id-preview-0f20a806--86c5ba99-a6e0-476b-b368-c044198fac7a.lovable.app-1784634695109.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23445867-2acf-42b4-946f-3462dd592ae4/id-preview-0f20a806--86c5ba99-a6e0-476b-b368-c044198fac7a.lovable.app-1784634695109.png" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/" }],
  }),

  component: Landing,
});