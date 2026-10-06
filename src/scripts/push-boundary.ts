async function clearVisibleNotifications() {
  try {
    const r = await navigator.serviceWorker?.getRegistration("/");
    for (const n of (await r?.getNotifications()) ?? []) n.close();
  } catch {}
}
export function bindPushLogout() {
  const clear = () => {
    try {
      localStorage.removeItem("salam-web-push-enabled");
    } catch {}
    void clearVisibleNotifications();
  };
  window.addEventListener("salam-logout", clear);
  if (!("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel("salam-account-boundary");
  channel.addEventListener("message", (event) => {
    if (event.data?.kind === "logout") clear();
  });
}
