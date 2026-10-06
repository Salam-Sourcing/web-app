export function bindVerificationBadges() {
  document
    .querySelectorAll<HTMLElement>("[data-verification-badge]")
    .forEach((root) => {
      if (root.dataset.bound) return;
      root.dataset.bound = "true";
      const button = root.querySelector<HTMLButtonElement>("button")!,
        note = root.querySelector<HTMLElement>("[data-verification-note]")!;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const hide = () => {
        note.hidden = true;
        button.setAttribute("aria-expanded", "false");
      };
      const position = () => {
        const anchor = button.getBoundingClientRect();
        note.style.left =
          Math.max(
            12,
            Math.min(anchor.left, innerWidth - note.offsetWidth - 12),
          ) + "px";
        note.style.top =
          Math.max(
            12,
            Math.min(anchor.bottom + 8, innerHeight - note.offsetHeight - 12),
          ) + "px";
      };
      const show = () => {
        if (timer) clearTimeout(timer);
        note.hidden = false;
        button.setAttribute("aria-expanded", "true");
        position();
      };
      root.addEventListener("pointerenter", show);
      root.addEventListener("pointerleave", () => {
        timer = setTimeout(() => {
          if (!root.contains(document.activeElement)) hide();
        }, 150);
      });
      root.addEventListener("focusin", show);
      root.addEventListener("focusout", (event) => {
        if (!root.contains(event.relatedTarget as Node | null)) hide();
      });
      button.addEventListener("click", show);
      root.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          button.focus();
          hide();
        }
      });
      document.addEventListener("click", (event) => {
        if (!root.contains(event.target as Node)) hide();
      });
      window.addEventListener("resize", hide);
      window.addEventListener("scroll", hide, { passive: true });
    });
}
