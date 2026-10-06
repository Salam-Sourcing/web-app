import { bindForms } from "./forms";
type Notice = {
  id: number;
  title: string;
  body: string | null;
  is_read: boolean;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
  can_open: boolean;
};
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  css = "",
) {
  const element = document.createElement(tag);
  element.className = css;
  if (text !== undefined) element.textContent = text;
  return element;
}
function action(id: number, kind: string, label: string) {
  const form = node("form", undefined, "form");
  form.method = "post";
  form.action = "/api/account/" + kind;
  form.dataset.apiForm = "";
  const input = node("input");
  input.type = "hidden";
  input.name = "id";
  input.value = String(id);
  const status = node("p", undefined, "form-message");
  status.dataset.formMessage = "";
  status.setAttribute("role", "status");
  status.hidden = true;
  const button = node("button", label, "button secondary");
  button.type = "submit";
  form.append(input, status, button);
  return form;
}
function card(n: Notice) {
  const row = node(
    "article",
    undefined,
    "card" + (!n.is_read ? " notification-unread" : ""),
  );
  row.dataset.notificationId = String(n.id);
  const heading = node("div", undefined, "section-heading");
  heading.append(node("h2", n.title));
  if (!n.is_read) heading.append(node("span", "Unread", "badge"));
  const time = node(
    "time",
    new Date(n.created_at).toLocaleString("en-CA", {
      timeZone: "America/Edmonton",
      timeZoneName: "short",
    }),
  );
  time.dateTime = n.created_at;
  const actions = node("div", undefined, "row-actions mt-4");
  if (n.can_open)
    actions.append(action(n.id, "notification-open", "Open update"));
  if (!n.is_read)
    actions.append(action(n.id, "notification-read", "Mark read"));
  actions.append(action(n.id, "notification-delete", "Delete"));
  row.append(heading, node("p", n.body ?? "", "account-copy"), time, actions);
  return row;
}
/** Background reads never lock the workspace or interrupt an active form. */
export function bindNotifications() {
  const content = document.querySelector<HTMLElement>("#private-content");
  if (!content) return;
  const bell = content.querySelector<HTMLAnchorElement>(
    "[data-notification-bell]",
  );
  const badge = bell?.querySelector<HTMLElement>("[data-notification-count]");
  const list = content.querySelector<HTMLElement>("[data-notification-list]");
  const banner = content.querySelector<HTMLButtonElement>(
    "[data-notification-updates]",
  );
  let pending: Notice[] | undefined;
  let controller: AbortController | undefined;
  let stopped = false;
  let revision = list?.dataset.notificationRevision ?? "";
  const allowed = () =>
    !stopped &&
    !document.hidden &&
    !content.hidden &&
    content.isConnected &&
    navigator.onLine;
  const render = () => {
    if (!pending || !list || !allowed()) return;
    const rows = pending;
    pending = undefined;
    const existing = new Map(
      Array.from(
        list.querySelectorAll<HTMLElement>("[data-notification-id]"),
      ).map((row) => [Number(row.dataset.notificationId), row]),
    );
    list.querySelector("[data-notification-empty]")?.remove();
    rows.forEach((n, index) => {
      const old = existing.get(n.id),
        signature = JSON.stringify(n);
      let row = old;
      if (!old || old.dataset.notificationSignature !== signature) {
        // Defer replacing a focused action until its interaction completes.
        if (old?.contains(document.activeElement)) {
          pending = rows;
          existing.delete(n.id);
          return;
        }
        row = card(n);
        row.dataset.notificationSignature = signature;
        old?.replaceWith(row);
      }
      if (row && list.children[index] !== row)
        list.insertBefore(row, list.children[index] ?? null);
      existing.delete(n.id);
    });
    for (const row of existing.values()) row.remove();
    if (!rows.length) {
      const empty = node("section", undefined, "card");
      empty.dataset.notificationEmpty = "";
      empty.append(
        node("h2", "You’re all caught up"),
        node("p", "No notifications yet."),
      );
      list.append(empty);
    }
    if (banner) banner.hidden = !pending;
    bindForms();
  };
  const refresh = async () => {
    if (!allowed() || controller) return;
    const request = new AbortController();
    controller = request;
    const timeout = window.setTimeout(() => request.abort(), 12000);
    try {
      const response = await fetch("/api/notifications", {
        credentials: "same-origin",
        cache: "no-store",
        signal: request.signal,
      });
      if (!response.ok) return;
      const data = await response.json();
      if (
        !allowed() ||
        request.signal.aborted ||
        data.fingerprint !== content.dataset.fingerprint
      )
        return;
      if (badge) {
        badge.textContent = data.unread > 99 ? "99+" : String(data.unread);
        badge.hidden = data.unread === 0;
      }
      bell?.setAttribute("aria-label", `Notifications, ${data.unread} unread`);
      const description = content.querySelector<HTMLElement>(
        "[data-notification-summary]",
      );
      if (description)
        description.textContent = `${data.unread} unread updates. Your latest 100 updates are shown.`;
      if (list && Array.isArray(data.rows)) {
        const next = JSON.stringify(data.rows);
        if (next !== revision) {
          revision = next;
          pending = data.rows;
          // Remove revoked/deleted updates promptly; new updates appear by request while reading.
          const ids = new Set(data.rows.map((n: Notice) => String(n.id)));
          list
            .querySelectorAll<HTMLElement>("[data-notification-id]")
            .forEach((row) => {
              if (!ids.has(row.dataset.notificationId)) row.remove();
            });
          if (banner) {
            banner.hidden = false;
            banner.textContent = "Show latest updates";
          }
        }
      }
    } catch {
      /* The next poll or Refresh retries without blocking other actions. */
    } finally {
      clearTimeout(timeout);
      if (controller === request) controller = undefined;
    }
  };
  banner?.addEventListener("click", render);
  content
    .querySelector("[data-notification-refresh]")
    ?.addEventListener("click", async () => {
      await refresh();
      render();
    });
  const visibility = () => {
    if (!allowed()) controller?.abort();
    else void refresh();
  };
  const stop = () => {
    stopped = true;
    controller?.abort();
    pending = undefined;
    clearInterval(timer);
    observer.disconnect();
    window.removeEventListener("focus", visibility);
    window.removeEventListener("online", visibility);
    document.removeEventListener("visibilitychange", visibility);
  };
  const observer = new MutationObserver(() => {
    if (content.hidden) {
      controller?.abort();
      pending = undefined;
      if (badge) badge.hidden = true;
      if (banner) banner.hidden = true;
    }
  });
  observer.observe(content, { attributes: true, attributeFilter: ["hidden"] });
  const timer = window.setInterval(() => void refresh(), 30000);
  window.addEventListener("focus", visibility);
  window.addEventListener("online", visibility);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", stop, { once: true });
  window.addEventListener("salam-logout", stop, { once: true });
  void refresh();
}
