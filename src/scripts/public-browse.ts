import { safeNext } from "../lib/security";
export function bindPublicBrowse() {
  const root = document.querySelector<HTMLElement>("[data-public-browse]");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "true";
  const dialog = root.querySelector<HTMLDialogElement>("[data-login-prompt]")!,
    form = root.querySelector<HTMLFormElement>("[data-public-search]")!;
  const prompt = (target: string, reason: string) => {
    const next = safeNext(target),
      suffix = "?next=" + encodeURIComponent(next);
    dialog.querySelector<HTMLAnchorElement>("[data-prompt-login]")!.href =
      "/login" + suffix;
    dialog.querySelector<HTMLAnchorElement>("[data-prompt-signup]")!.href =
      "/signup" + suffix;
    dialog.querySelector<HTMLElement>("[data-prompt-reason]")!.textContent =
      reason;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else location.assign("/login" + suffix);
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form))
      if (typeof value === "string" && value.trim()) params.set(key, value);
    prompt(
      "/discover?" + params,
      "Sign in to search and apply your selected filters. We’ll keep your choices ready for you.",
    );
  });
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
        ? event.target.closest<HTMLAnchorElement>("[data-login-gate]")
        : null;
    if (!link) return;
    event.preventDefault();
    prompt(
      new URL(link.href).pathname,
      "Sign in to view full details and start a conversation with this business.",
    );
  });
  dialog
    .querySelector("[data-close-prompt]")!
    .addEventListener("click", () => dialog.close());
  root
    .querySelectorAll<HTMLImageElement>("[data-preview-image]")
    .forEach((image) => {
      image.addEventListener("error", () => {
        image.hidden = true;
      });
      if (image.complete && !image.naturalWidth) image.hidden = true;
    });
}
