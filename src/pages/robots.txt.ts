import type { APIRoute } from "astro";
import { publicSite } from "../lib/server/seo";
import { privateRoots } from "../lib/routes";
export const GET: APIRoute = () => {
  const site = publicSite();
  const lines = site.indexable
    ? [
        "User-agent: *",
        ...privateRoots.map((root) => "Disallow: /" + root),
        ...[
          "api",
          "auth",
          "login",
          "signup",
          "forgot-password",
          "verify-email",
          "app",
        ].map((root) => "Disallow: /" + root),
        "Sitemap: " + site.origin + "/sitemap.xml",
      ]
    : ["User-agent: *", "Disallow: /"];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
