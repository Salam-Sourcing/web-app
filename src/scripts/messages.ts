import { messageImage } from "../lib/deals";
import { post, ApiError } from "./forms";
import { bindChatImageViewer } from "./chat-image-viewer";
import {
  mergeMessages,
  pendingText,
  type ThreadMessage,
} from "../lib/procurement";
type Page = {
  rows: ThreadMessage[];
  hasMore: boolean;
  fingerprint: string;
  redirect?: string;
  error?: string;
};
export function bindThread() {
  const root = document.querySelector<HTMLElement>("[data-thread]");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "true";
  bindChatImageViewer(root);
  const id = root.dataset.conversation!,
    company = root.dataset.company!,
    history = root.querySelector<HTMLElement>("[data-history]")!,
    older = root.querySelector<HTMLButtonElement>("[data-older]")!,
    status = root.querySelector<HTMLElement>("[data-live-status]")!;
  const originalFingerprint =
    document.querySelector<HTMLElement>("[data-fingerprint]")!.dataset
      .fingerprint;
  let rows: ThreadMessage[] = [],
    initialized = false,
    loading = false,
    disposed = false,
    source: EventSource | undefined,
    reconnect: ReturnType<typeof setTimeout> | undefined,
    dirty = false;
  let lastSeen = root.querySelector<HTMLElement>(
    "[data-message-id]:last-of-type",
  )?.dataset;
  let oldest = root.querySelector<HTMLElement>("[data-message-id]")?.dataset;
  const ids = new Set(
    Array.from(root.querySelectorAll<HTMLElement>("[data-message-id]")).map(
      (x) => Number(x.dataset.messageId),
    ),
  );
  history.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (
        img instanceof HTMLImageElement &&
        img.matches("[data-message-image]")
      ) {
        img.hidden = true;
        const fallback = img.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.hidden = false;
      }
    },
    true,
  );
  history
    .querySelectorAll<HTMLImageElement>("[data-message-image]")
    .forEach((img) => {
      if (img.complete && !img.naturalWidth) {
        img.hidden = true;
        const fallback = img.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.hidden = false;
      }
    });
  const get = async (params = new URLSearchParams()) => {
    const response = await fetch("/api/messages/" + id + "?" + params, {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const data = (await response.json()) as Page;
    if (!response.ok) {
      if (data.redirect) location.replace(data.redirect);
      throw new ApiError(
        data.error ?? "Unable to load messages.",
        response.status,
      );
    }
    if (data.fingerprint !== originalFingerprint) {
      history.replaceChildren();
      location.reload();
      throw new Error("Your company access changed.");
    }
    return data;
  };
  const render = (incoming: ThreadMessage[], prepend = false) => {
    root.querySelector("[data-empty-thread]")?.remove();
    const atBottom =
        history.scrollHeight - history.scrollTop - history.clientHeight < 70,
      oldHeight = history.scrollHeight;
    rows = mergeMessages(rows, incoming);
    for (const m of rows) {
      let el = history.querySelector<HTMLElement>(
        '[data-message-id="' + m.id + '"]',
      );
      if (!el) {
        el = document.createElement("article");
        el.dataset.messageId = String(m.id);
        el.dataset.sentAt = m.sent_at;
        el.className = "message-bubble" + (m.outgoing ? " outgoing" : "");
      }
      const signature = JSON.stringify(m);
      if (el.dataset.renderedMessage === signature) continue;
      el.dataset.renderedMessage = signature;
      el.replaceChildren();
      if (m.content) {
        const p = document.createElement("p");
        p.className = "preserve-lines";
        p.textContent = m.content;
        el.append(p);
      }
      for (const a of m.attachments) {
        const attachment = document.createElement("div");
        attachment.className = "message-attachment";
        if (messageImage(a.file_mime_type)) {
          const open = document.createElement("a"),
            img = document.createElement("img"),
            fallback = document.createElement("span");
          open.className = "message-image-link";
          open.href = "/api/media/message/" + a.id + "?inline=1";
          open.target = "_blank";
          open.rel = "noopener noreferrer";
          open.ariaLabel = "Open image: " + (a.file_name ?? "attachment");
          img.className = "message-image";
          img.src = open.href;
          img.alt = a.file_name ?? "Message image";
          img.loading = "lazy";
          img.decoding = "async";
          img.dataset.messageImage = "";
          fallback.className = "image-fallback";
          fallback.hidden = true;
          fallback.textContent =
            "Image unavailable. Use the download link or retry.";
          open.append(img, fallback);
          attachment.append(open);
        }
        const link = document.createElement("a");
        link.href = "/api/media/message/" + a.id;
        link.className = "attachment-link";
        link.textContent =
          "Download " +
          a.file_name +
          (a.file_size_bytes
            ? " (" + Math.ceil(a.file_size_bytes / 1024) + " KB)"
            : "");
        attachment.append(link);
        el.append(attachment);
      }
      if (!m.content && !m.attachments.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Attachment processing or unavailable.";
        el.append(p);
      }
      const small = document.createElement("small"),
        time = document.createElement("time");
      time.dateTime = m.sent_at;
      time.textContent =
        new Date(m.sent_at).toLocaleString() +
        " " +
        (m.outgoing ? (m.seen ? "· Seen" : "· Sent") : "");
      small.append(time);
      el.append(small);
      ids.add(m.id);
      // Insert relative to all existing nodes, including SSR history not yet fetched.
      const next = Array.from(
        history.querySelectorAll<HTMLElement>("[data-message-id]"),
      ).find(
        (n) =>
          n !== el &&
          mergeMessages(
            [m],
            [
              {
                ...m,
                id: Number(n.dataset.messageId),
                sent_at: n.dataset.sentAt!,
              },
            ],
          )[0].id === m.id,
      );
      history.insertBefore(el, next ?? null);
    }
    lastSeen = history.querySelector<HTMLElement>(
      "[data-message-id]:last-of-type",
    )?.dataset;
    oldest = history.querySelector<HTMLElement>("[data-message-id]")?.dataset;
    if (prepend) history.scrollTop += history.scrollHeight - oldHeight;
    else if (atBottom) history.scrollTop = history.scrollHeight;
  };
  const markRead = async () => {
    if (document.visibilityState === "visible" && navigator.onLine)
      await post("/api/procurement/read", {
        conversation_id: id,
        company_id: company,
      });
  };
  const refresh = async () => {
    if (
      loading ||
      disposed ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    ) {
      dirty = true;
      return;
    }
    loading = true;
    dirty = false;
    try {
      // Catch up every missed insert, including more than one 50-message page.
      if (initialized && lastSeen) {
        let cursor = { stamp: lastSeen.sentAt!, id: lastSeen.messageId! },
          more = true;
        while (more && !disposed) {
          const delta = await get(
            new URLSearchParams({ after: cursor.stamp, after_id: cursor.id }),
          );
          render(delta.rows);
          more = delta.hasMore;
          const last = delta.rows.at(-1);
          if (!last) break;
          cursor = { stamp: last.sent_at, id: String(last.id) };
        }
      }
      const latest = await get();
      render(latest.rows);
      if (!initialized) {
        older.hidden = !latest.hasMore;
        initialized = true;
      }
      await markRead();
      status.textContent =
        source?.readyState === EventSource.OPEN
          ? "Messages up to date."
          : "Messages refreshed. Reconnecting to live updates…";
    } catch (e) {
      status.textContent =
        (e as Error).message + " Loaded history and your draft are kept.";
    } finally {
      loading = false;
      if (dirty && !disposed) void refresh();
    }
  };
  older.addEventListener("click", async () => {
    if (loading || !oldest) return;
    loading = true;
    older.disabled = true;
    try {
      const page = await get(
        new URLSearchParams({
          before: oldest.sentAt!,
          before_id: oldest.messageId!,
        }),
      );
      render(page.rows, true);
      older.hidden = !page.hasMore;
    } catch (e) {
      status.textContent =
        (e as Error).message + " You can retry loading older messages.";
    } finally {
      loading = false;
      older.disabled = false;
    }
  });
  const open = () => {
    source?.close();
    if (disposed || document.visibilityState !== "visible" || !navigator.onLine)
      return;
    source = new EventSource("/api/messages/stream?conversation=" + id);
    source.addEventListener("ready", () => {
      status.textContent = "Live updates connected.";
      void refresh();
    });
    source.addEventListener("change", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      if (data.id && ids.has(Number(data.id)))
        void get(new URLSearchParams({ message_id: String(data.id) }))
          .then((p) => {
            if (p.rows.length) render(p.rows);
            else {
              history
                .querySelector('[data-message-id="' + Number(data.id) + '"]')
                ?.remove();
              rows = rows.filter((r) => r.id !== Number(data.id));
            }
          })
          .catch(() => {
            status.textContent =
              "Unable to refresh an updated message. Retry refresh.";
          });
      void refresh();
    });
    source.addEventListener("boundary", () => {
      source?.close();
      void refresh();
    });
    const retry = () => {
      source?.close();
      status.textContent = "Reconnecting… Your history and draft are kept.";
      if (reconnect) clearTimeout(reconnect);
      reconnect = setTimeout(() => {
        open();
        void refresh();
      }, 3000);
    };
    source.addEventListener("retry", retry);
    source.onerror = retry;
  };
  const form = root.querySelector<HTMLFormElement>("[data-send-form]"),
    retry = root.querySelector<HTMLButtonElement>("[data-retry]"),
    send = root.querySelector<HTMLButtonElement>("[data-send]");
  let pending: ReturnType<typeof pendingText> | undefined,
    sending = false;
  if (form && retry && send) {
    const input = form.querySelector<HTMLTextAreaElement>("textarea")!,
      note = form.querySelector<HTMLElement>("[data-form-message]")!;
    const sendPending = async () => {
      if (sending || !pending) return;
      sending = true;
      send.disabled = true;
      retry.disabled = true;
      note.hidden = false;
      note.setAttribute("role", "status");
      note.textContent = "Sending…";
      const attempted = pending;
      try {
        await post("/api/procurement/send", {
          conversation_id: id,
          company_id: company,
          ...attempted,
        });
        if (input.value.trim() === attempted.content) input.value = "";
        pending = undefined;
        retry.hidden = true;
        send.disabled = false;
        note.textContent = "Message sent.";
        void refresh();
      } catch (e) {
        retry.hidden = false;
        note.textContent =
          (e as Error).message +
          " Retry sends the same text once. Your current draft is kept.";
        note.setAttribute("role", "alert");
      } finally {
        sending = false;
        retry.disabled = false;
        send.disabled = !!pending;
      }
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (pending || sending || !form.reportValidity()) return;
      try {
        pending = pendingText(input.value);
        void sendPending();
      } catch (error) {
        note.hidden = false;
        note.setAttribute("role", "alert");
        note.textContent = (error as Error).message;
      }
    });
    retry.addEventListener("click", () => void sendPending());
  }
  const resume = () => {
    if (document.visibilityState === "visible") {
      open();
      void refresh();
    } else source?.close();
  };
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("offline", () => {
    source?.close();
    status.textContent =
      "Offline. Your unsent draft is kept; reconnect to send.";
  });
  document.addEventListener("salam-messages-refresh", () => void refresh());
  const polling = setInterval(() => void refresh(), 30000);
  window.addEventListener(
    "pagehide",
    () => {
      disposed = true;
      source?.close();
      clearInterval(polling);
      if (reconnect) clearTimeout(reconnect);
    },
    { once: true },
  );
  history.scrollTop = history.scrollHeight;
  open();
  void refresh();
}
export function bindConversationActivity() {
  const status = document.querySelector<HTMLElement>("[data-list-live]"),
    list = document.querySelector<HTMLElement>("[data-conversations]");
  if (!status || !list) return;
  if (status.dataset.enabled !== "true") {
    status.textContent = "Create a company to view its conversations.";
    return;
  }
  const initial =
    document.querySelector<HTMLElement>("[data-fingerprint]")!.dataset
      .fingerprint;
  let source: EventSource | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    debounce: ReturnType<typeof setTimeout> | undefined,
    disposed = false,
    loading = false,
    dirty = false;
  const update = async () => {
    if (loading) {
      dirty = true;
      return;
    }
    if (disposed || document.visibilityState !== "visible" || !navigator.onLine)
      return;
    loading = true;
    dirty = false;
    try {
      const response = await fetch(
        "/api/messages/conversations" + location.search,
        {
          credentials: "same-origin",
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        },
      );
      const feed = await response.json();
      if (!response.ok) {
        if (feed.redirect) location.replace(feed.redirect);
        throw new Error(feed.error ?? "Conversations could not be refreshed.");
      }
      if (feed.fingerprint !== initial) {
        list.replaceChildren();
        location.reload();
        return;
      }
      if (feed.rows.length) {
        const fragment = document.createDocumentFragment();
        for (const c of feed.rows) {
          const link = document.createElement("a");
          link.className =
            "conversation-row" + (c.unread > 0 ? " has-unread" : "");
          link.href = "/app/messages/" + c.id;
          const avatar = document.createElement("span");
          avatar.className = "company-avatar";
          avatar.ariaHidden = "true";
          avatar.textContent = c.name[0];
          link.append(avatar);
          const copy = document.createElement("div");
          copy.className = "conversation-copy";
          const heading = document.createElement("div");
          heading.className = "row-actions";
          const name = document.createElement("strong");
          name.textContent = c.name;
          heading.append(name);
          if (c.verified) {
            const badge = document.createElement("span");
            badge.className = "badge success";
            badge.textContent = "Verified";
            heading.append(badge);
          }
          const preview = document.createElement("p");
          preview.textContent = c.preview;
          const enquiry = document.createElement("small");
          enquiry.textContent = c.enquiry;
          copy.append(heading, preview, enquiry);
          const activity = document.createElement("div");
          activity.className = "conversation-time";
          const time = document.createElement("time");
          time.dateTime = c.time;
          time.textContent = new Date(c.time).toLocaleString();
          activity.append(time);
          if (c.unread > 0) {
            const badge = document.createElement("span");
            badge.className = "unread-badge";
            badge.setAttribute("aria-label", c.unread + " unread messages");
            badge.textContent = c.unread > 99 ? "99+" : String(c.unread);
            activity.append(badge);
          }
          link.append(copy, activity);
          fragment.append(link);
        }
        list.replaceChildren(fragment);
      } else if (list.querySelector(".conversation-row")) {
        const empty = document.createElement("div");
        empty.className = "empty-workspace";
        const h = document.createElement("h2");
        h.textContent = "No conversations here yet";
        const p = document.createElement("p");
        p.textContent = "Try another view or search.";
        empty.append(h, p);
        list.replaceChildren(empty);
      }
      const next = document.querySelector<HTMLElement>("[data-next-page]");
      if (next) next.hidden = !feed.hasMore;
      status.textContent =
        source?.readyState === EventSource.OPEN
          ? "Conversations up to date."
          : "Conversations refreshed. Reconnecting to live updates…";
    } catch (e) {
      status.textContent = (e as Error).message + " Your current list is kept.";
    } finally {
      loading = false;
      if (dirty && !disposed) void update();
    }
  };
  const changed = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void update(), 350);
  };
  const open = () => {
    source?.close();
    if (disposed || !navigator.onLine || document.visibilityState !== "visible")
      return;
    if (timer) clearTimeout(timer);
    source = new EventSource("/api/messages/stream");
    source.addEventListener("ready", () => {
      status.textContent = "Live updates connected.";
      void update();
    });
    source.addEventListener("change", changed);
    const retry = () => {
      source?.close();
      status.textContent =
        "Live updates reconnecting. Your current list is kept.";
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        open();
        void update();
      }, 4000);
    };
    source.addEventListener("retry", retry);
    source.addEventListener("boundary", () => {
      source?.close();
      void update();
    });
    source.onerror = retry;
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      open();
      void update();
    } else source?.close();
  });
  window.addEventListener("online", () => {
    open();
    void update();
  });
  window.addEventListener("offline", () => {
    source?.close();
    status.textContent = "Offline. Reconnect to refresh conversations.";
  });
  const poll = setInterval(() => void update(), 30000);
  window.addEventListener(
    "pagehide",
    () => {
      disposed = true;
      source?.close();
      clearInterval(poll);
      if (timer) clearTimeout(timer);
      if (debounce) clearTimeout(debounce);
    },
    { once: true },
  );
  open();
  void update();
}
