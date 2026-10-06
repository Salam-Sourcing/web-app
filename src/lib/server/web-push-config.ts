import { getSecret } from "astro:env/server";
const builds: Record<string, string | undefined> = {
  FIREBASE_WEB_API_KEY: import.meta.env.FIREBASE_WEB_API_KEY,
  FIREBASE_WEB_PROJECT_ID: import.meta.env.FIREBASE_WEB_PROJECT_ID,
  FIREBASE_WEB_SENDER_ID: import.meta.env.FIREBASE_WEB_SENDER_ID,
  FIREBASE_WEB_APP_ID: import.meta.env.FIREBASE_WEB_APP_ID,
  FIREBASE_WEB_VAPID_KEY: import.meta.env.FIREBASE_WEB_VAPID_KEY,
};
export function webPushConfig() {
  const v = (key: string) => getSecret(key) ?? builds[key] ?? "";
  const config = {
      apiKey: v("FIREBASE_WEB_API_KEY"),
      projectId: v("FIREBASE_WEB_PROJECT_ID"),
      messagingSenderId: v("FIREBASE_WEB_SENDER_ID"),
      appId: v("FIREBASE_WEB_APP_ID"),
    },
    vapidKey = v("FIREBASE_WEB_VAPID_KEY");
  const configured =
    /^[A-Za-z0-9_-]{20,}$/.test(config.apiKey) &&
    /^[a-z][a-z0-9-]{4,}$/.test(config.projectId) &&
    /^\d+$/.test(config.messagingSenderId) &&
    /^1:\d+:web:[a-f0-9]+$/.test(config.appId) &&
    /^[A-Za-z0-9_-]{80,}$/.test(vapidKey);
  return { configured, config, vapidKey };
}
