import type { APIRoute } from "astro";
import { publicPages, publicSite } from "../lib/server/seo";
export const GET: APIRoute = () => {
  const site = publicSite();
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    publicPages
      .map((path) => "<url><loc>" + site.origin + path + "</loc></url>")
      .join("") +
    "</urlset>";
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Robots-Tag": site.indexable ? "index" : "noindex",
    },
  });
};
