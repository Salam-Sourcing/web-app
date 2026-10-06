/** Keep chat photos on the authorized media route, including the download. */
export function chatPhotoUrl(href: string, origin: string) {
  try {
    const url = new URL(href, origin);
    if (
      url.origin !== origin ||
      !/^\/api\/media\/message\/[1-9]\d*$/.test(url.pathname) ||
      url.search !== "?inline=1"
    )
      return null;
    return { image: url.pathname + url.search, download: url.pathname };
  } catch {
    return null;
  }
}

export function bindChatImageViewer(root: HTMLElement) {
  const dialog = document.createElement("dialog");
  if (typeof dialog.showModal !== "function") return;
  dialog.className = "chat-photo-viewer";
  dialog.setAttribute("aria-label", "Chat photo viewer");
  const header = document.createElement("header"),
    title = document.createElement("strong"),
    close = document.createElement("button"),
    frame = document.createElement("div"),
    image = document.createElement("img"),
    status = document.createElement("p"),
    footer = document.createElement("footer"),
    previous = document.createElement("button"),
    counter = document.createElement("span"),
    next = document.createElement("button"),
    download = document.createElement("a");
  title.className = "chat-photo-title";
  close.type = previous.type = next.type = "button";
  close.textContent = "Close";
  close.autofocus = true;
  previous.textContent = "Previous";
  next.textContent = "Next";
  previous.ariaLabel = "Previous photo";
  next.ariaLabel = "Next photo";
  download.textContent = "Download";
  download.className = "button secondary";
  frame.className = "chat-photo-frame";
  status.setAttribute("role", "status");
  counter.setAttribute("aria-live", "polite");
  header.append(title, close);
  frame.append(image, status);
  footer.append(previous, counter, next, download);
  dialog.append(header, frame, footer);
  root.append(dialog);
  const privateContent = root.closest<HTMLElement>("#private-content") ?? root;
  let current: HTMLAnchorElement | undefined;
  const photos = () =>
    Array.from(
      root.querySelectorAll<HTMLAnchorElement>(".message-image-link"),
    ).filter((link) => chatPhotoUrl(link.href, location.origin));
  const allowed = () =>
    !document.hidden && !privateContent.hidden && root.isConnected;
  const clear = () => {
    image.removeAttribute("src");
    image.alt = "";
    download.removeAttribute("href");
    title.textContent = status.textContent = counter.textContent = "";
    current = undefined;
  };
  const dismiss = () => {
    if (dialog.open) dialog.close();
    clear();
  };
  const show = (link: HTMLAnchorElement) => {
    const url = chatPhotoUrl(link.href, location.origin);
    if (!url || !allowed()) return;
    current = link;
    title.textContent = link.querySelector("img")?.alt || "Chat photo";
    image.alt = title.textContent;
    image.hidden = true;
    status.hidden = false;
    status.textContent = "Loading photo…";
    download.href = url.download;
    const links = photos(),
      index = links.indexOf(link);
    counter.textContent = `${index + 1} / ${links.length}`;
    previous.disabled = index <= 0;
    next.disabled = index >= links.length - 1;
    previous.hidden = next.hidden = counter.hidden = links.length < 2;
    image.src = url.image;
    if (!dialog.open) dialog.showModal();
  };
  image.addEventListener("load", () => {
    if (!dialog.open || !current) return;
    image.hidden = false;
    status.hidden = true;
  });
  image.addEventListener("error", () => {
    if (!dialog.open || !current) return;
    image.hidden = true;
    status.hidden = false;
    status.textContent =
      "Photo unavailable. Close and reopen to retry, or use Download.";
  });
  const move = (offset: number) => {
    if (!current) return;
    const links = photos(),
      index = links.indexOf(current);
    if (index < 0) {
      dismiss();
      return;
    }
    const link = links[index + offset];
    if (link) {
      show(link);
      // Disabling the focused end-of-gallery button can move focus to body.
      if (!dialog.contains(document.activeElement)) close.focus();
      else if (document.activeElement === next && next.disabled)
        previous.focus();
      else if (document.activeElement === previous && previous.disabled)
        next.focus();
    }
  };
  root.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>(".message-image-link")
        : null;
    if (
      !link ||
      !root.contains(link) ||
      !chatPhotoUrl(link.href, location.origin)
    )
      return;
    event.preventDefault();
    show(link);
  });
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  close.addEventListener("click", dismiss);
  dialog.addEventListener("close", clear);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  // Native dialogs remain in the top layer even when their parent is hidden.
  // Remove the photo whenever the private workspace locks or discards its DOM.
  const observer = new MutationObserver(() => {
    if (dialog.open && (!allowed() || !current?.isConnected)) dismiss();
  });
  observer.observe(privateContent, {
    attributes: true,
    attributeFilter: ["hidden"],
    childList: true,
    subtree: true,
  });
  const visibility = () => {
    if (document.hidden) dismiss();
  };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("offline", dismiss);
  window.addEventListener("salam-logout", dismiss);
  window.addEventListener(
    "pagehide",
    () => {
      dismiss();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", dismiss);
      window.removeEventListener("salam-logout", dismiss);
      dialog.remove();
    },
    { once: true },
  );
}
