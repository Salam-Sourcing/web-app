/** Images show a spinner until decoding completes; only failures show a fallback. */
export function bindImageLoading(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLImageElement>(
      'img[data-private-media],img[data-preview-image],img[data-message-image],img[data-loading-image],img[src^="/api/"],img[src^="blob:"]',
    )
    .forEach((image) => {
      if (image.dataset.imageBound) return;
      image.dataset.imageBound = "true";
      const frame = image.parentElement;
      if (!frame) return;
      frame.classList.add("media-frame");
      let spinner = Array.from(frame.children).find((node) =>
        node.classList.contains("media-loading-indicator"),
      ) as HTMLElement | undefined;
      if (!spinner) {
        spinner = document.createElement("span");
        spinner.className = "media-loading-indicator";
        spinner.setAttribute("aria-hidden", "true");
        const ring = document.createElement("span");
        ring.className = "ui-spinner";
        spinner.append(ring);
        frame.append(spinner);
      }
      const begin = () => {
        image.hidden = false;
        frame.dataset.mediaState = "loading";
        frame.setAttribute("aria-busy", "true");
        spinner!.hidden = false;
      };
      const finish = (loaded: boolean) => {
        frame.dataset.mediaState = loaded ? "loaded" : "error";
        frame.removeAttribute("aria-busy");
        spinner!.hidden = true;
        image.hidden = !loaded;
      };
      image.addEventListener("load", () => {
        if (image.complete) finish(image.naturalWidth > 0);
      });
      image.addEventListener("error", () => finish(false));
      new MutationObserver(() => {
        begin();
        if (image.complete) finish(image.naturalWidth > 0);
      }).observe(image, { attributes: true, attributeFilter: ["src"] });
      begin();
      if (image.complete) finish(image.naturalWidth > 0);
    });
}
export function bindLoading() {
  bindImageLoading();
  new MutationObserver((records) => {
    if (
      records.some((r) =>
        Array.from(r.addedNodes).some(
          (n) =>
            n instanceof Element &&
            (n.matches("img") || n.querySelector("img")),
        ),
      )
    )
      bindImageLoading();
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (
      !link ||
      event.defaultPrevented ||
      (event as MouseEvent).button !== 0 ||
      (event as MouseEvent).ctrlKey ||
      (event as MouseEvent).metaKey ||
      (event as MouseEvent).shiftKey ||
      (event as MouseEvent).altKey ||
      link.target ||
      link.hasAttribute("download") ||
      link.hasAttribute("data-login-gate")
    )
      return;
    const url = new URL(link.href);
    if (
      url.origin !== location.origin ||
      (url.pathname === location.pathname && url.search === location.search)
    )
      return;
    document.documentElement.dataset.navigating = "true";
  });
  window.addEventListener(
    "pageshow",
    () => delete document.documentElement.dataset.navigating,
  );
}
