import { post, ApiError } from "./forms";
import { prepareListingImage } from "./listing-images";
type Prepared = { key: string; target: number };
const plans = new WeakMap<File, Prepared>();
function display(form: HTMLFormElement, value: string, error = false) {
  const message = form.querySelector<HTMLElement>("[data-form-message]");
  if (message) {
    message.hidden = false;
    message.textContent = value;
    message.setAttribute("role", error ? "alert" : "status");
  }
}
async function upload(
  file: File,
  kind: "listing" | "document",
  target: number,
  company: string,
  documentType = "other",
) {
  let plan = plans.get(file);
  if (!plan || plan.target !== target) {
    const response = await post("/api/uploads/prepare", {
      kind,
      target_id: target,
      company_id: company,
      mime: file.type,
    });
    plan = { key: String(response.key), target };
    plans.set(file, plan);
  }
  const form = new FormData();
  form.set("key", plan.key);
  form.set("kind", kind);
  form.set("target_id", String(target));
  form.set("file", file);
  form.set("company_id", company);
  form.set("document_type", documentType);
  const response = await fetch("/api/uploads/attach", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    body: form,
    signal: AbortSignal.timeout(45000),
  });
  const result = (await response.json()) as {
    error?: string;
    redirect?: string;
  };
  if (!response.ok) {
    if (result.redirect === "/login" || result.redirect === "/auth/mfa")
      location.replace(result.redirect);
    throw new Error(
      result.error ??
        "File upload could not be confirmed. Retry from your saved draft.",
    );
  }
  plans.delete(file);
}
function validFiles(
  input: HTMLInputElement,
  existing: number,
  document = false,
) {
  const files = Array.from(input.files ?? []).filter(
    (file) => document || !completedFiles.has(file),
  );
  const error =
    !document && files.length + existing > 5
      ? "Choose at most five images including existing ones."
      : files.some(
            (f) => f.size === 0 || f.size > (document ? 10 : 50) * 1024 * 1024,
          )
        ? "Choose nonempty files up to " + (document ? "10" : "50") + " MB."
        : files.some(
              (f) =>
                !(
                  document
                    ? [
                        "application/pdf",
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                      ]
                    : ["image/jpeg", "image/png", "image/webp"]
                ).includes(f.type),
            )
          ? "Choose JPEG, PNG, WebP" + (document ? " or PDF" : "") + " files."
          : "";
  input.setCustomValidity(error);
  return files;
}
export function bindListingForms() {
  document
    .querySelectorAll<HTMLFormElement>("[data-listing-form]")
    .forEach((form) => {
      if (form.dataset.listingBound) return;
      form.dataset.listingBound = "true";
      const specs = form.querySelector<HTMLElement>("[data-specs]")!,
        images = form.querySelector<HTMLInputElement>('input[name="images"]')!;
      const previewURLs: string[] = [];
      let previewGeneration = 0;
      const clearPreviews = () => {
        previewGeneration++;
        previewURLs.splice(0).forEach(URL.revokeObjectURL);
        form.querySelector("[data-upload-previews]")?.replaceChildren();
      };
      images.addEventListener("change", async () => {
        clearPreviews();
        const generation = previewGeneration;
        const files = validFiles(
          images,
          Number(form.dataset.existingImages ?? 0),
        );
        if (!images.reportValidity()) return;
        try {
          for (const file of files) {
            const prepared = await prepareListingImage(file);
            if (generation !== previewGeneration || !form.isConnected) return;
            const image = document.createElement("img");
            image.alt = file.name;
            const url = URL.createObjectURL(prepared);
            previewURLs.push(url);
            image.src = url;
            form.querySelector("[data-upload-previews]")!.append(image);
          }
        } catch (error) {
          if (generation !== previewGeneration) return;
          images.setCustomValidity((error as Error).message);
          display(form, (error as Error).message, true);
        }
      });
      specs.addEventListener("click", (event) => {
        const button = (event.target as Element).closest("[data-spec-remove]");
        button?.closest(".spec-row")?.remove();
      });
      form.querySelector("[data-spec-add]")?.addEventListener("click", () => {
        if (specs.children.length >= 30) {
          display(form, "Use up to 30 specifications.", true);
          return;
        }
        const row = document.createElement("div");
        row.className = "spec-row";
        for (const [labelText, attribute, max] of [
          ["Name", "data-spec-key", 100],
          ["Value", "data-spec-value", 500],
        ] as const) {
          const label = document.createElement("label");
          label.className = "field";
          label.textContent = labelText;
          const input = document.createElement("input");
          input.setAttribute(attribute, "");
          input.maxLength = max;
          input.required = true;
          label.append(input);
          row.append(label);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button secondary";
        remove.setAttribute("data-spec-remove", "");
        remove.textContent = "Remove";
        row.append(remove);
        specs.append(row);
      });
      form.addEventListener("submit", async (event) => {
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (
          form.dataset.busy === "true" ||
          form.dataset.creationUncertain === "true"
        )
          return;
        const specification: Record<string, string> = Object.create(null);
        const keys = new Set<string>();
        for (const row of specs.querySelectorAll(".spec-row")) {
          const key = row
              .querySelector<HTMLInputElement>("[data-spec-key]")!
              .value.trim(),
            value = row
              .querySelector<HTMLInputElement>("[data-spec-value]")!
              .value.trim();
          if (!key || !value || keys.has(key)) {
            display(
              form,
              "Each specification needs a unique name and a value.",
              true,
            );
            return;
          }
          keys.add(key);
          specification[key] = value;
        }
        const files = validFiles(
          images,
          Number(form.dataset.existingImages ?? 0),
        );
        if (!form.reportValidity()) return;
        form.dataset.busy = "true";
        form.setAttribute("aria-busy", "true");
        const buttons = Array.from(
          form.querySelectorAll<HTMLButtonElement>("button"),
        );
        buttons.forEach((button) => (button.disabled = true));
        images.disabled = true;
        const company = String(new FormData(form).get("company_id"));
        let draftId = form.dataset.listingId;
        let uploaded = 0;
        let creationStarted = false;
        try {
          display(form, "Preparing your images…");
          const prepared = new Map<File, File>();
          for (const file of files)
            prepared.set(file, await prepareListingImage(file));
          const data = Object.fromEntries(
            Array.from(new FormData(form)).filter(([key]) => key !== "images"),
          );
          data.specifications = JSON.stringify(specification);
          if (draftId) data.listing_id = draftId;
          display(form, "Saving your draft…");
          creationStarted = true;
          const result = await post(
            "/api/catalog/listing-" + (draftId ? "update" : "create"),
            data,
          );
          draftId = String(result.id);
          form.dataset.listingId = draftId;
          const draftLink =
            form.querySelector<HTMLAnchorElement>("[data-saved-draft]")!;
          draftLink.hidden = false;
          draftLink.href = "/sell/" + draftId;
          // Keep a returned draft ID and uploaded files across retries. Never create a
          // second draft just because a later upload or review submission failed.
          const pending = files.filter((file) => !completedFiles.has(file));
          for (const file of pending) {
            display(
              form,
              "Draft saved. Uploading image " +
                (uploaded + 1) +
                " of " +
                pending.length +
                "…",
            );
            await upload(
              prepared.get(file)!,
              "listing",
              Number(draftId),
              company,
            );
            completedFiles.add(file);
            uploaded++;
            form.dataset.existingImages = String(
              Number(form.dataset.existingImages ?? 0) + 1,
            );
          }
          const finish = (event as SubmitEvent).submitter?.getAttribute(
            "value",
          );
          if (finish === "submit") {
            display(form, "Submitting for review…");
            await post("/api/catalog/listing-status", {
              listing_id: draftId,
              company_id: company,
              transition: "submit",
              confirm: "CONFIRM",
            });
          }
          location.assign(
            "/sell/" +
              draftId +
              "?saved=" +
              (finish === "submit" ? "review" : "draft"),
          );
        } catch (error) {
          if (
            creationStarted &&
            !draftId &&
            (!(error instanceof ApiError) || error.status >= 500)
          ) {
            form.dataset.creationUncertain = "true";
            display(
              form,
              "Creation could not be confirmed. Check Sell before creating another listing.",
              true,
            );
            const link =
              form.querySelector<HTMLAnchorElement>("[data-saved-draft]")!;
            link.hidden = false;
            link.href = "/sell";
            link.textContent = "Check your listings";
          } else
            display(
              form,
              (draftId ? "Your draft is saved. " : "") +
                (error instanceof Error ? error.message : "Please retry.") +
                " No listing is published until approved.",
              true,
            );
        } finally {
          form.dataset.busy = "false";
          images.disabled = false;
          form.removeAttribute("aria-busy");
          buttons.forEach(
            (button) =>
              (button.disabled = form.dataset.creationUncertain === "true"),
          );
        }
      });
      window.addEventListener("pagehide", clearPreviews, { once: true });
    });
}
const completedFiles = new WeakSet<File>();
export function bindDocumentUploads() {
  document
    .querySelectorAll<HTMLFormElement>("[data-document-upload]")
    .forEach((form) => {
      if (form.dataset.documentBound) return;
      form.dataset.documentBound = "true";
      const input = form.querySelector<HTMLInputElement>('input[name="file"]')!;
      input.addEventListener("change", () => {
        validFiles(input, 0, true);
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.busy === "true") return;
        const files = validFiles(input, 0, true);
        if (!form.reportValidity()) return;
        form.dataset.busy = "true";
        const button = form.querySelector<HTMLButtonElement>("button")!;
        button.disabled = true;
        try {
          const data = new FormData(form),
            company = String(data.get("company_id"));
          let id = form.dataset.verificationId;
          if (!id) {
            const result = await post("/api/catalog/verification-prepare", {
              company_id: company,
            });
            id = String(result.id);
            form.dataset.verificationId = id;
          }
          display(form, "Uploading your private document…");
          await upload(
            files[0],
            "document",
            Number(id),
            company,
            String(data.get("document_type")),
          );
          location.assign("/company");
        } catch (error) {
          display(
            form,
            error instanceof Error
              ? error.message
              : "Unable to upload this document.",
            true,
          );
        } finally {
          form.dataset.busy = "false";
          button.disabled = false;
        }
      });
    });
  document
    .querySelectorAll<HTMLFormElement>("[data-prepare-verification]")
    .forEach((form) =>
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector<HTMLButtonElement>("button")!;
        if (button.disabled) return;
        button.disabled = true;
        try {
          await post(
            "/api/catalog/verification-prepare",
            Object.fromEntries(new FormData(form)),
          );
          location.assign("/company");
        } catch (error) {
          display(
            form,
            error instanceof Error
              ? error.message
              : "Unable to prepare verification.",
            true,
          );
          button.disabled = false;
        }
      }),
    );
}
