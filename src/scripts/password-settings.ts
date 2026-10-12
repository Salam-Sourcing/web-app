export function bindPasswordSettings() {
  const form = document.querySelector<HTMLFormElement>("[data-password-form]");
  if (!form || form.dataset.passwordBound) return;
  form.dataset.passwordBound = "true";
  const codeForm = document.querySelector<HTMLFormElement>(
    "[data-password-code-form]",
  );
  const code = form.querySelector<HTMLInputElement>('[name="nonce"]');
  const help = form.querySelector<HTMLElement>("[data-password-code-help]");
  const requireCode = (sent: boolean) => {
    if (code) {
      code.required = true;
      code.setAttribute("aria-required", "true");
      if (sent) code.value = "";
      code.focus();
    }
    if (help)
      help.textContent = sent
        ? "Code sent. Enter the latest code from your email, then select Update password."
        : "Verification code required. Select Send verification code above, then enter the latest code from your email.";
    if (!sent)
      codeForm?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  codeForm?.addEventListener("salam-form-success", () => {
    requireCode(true);
    const button = codeForm.querySelector<HTMLElement>(
      "[data-password-send-code]",
    );
    if (button) button.textContent = "Send a new code";
    const previousError = form.querySelector<HTMLElement>(
      "[data-form-message]",
    );
    if (previousError) previousError.hidden = true;
  });
  form.addEventListener("salam-form-error", (event) => {
    const errorCode = (event as CustomEvent).detail?.code;
    if (
      ["reauthentication_needed", "reauthentication_not_valid"].includes(
        errorCode,
      )
    )
      requireCode(false);
    if (
      ["current_password_required", "current_password_mismatch"].includes(
        errorCode,
      )
    )
      form
        .querySelector<HTMLInputElement>('[name="current_password"]')
        ?.focus();
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
