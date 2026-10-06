import { initializeApp, getApps } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import { post } from "./forms";
let messaging: ReturnType<typeof getMessaging> | undefined;
async function initialize(root: HTMLElement) {
  if (
    !isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    !(await isSupported())
  )
    throw new Error(
      "This browser does not support push here. On iPhone, use the HTTPS website added to your Home Screen.",
    );
  if (root.dataset.configured !== "true")
    throw new Error(
      "Browser notifications are awaiting Firebase web configuration.",
    );
  const config = JSON.parse(root.dataset.firebase!);
  messaging ??= getMessaging(getApps()[0] ?? initializeApp(config));
  const registration = await navigator.serviceWorker.register(
    "/push-worker.js",
    { scope: "/" },
  );
  await navigator.serviceWorker.ready;
  return { messaging, registration };
}
async function clearVisibleNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    for (const n of (await registration?.getNotifications()) ?? []) n.close();
  } catch {}
}
export function bindWebPush() {
  const root = document.querySelector<HTMLElement>("[data-web-push]");
  if (!root) return;
  const status = root.querySelector<HTMLElement>("[data-push-status]")!;
  const enabled = localStorage.getItem("salam-web-push-enabled") === "true";
  status.textContent =
    !root.dataset.configured || root.dataset.configured !== "true"
      ? "Browser notifications are awaiting configuration."
      : !isSecureContext
        ? "Use the HTTPS website to enable browser notifications."
        : typeof Notification === "undefined"
          ? "Notifications are unavailable in this browser."
          : Notification.permission === "denied"
            ? "Notifications are blocked in your browser settings."
            : enabled && Notification.permission === "granted"
              ? "Browser notifications are enabled on this device."
              : "Browser notifications are off.";
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-push-action]",
  ))
    button.addEventListener("click", async () => {
      const buttons = root.querySelectorAll<HTMLButtonElement>("button");
      buttons.forEach((b) => (b.disabled = true));
      status.setAttribute("role", "status");
      try {
        const action = button.dataset.pushAction;
        if (action === "disable") {
          await post("/api/push/unregister", {});
          localStorage.removeItem("salam-web-push-enabled");
          await clearVisibleNotifications();
          try {
            const m = await initialize(root);
            await deleteToken(m.messaging);
          } catch {}
          status.textContent = "Browser notifications disabled.";
        } else if (action === "test") {
          status.textContent = (await post("/api/push/test", {})).message!;
        } else {
          const ready = await initialize(root);
          // Request permission only following this explicit Enable interaction.
          const permission = await Notification.requestPermission();
          if (permission !== "granted")
            throw new Error(
              "Notification permission was not granted. You can still read updates in the notification center.",
            );
          const token = await getToken(ready.messaging, {
            vapidKey: root.dataset.vapid,
            serviceWorkerRegistration: ready.registration,
          });
          if (!token)
            throw new Error("Unable to register notifications. Please retry.");
          await post("/api/push/register", { token });
          localStorage.setItem("salam-web-push-enabled", "true");
          status.textContent = "Browser notifications enabled.";
        }
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : "Please retry.";
        status.setAttribute("role", "alert");
      } finally {
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  if (
    enabled &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    root.dataset.configured === "true"
  )
    initialize(root)
      .then(async (ready) => {
        const token = await getToken(ready.messaging, {
          vapidKey: root.dataset.vapid,
          serviceWorkerRegistration: ready.registration,
        });
        if (token) await post("/api/push/register", { token });
        onMessage(ready.messaging, () => {
          status.textContent = "A new message is available in Notifications.";
        });
      })
      .catch(() => {
        status.textContent =
          "Notification registration could not be refreshed. Enable again when connected.";
      });
}
