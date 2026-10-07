import { serverConfig } from "./config";
export const publicPages = [
  "/",
  "/platform",
  "/buyers",
  "/vendors",
  "/get-the-app",
  "/about",
  "/plans",
  "/verification",
  "/help",
  "/terms",
  "/privacy",
];
export function publicSite() {
  const origin = new URL(serverConfig().siteUrl).origin;
  return {
    origin,
    indexable: ["salamsourcing.com", "www.salamsourcing.com"].includes(
      new URL(origin).hostname,
    ),
  };
}
