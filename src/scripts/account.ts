export function bindSearchForms() {
  document
    .querySelectorAll<HTMLFormElement>(
      'form[action="/api/account/search-save"]',
    )
    .forEach((form) => {
      form.addEventListener(
        "submit",
        () => {
          const target = form.elements.namedItem("filters") as HTMLInputElement;
          const filters = JSON.parse(target.value) as Record<string, unknown>;
          for (const key of [
            "query",
            "category",
            "location",
            "min_price",
            "max_price",
            "max_moq",
            "max_lead_days",
            "currency",
          ]) {
            const field = form.elements.namedItem(
              key,
            ) as HTMLInputElement | null;
            if (field) {
              if (field.value.trim()) filters[key] = field.value.trim();
              else delete filters[key];
            }
          }
          const verified = form.elements.namedItem(
            "verified",
          ) as HTMLInputElement | null;
          if (verified) filters.verified = verified.checked;
          target.value = JSON.stringify(filters);
        },
        { capture: true },
      );
    });
}
export function bindAccountTools() {
  document
    .querySelectorAll<HTMLFormElement>(
      'form[action="/api/account/support-recovery"]',
    )
    .forEach((form) =>
      form.addEventListener(
        "submit",
        () => {
          const selected = (
            form.elements.namedItem("transfer_subject") as HTMLSelectElement
          ).value.split(":");
          (form.elements.namedItem("entity_id") as HTMLInputElement).value =
            selected[0];
          (
            form.elements.namedItem("proposed_owner") as HTMLInputElement
          ).value = selected[1];
        },
        { capture: true },
      ),
    );
  document
    .querySelectorAll<HTMLFormElement>(
      'form[action="/api/account/support-appeal"]',
    )
    .forEach((form) =>
      form.addEventListener(
        "submit",
        () => {
          const selected = (
            form.elements.namedItem("subject") as HTMLSelectElement
          ).value.split(":");
          (form.elements.namedItem("entity_type") as HTMLInputElement).value =
            selected[0];
          (form.elements.namedItem("entity_id") as HTMLInputElement).value =
            selected[1];
        },
        { capture: true },
      ),
    );
  document
    .querySelector<HTMLFormElement>("[data-export-form]")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      if (form.dataset.busy === "true") return;
      form.dataset.busy = "true";
      const button = form.querySelector("button")!,
        message = form.querySelector<HTMLElement>("[data-form-message]")!;
      button.disabled = true;
      message.hidden = false;
      message.textContent = "Preparing your private download…";
      message.setAttribute("role", "status");
      try {
        const r = await fetch("/api/account/export", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
          signal: AbortSignal.timeout(120000),
        });
        if (!r.ok) {
          const error = await r.json();
          throw new Error(error.error ?? "Download could not be completed.");
        }
        const url = URL.createObjectURL(await r.blob()),
          a = document.createElement("a");
        a.href = url;
        a.download = "salam-personal-data.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        message.textContent = "Your download is ready.";
      } catch (error) {
        message.textContent =
          error instanceof Error ? error.message : "Please retry.";
        message.setAttribute("role", "alert");
      } finally {
        button.disabled = false;
        form.dataset.busy = "false";
      }
    });
}
export function bindNotificationRefresh() {
  // Keep the list stable while reading or using its controls. Explicit refresh
  // retrieves current RLS-filtered rows without a blocking account overlay.
  document
    .querySelector("[data-notification-refresh]")
    ?.addEventListener("click", () => location.reload());
}
