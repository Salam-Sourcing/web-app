import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://test.salamsourcing.com",
  output: "server",
  session: false,
  markdown: { syntaxHighlight: false },
  integrations: [react()],
  adapter: cloudflare(),
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' https://challenges.cloudflare.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://fcm.googleapis.com",
        "frame-src 'self' https://challenges.cloudflare.com",
      ],
      scriptDirective: {
        resources: ["'self'", "https://challenges.cloudflare.com"],
      },
      styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
    },
  },
  vite: { plugins: [tailwindcss()] },
});
