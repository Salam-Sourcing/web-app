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
    feedback = document.createElement("div"),
    status = document.createElement("p"),
    retry = document.createElement("button"),
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
  feedback.className = "chat-photo-feedback";
  status.setAttribute("role", "status");
  retry.type = "button";
  retry.textContent = "Retry photo";
  retry.className = "button secondary";
  retry.hidden = true;
  counter.setAttribute("aria-live", "polite");
  const tools = document.createElement("div");
  tools.className = "chat-photo-tools";
  const zoomOut = document.createElement("button"),
    zoomIn = document.createElement("button"),
    reset = document.createElement("button"),
    zoomLabel = document.createElement("span");
  for (const button of [zoomOut, zoomIn, reset]) button.type = "button";
  zoomOut.textContent = "−";
  zoomOut.ariaLabel = "Zoom out";
  zoomIn.textContent = "+";
  zoomIn.ariaLabel = "Zoom in";
  reset.textContent = "Reset";
  zoomLabel.setAttribute("aria-live", "polite");
  tools.append(zoomOut, zoomLabel, zoomIn, reset);
  let scale = 1,
    x = 0,
    y = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  const paint = () => {
    const bounds = frame.getBoundingClientRect();
    x = Math.max(
      (-bounds.width * (scale - 1)) / 2,
      Math.min((bounds.width * (scale - 1)) / 2, x),
    );
    y = Math.max(
      (-bounds.height * (scale - 1)) / 2,
      Math.min((bounds.height * (scale - 1)) / 2, y),
    );
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    zoomLabel.textContent = Math.round(scale * 100) + "%";
    zoomOut.disabled = scale <= 1;
    zoomIn.disabled = scale >= 5;
  };
  const setScale = (value: number) => {
    scale = Math.max(1, Math.min(5, value));
    paint();
  };
  const resetPhoto = () => {
    scale = 1;
    x = y = 0;
    pointers.clear();
    paint();
  };
  zoomOut.addEventListener("click", () => setScale(scale - 0.5));
  zoomIn.addEventListener("click", () => setScale(scale + 0.5));
  reset.addEventListener("click", resetPhoto);
  image.draggable = false;
  frame.addEventListener("pointerdown", (event) => {
    if (image.hidden) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    frame.setPointerCapture(event.pointerId);
  });
  frame.addEventListener("pointermove", (event) => {
    const old = pointers.get(event.pointerId);
    if (!old) return;
    const points = Array.from(pointers.values());
    const other =
      pointers.size === 2 ? points.find((point) => point !== old) : undefined;
    if (other) {
      const before = Math.hypot(old.x - other.x, old.y - other.y),
        after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (before > 0) setScale((scale * after) / before);
    } else if (pointers.size === 1 && scale > 1) {
      x += event.clientX - old.x;
      y += event.clientY - old.y;
      paint();
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    frame.addEventListener(type, (event) =>
      pointers.delete((event as PointerEvent).pointerId),
    );
  frame.addEventListener(
    "wheel",
    (event) => {
      if (image.hidden) return;
      event.preventDefault();
      setScale(scale + (event.deltaY < 0 ? 0.25 : -0.25));
    },
    { passive: false },
  );
  frame.addEventListener("dblclick", () =>
    scale > 1 ? resetPhoto() : setScale(2),
  );
  resetPhoto();
  header.append(title, close);
  feedback.append(status, retry);
  frame.append(image, feedback);
  footer.append(previous, counter, next, download);
  dialog.append(header, tools, frame, footer);
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
    resetPhoto();
    image.removeAttribute("src");
    image.alt = "";
    download.removeAttribute("href");
    title.textContent = status.textContent = counter.textContent = "";
    current = undefined;
    retry.hidden = true;
    feedback.hidden = true;
  };
  const dismiss = () => {
    if (dialog.open) dialog.close();
    clear();
  };
  const show = (link: HTMLAnchorElement) => {
    const url = chatPhotoUrl(link.href, location.origin);
    if (!url || !allowed()) return;
    resetPhoto();
    current = link;
    title.textContent = link.querySelector("img")?.alt || "Chat photo";
    image.alt = title.textContent;
    image.hidden = true;
    retry.hidden = true;
    feedback.hidden = false;
    status.hidden = false;
    status.dataset.loading = "true";
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
    if (!dialog.open || !current || !allowed()) return;
    resetPhoto();
    image.hidden = false;
    status.hidden = true;
    feedback.hidden = true;
  });
  image.addEventListener("error", () => {
    if (!dialog.open || !current || !allowed()) return;
    image.hidden = true;
    feedback.hidden = false;
    status.hidden = false;
    status.dataset.loading = "false";
    status.textContent = "Photo unavailable. Retry or use Download.";
    retry.hidden = false;
  });
  retry.addEventListener("click", () => {
    if (!current || !dialog.open || !allowed()) return;
    const link = current;
    image.removeAttribute("src");
    show(link);
    close.focus();
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
    if (["+", "=", "-", "0"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "0") resetPhoto();
      else setScale(scale + (event.key === "-" ? -0.5 : 0.5));
    }

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
