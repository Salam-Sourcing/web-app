/* Generic notifications only; current cookie/session and stored RLS row must
 * still match the payload before displaying or opening an update. */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const payload = event.data?.json(),
          data = payload?.data;
        if (
          data?.type !== "new_message" ||
          !/^\d+$/.test(data.notification_id ?? "")
        )
          return;
        const response = await fetch("/api/push/validate", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.notification_id }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return;
        const current = await response.json();
        if (
          current.user_id !== data.recipient_user_id ||
          current.session_id !== data.recipient_session_id
        )
          return;
        await self.registration.showNotification(
          current.is_test ? "Push notification test" : "New message",
          {
            body: current.is_test
              ? "Your Salam Sourcing B2B Marketplace message notifications are working."
              : "Open Salam Sourcing B2B Marketplace to view your messages.",
            icon: "/images/salam-sourcing.png",
            tag: "salam-" + data.notification_id,
            data: {
              id: data.notification_id,
              user_id: current.user_id,
              session_id: current.session_id,
            },
          },
        );
      } catch {
        /* Offline, expired and logged-out recipients receive no stale display. */
      }
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const data = event.notification.data;
      if (!/^\d+$/.test(data?.id ?? "")) return;
      try {
        const response = await fetch("/api/push/validate", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.id }),
        });
        if (!response.ok) return;
        const current = await response.json();
        if (
          current.user_id !== data.user_id ||
          current.session_id !== data.session_id
        )
          return;
        await self.clients.openWindow("/notifications/" + data.id);
      } catch {}
    })(),
  );
});
