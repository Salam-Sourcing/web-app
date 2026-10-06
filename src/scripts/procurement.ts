import { post, ApiError } from "./forms";
const say = (form: HTMLFormElement, text: string, error = false) => {
  const node = form.querySelector<HTMLElement>("[data-form-message]");
  if (node) {
    node.hidden = false;
    node.textContent = text;
    node.setAttribute("role", error ? "alert" : "status");
  }
};
export async function attachFile(
  file: File,
  kind: "enquiry" | "message",
  target: number,
  company: string,
  key?: string,
) {
  const prepared = key
    ? { key }
    : await post("/api/uploads/prepare", {
        kind,
        target_id: String(target),
        company_id: company,
        mime: file.type,
      });
  const form = new FormData();
  form.set("key", String(prepared.key));
  form.set("kind", kind);
  form.set("target_id", String(target));
  form.set("company_id", company);
  form.set("file", file);
  const response = await fetch("/api/uploads/attach", {
    method: "POST",
    body: form,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok) {
    if (result.redirect) location.replace(result.redirect);
    throw new ApiError(
      result.error ?? "File could not be attached.",
      response.status,
      result.code,
    );
  }
  return result;
}
export function validatePicked(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    ) ||
    !file.size ||
    file.size >= 10 * 1024 * 1024
  )
    throw new Error("Choose JPEG, PNG, WebP or PDF files smaller than 10 MB.");
}
export function bindProcurementForms() {
  document
    .querySelectorAll<HTMLInputElement>("[data-date-field]")
    .forEach((input) => {
      if (input.dataset.iso) {
        const d = new Date(input.dataset.iso);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        input.value = d.toISOString().slice(0, 16);
      }
    });
  document
    .querySelectorAll<HTMLFormElement>("[data-procurement-form]")
    .forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = "true";
      let createdId: number | undefined,
        completed = new Set<File>(),
        uploadKeys = new Map<File, string>(),
        filesSnapshot: File[] | undefined;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.busy || !form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));
        delete data.files;
        form
          .querySelectorAll<HTMLInputElement>("[data-date-field]")
          .forEach((i) => {
            if (i.value) data[i.name] = new Date(i.value).toISOString();
          });
        const files = Array.from(
          form.querySelector<HTMLInputElement>("[data-file-input]")?.files ??
            [],
        );
        try {
          files.forEach(validatePicked);
        } catch (e) {
          say(form, (e as Error).message, true);
          return;
        }
        if (filesSnapshot && files.some((f) => !filesSnapshot!.includes(f))) {
          say(
            form,
            "The upload changed. Open your saved enquiry to add the new files.",
            true,
          );
          return;
        }
        filesSnapshot = files;
        const intent = (event as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        form.dataset.busy = "true";
        form.setAttribute("aria-busy", "true");
        const buttons = Array.from(
          form.querySelectorAll<HTMLButtonElement>("button"),
        );
        buttons.forEach((b) => (b.disabled = true));
        say(form, "Saving…");
        let creating = form.dataset.create === "true" && !createdId;
        try {
          if (createdId) data.enquiry_id = String(createdId);
          const result = await post(form.action, data);
          createdId = Number(result.id);
          creating = false;
          for (const file of files) {
            if (completed.has(file)) continue;
            say(form, "Attaching " + file.name + "…");
            if (!uploadKeys.has(file))
              uploadKeys.set(
                file,
                String(
                  (
                    await post("/api/uploads/prepare", {
                      kind: "enquiry",
                      target_id: String(createdId),
                      company_id: data.company_id,
                      mime: file.type,
                    })
                  ).key,
                ),
              );
            await attachFile(
              file,
              "enquiry",
              createdId,
              String(data.company_id),
              uploadKeys.get(file),
            );
            completed.add(file);
          }
          if (intent?.value === "review")
            await post("/api/procurement/review", {
              enquiry_id: String(createdId),
              company_id: data.company_id,
            });
          location.assign(String(result.redirect));
        } catch (e) {
          if (creating && (!(e instanceof ApiError) || e.status >= 500)) {
            form.dataset.uncertain = "true";
            say(
              form,
              "Creation could not be confirmed. Check My Enquiries before creating another record.",
              true,
            );
            const link = document.createElement("a");
            link.href = "/app/enquiries?tab=mine";
            link.className = "text-link";
            link.textContent = "Check My Enquiries";
            form.append(link);
          } else
            say(
              form,
              (e as Error).message +
                (createdId
                  ? " Your draft is saved. Retry here or open it from My Enquiries."
                  : ""),
              true,
            );
        } finally {
          delete form.dataset.busy;
          form.removeAttribute("aria-busy");
          buttons.forEach(
            (b) => (b.disabled = form.dataset.uncertain === "true"),
          );
        }
      });
    });
  document
    .querySelectorAll<HTMLFormElement>("[data-file-form]")
    .forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = "true";
      let key: string | undefined, chosen: File | undefined;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (form.dataset.busy || !form.reportValidity()) return;
        const file =
          form.querySelector<HTMLInputElement>("input[type=file]")?.files?.[0];
        if (!file) return;
        try {
          validatePicked(file);
        } catch (e) {
          say(form, (e as Error).message, true);
          return;
        }
        if (chosen && chosen !== file) {
          say(
            form,
            "Retry the original file first, or reload to start a new upload.",
            true,
          );
          return;
        }
        chosen = file;
        form.dataset.busy = "true";
        const data = Object.fromEntries(new FormData(form));
        const button = form.querySelector<HTMLButtonElement>("button")!;
        button.disabled = true;
        say(form, "Uploading…");
        try {
          if (!key)
            key = String(
              (
                await post("/api/uploads/prepare", {
                  kind: form.dataset.kind,
                  target_id: data.target_id,
                  company_id: data.company_id,
                  mime: file.type,
                })
              ).key,
            );
          await attachFile(
            file,
            form.dataset.kind as "enquiry" | "message",
            Number(data.target_id),
            String(data.company_id),
            key,
          );
          key = undefined;
          chosen = undefined;
          form.reset();
          say(form, "File attached.");
          if (form.dataset.kind === "message")
            document.dispatchEvent(new Event("salam-messages-refresh"));
          else location.reload();
        } catch (e) {
          say(
            form,
            (e as Error).message +
              " Retry this file to finish the same upload.",
            true,
          );
        } finally {
          delete form.dataset.busy;
          button.disabled = false;
        }
      });
    });
}
