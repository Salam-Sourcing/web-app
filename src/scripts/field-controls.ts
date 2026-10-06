export function bindFieldControls(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLInputElement>(
      'input[type="password"]:not([data-secret-control])',
    )
    .forEach((input) => {
      if (input.dataset.visibilityBound) return;
      input.dataset.visibilityBound = "true";
      if (!input.hasAttribute("aria-label") && input.labels?.[0])
        input.setAttribute(
          "aria-label",
          input.labels[0].textContent?.trim() || "Password",
        );
      const wrapper = document.createElement("span"),
        button = document.createElement("button");
      wrapper.className = "password-control";
      input.before(wrapper);
      wrapper.append(input, button);
      button.type = "button";
      button.className = "password-toggle";
      button.textContent = "Show";
      button.setAttribute("aria-label", "Show password");
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.textContent = reveal ? "Hide" : "Show";
        button.setAttribute(
          "aria-label",
          reveal ? "Hide password" : "Show password",
        );
        button.setAttribute("aria-pressed", String(reveal));
      });
    });
  root
    .querySelectorAll<HTMLButtonElement>("[data-copy-value]")
    .forEach((button) => {
      if (button.dataset.copyBound) return;
      button.dataset.copyBound = "true";
      button.addEventListener("click", async () => {
        const input =
          button.parentElement?.querySelector<HTMLInputElement>(
            "input[readonly]",
          );
        const message = button.parentElement?.querySelector<HTMLElement>(
          "[data-copy-message]",
        );
        if (!input || !message) return;
        try {
          if (!navigator.clipboard?.writeText)
            throw new Error("clipboard unavailable");
          await navigator.clipboard.writeText(input.value);
          message.textContent = "Copied.";
        } catch {
          input.focus();
          input.select();
          message.textContent = "Select and copy the highlighted text.";
        }
      });
    });
}
