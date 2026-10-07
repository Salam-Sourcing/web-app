export function bindPasswordSettings() {
  const form = document.querySelector<HTMLFormElement>("[data-password-form]");
  const showVerification = () => {
    document
      .querySelectorAll<HTMLElement>("[data-password-verification]")
      .forEach((node) => (node.hidden = false));
    const code = form?.querySelector<HTMLInputElement>('[name="nonce"]');
    if (code) {
      code.disabled = false;
      code.required = true;
    }
    form
      ?.querySelector<HTMLElement>("[data-password-code-request]")
      ?.setAttribute("hidden", "");
  };
  form
    ?.querySelector("[data-password-code-request]")
    ?.addEventListener("click", showVerification);
  form?.addEventListener("salam-form-error", (event) => {
    if (
      ["reauthentication_needed", "reauthentication_not_valid"].includes(
        (event as CustomEvent).detail.code,
      )
    )
      showVerification();
  });
  window.addEventListener("pagehide", () => {
    form
      ?.querySelectorAll<HTMLInputElement>("[data-password-field]")
      .forEach((input) => {
        input.type = "password";
        const toggle =
          input.parentElement?.querySelector<HTMLButtonElement>(
            ".password-toggle",
          );
        if (toggle) {
          toggle.textContent = "Show";
          toggle.setAttribute("aria-label", "Show password");
          toggle.setAttribute("aria-pressed", "false");
        }
      });
  });
}
