/** Secrets remain only in the current enrollment UI; never diagnostic metadata. */
export function bindAuthenticatorSecret(
  setup: HTMLElement,
  onDiscard: () => void,
) {
  const input = setup.querySelector<HTMLInputElement>("#authenticator-secret")!,
    reveal = setup.querySelector<HTMLButtonElement>("[data-reveal-key]")!,
    copy = setup.querySelector<HTMLButtonElement>("[data-copy-key]")!,
    message = setup.querySelector<HTMLElement>("[data-key-message]")!,
    content = setup.closest<HTMLElement>("#private-content")!;
  let epoch = 0;
  const allowed = () =>
    setup.isConnected && !setup.hidden && !content.hidden && !document.hidden;
  const conceal = () => {
    input.type = "password";
    reveal.textContent = "Show key";
    reveal.setAttribute("aria-pressed", "false");
  };
  const clear = () => {
    epoch++;
    conceal();
    input.value = "";
    message.textContent = "";
    setup
      .querySelector<HTMLImageElement>("#authenticator-qr")
      ?.removeAttribute("src");
    reveal.disabled = copy.disabled = true;
  };
  reveal.addEventListener("click", () => {
    if (!allowed() || !input.value) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    reveal.textContent = show ? "Hide key" : "Show key";
    reveal.setAttribute("aria-pressed", String(show));
  });
  copy.addEventListener("click", async () => {
    if (!allowed() || !input.value) return;
    const current = epoch;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(input.value);
      if (current === epoch && allowed())
        message.textContent = "Setup key copied. Keep it private.";
    } catch {
      if (current !== epoch || !allowed()) return;
      input.type = "text";
      reveal.textContent = "Hide key";
      reveal.setAttribute("aria-pressed", "true");
      input.focus();
      input.select();
      message.textContent =
        "Select and copy the highlighted setup key. Keep it private.";
    }
  });
  const discard = () => {
    clear();
    onDiscard();
  };
  const observer = new MutationObserver(() => {
    // Ordinary app switching conceals the key; a visible locked/removed workspace discards it.
    if (
      input.value &&
      (!setup.isConnected || (content.hidden && !document.hidden))
    )
      discard();
  });
  observer.observe(content, {
    attributes: true,
    attributeFilter: ["hidden"],
    childList: true,
    subtree: true,
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) conceal();
  });
  window.addEventListener("salam-logout", discard, { once: true });
  window.addEventListener(
    "pagehide",
    () => {
      clear();
      observer.disconnect();
    },
    { once: true },
  );
  return {
    clear,
    set(value: string) {
      clear();
      if (!setup.isConnected || content.hidden || document.hidden) return false;
      input.value = value;
      reveal.disabled = copy.disabled = false;
      return true;
    },
  };
}
