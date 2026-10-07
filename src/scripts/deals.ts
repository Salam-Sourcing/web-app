export function bindPdfShare() {
  const root = document.querySelector<HTMLElement>("[data-pdf-export]"),
    button = root?.querySelector<HTMLButtonElement>("[data-share]"),
    note = root?.querySelector<HTMLElement>("[data-export-status]");
  if (!root || !button || !note || !navigator.share || !navigator.canShare)
    return;
  const name = root.dataset.filename!;
  if (
    !navigator.canShare({
      files: [new File([], name, { type: "application/pdf" })],
    })
  )
    return;
  button.hidden = false;
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    note.hidden = false;
    note.textContent = "Preparing PDF…";
    try {
      const response = await fetch(root.dataset.url!, {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      )
        throw new Error("Unable to export this deal. Refresh and try again.");
      const file = new File([await response.blob()], name, {
        type: "application/pdf",
      });
      await navigator.share({
        files: [file],
        title: "Salam Sourcing B2B Marketplace deal summary",
      });
      note.textContent = "PDF shared.";
    } catch (e) {
      note.textContent =
        (e as Error).name === "AbortError"
          ? "Sharing cancelled."
          : "Your browser could not share this PDF. Use Download PDF and share it from your device.";
    } finally {
      button.disabled = false;
    }
  });
}
