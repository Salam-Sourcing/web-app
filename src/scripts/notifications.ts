import { bindForms } from "./forms";
import {
  notificationPresentation,
  notificationIconPaths,
} from "../lib/notification-display";
type Notice = {
  id: number;
  title: string;
  body: string | null;
  is_read: boolean;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
  can_open: boolean;
  notification_type: string;
  source_name: string | null;
  preview: string | null;
  context_name: string | null;
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
  const form = node("form", undefined, "form notification-action");
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
  const view = notificationPresentation(n);
  const row = node(
    "article",
    undefined,
    "notification-card" + (!n.is_read ? " notification-unread" : ""),
  );
  row.dataset.notificationId = String(n.id);
  const symbol = node("span", undefined, "notification-symbol");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({
    viewBox: "0 0 24 24",
    width: "22",
    height: "22",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.7",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }))
    svg.setAttribute(key, value);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", notificationIconPaths[view.icon]);
  svg.append(path);
  symbol.append(svg);
  const content = node("div", undefined, "notification-content");
  const heading = node("div", undefined, "notification-heading");
  heading.append(node("h2", view.title));
  if (!n.is_read) {
    const dot = node("span", undefined, "notification-dot");
    dot.ariaLabel = "Unread";
    heading.append(dot);
  }
  content.append(
    heading,
    node("p", view.source, "notification-source"),
    node("p", view.preview, "notification-preview"),
  );
  if (view.context && view.context !== view.preview)
    content.append(node("p", view.context, "notification-context"));
  const footer = node("div", undefined, "notification-footer");
  const time = node(
    "time",
    new Date(n.created_at).toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Edmonton",
    }),
  );
  time.dateTime = n.created_at;
  footer.append(time);
  if (n.can_open)
    footer.append(action(n.id, "notification-open", view.openLabel));
  content.append(footer);
  const more = node("details", undefined, "notification-more"),
    summary = node("summary", "⋯");
  summary.ariaLabel = "More actions for " + view.title;
  const options = node("div", undefined, "notification-options");
  if (!n.is_read)
    options.append(action(n.id, "notification-read", "Mark read"));
  options.append(action(n.id, "notification-delete", "Delete"));
  more.append(summary, options);
  row.append(symbol, content, more);
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
      const empty = node("section", undefined, "notification-empty");
      empty.dataset.notificationEmpty = "";
      empty.append(
        node("h2", "You’re all caught up"),
        node("p", "New messages and marketplace updates will appear here."),
      );
      list.append(empty);
    }
    if (banner) banner.hidden = !pending;
    bindForms();
  };
  const feedback = content.querySelector<HTMLElement>(
    "[data-notification-feedback]",
  );
  const refresh = async (manual = false) => {
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
      if (!response.ok)
        throw new Error("Notifications could not be refreshed. Please retry.");
      const data = await response.json();
      if (manual && feedback) feedback.hidden = true;
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
      if (description) description.textContent = `${data.unread} unread`;
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
              if (!ids.has(row.dataset.notificationId)) {
                row.remove();
                return;
              }
              const next = data.rows.find(
                (n: Notice) => String(n.id) === row.dataset.notificationId,
              ) as Notice;
              let previous: Notice | undefined;
              try {
                previous = JSON.parse(row.dataset.notificationSignature ?? "");
              } catch {}
              if (previous?.preview && !next.preview) {
                const replacement = card(next);
                replacement.dataset.notificationSignature =
                  JSON.stringify(next);
                row.replaceWith(replacement);
              }
            });
          if (banner) {
            banner.hidden = false;
            banner.textContent = "Show latest updates";
          }
        }
      }
    } catch {
      if (manual && feedback) {
        feedback.textContent =
          "Notifications could not be refreshed. Please retry.";
        feedback.hidden = false;
      }
    } finally {
      clearTimeout(timeout);
      if (controller === request) controller = undefined;
    }
  };
  banner?.addEventListener("click", render);
  content
    .querySelector("[data-notification-refresh]")
    ?.addEventListener("click", async () => {
      const button = content.querySelector<HTMLButtonElement>(
        "[data-notification-refresh]",
      );
      if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
      }
      try {
        await refresh(true);
        render();
      } finally {
        if (button) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
        }
      }
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
