export function bindChatAttachmentComposer(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>(
      "[data-attachment-dialog]",
    ),
    open = root.querySelector<HTMLButtonElement>("[data-attachment-open]"),
    close = dialog?.querySelector<HTMLButtonElement>("[data-attachment-close]"),
    form = dialog?.querySelector<HTMLFormElement>("[data-file-form]");
  if (!dialog || !open || !close || !form || dialog.dataset.bound) return;
  dialog.dataset.bound = "true";
  const privateContent = root.closest<HTMLElement>("#private-content") ?? root;
  let completed = false;
  const allowed = () => root.isConnected && !privateContent.hidden;
  const busy = () => form.dataset.busy === "true";
  const dismiss = () => {
    if (dialog.open) dialog.close();
  };
  const discard = () => {
    dismiss();
    form.reset();
    const caption = form.querySelector<HTMLTextAreaElement>('[name="caption"]');
    if (caption) caption.value = "";
  };
  open.addEventListener("click", () => {
    if (!allowed() || dialog.open) return;
    if (completed) {
      const note = form.querySelector<HTMLElement>("[data-form-message]");
      if (note) {
        note.hidden = true;
        note.textContent = "";
      }
      completed = false;
    }
    dialog.showModal();
  });
  close.addEventListener("click", () => {
    if (!busy()) dismiss();
  });
  dialog.addEventListener("cancel", (event) => {
    if (busy()) event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (allowed()) open.focus();
  });
  form.addEventListener("salam-file-attached", () => {
    completed = true;
    dismiss();
  });
  const observer = new MutationObserver(() => {
    close.disabled = busy();
    if (!allowed()) discard();
  });
  observer.observe(privateContent, {
    attributes: true,
    attributeFilter: ["hidden", "data-busy"],
    childList: true,
    subtree: true,
  });
  window.addEventListener("salam-logout", discard);
  window.addEventListener(
    "pagehide",
    () => {
      discard();
      observer.disconnect();
      window.removeEventListener("salam-logout", discard);
    },
    { once: true },
  );
}
