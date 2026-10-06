export function bindWizards() {
  document
    .querySelectorAll<HTMLFormElement>("form[data-review-form]")
    .forEach((form) => {
      if (form.dataset.wizardBound) return;
      form.dataset.wizardBound = "true";
      let step = 0;
      const pages = Array.from(
        form.querySelectorAll<HTMLElement>("[data-wizard-step]"),
      );
      const show = () => {
        pages.forEach((page, index) => (page.hidden = index !== step));
        form.dataset.wizardStep = String(step);
        form
          .querySelectorAll<HTMLElement>("[data-step-label]")
          .forEach((label, index) =>
            index === step
              ? label.setAttribute("aria-current", "step")
              : label.removeAttribute("aria-current"),
          );
        form
          .querySelectorAll<HTMLElement>("[data-wizard-submit]")
          .forEach((button) => (button.hidden = step !== pages.length - 1));
        form.querySelector<HTMLElement>("[data-wizard-next]")!.hidden =
          step === pages.length - 1;
        form.querySelector<HTMLElement>("[data-wizard-back]")!.hidden =
          step === 0;
      };
      const summary = () => {
        const list = form.querySelector<HTMLElement>("[data-review-summary]")!;
        list.replaceChildren();
        form
          .querySelectorAll<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          >("input[name],select[name],textarea[name]")
          .forEach((input) => {
            if (
              input.type === "hidden" ||
              input.type === "checkbox" ||
              !input.value
            )
              return;
            const div = document.createElement("div");
            div.className = "info-row";
            const term = document.createElement("dt"),
              value = document.createElement("dd");
            term.textContent =
              input.closest("label")?.firstChild?.textContent?.trim() ??
              input.name.replaceAll("_", " ");
            value.textContent =
              input instanceof HTMLSelectElement
                ? (input.selectedOptions[0]?.text ?? input.value)
                : input.type === "file"
                  ? (input as HTMLInputElement).files?.length + " selected"
                  : input.value;
            div.append(term, value);
            list.append(div);
          });
        const specs = Array.from(
          form.querySelectorAll<HTMLInputElement>("[data-spec-key]"),
        );
        if (specs.length) {
          const row = document.createElement("div");
          row.className = "info-row";
          const term = document.createElement("dt"),
            value = document.createElement("dd");
          term.textContent = "Specifications";
          value.textContent = specs
            .map(
              (input) =>
                input.value +
                ": " +
                input
                  .closest(".spec-row")
                  ?.querySelector<HTMLInputElement>("[data-spec-value]")?.value,
            )
            .join("; ");
          row.append(term, value);
          list.append(row);
        }
      };
      const next = () => {
        const controls = pages[step].querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("input,select,textarea");
        for (const control of controls) {
          if (!control.checkValidity()) {
            control.reportValidity();
            return;
          }
        }
        if (step < pages.length - 1) {
          step++;
          if (step === pages.length - 1) summary();
          show();
          pages[step]
            .querySelector<
              HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >("input,select,textarea")
            ?.focus();
        }
      };
      form.querySelector("[data-wizard-next]")?.addEventListener("click", next);
      form
        .querySelector("[data-wizard-back]")
        ?.addEventListener("click", () => {
          if (step > 0) {
            step--;
            show();
          }
        });
      form.addEventListener(
        "submit",
        (event) => {
          if (step !== pages.length - 1) {
            event.preventDefault();
            next();
            return;
          }
          for (const [index, page] of pages.entries()) {
            const invalid = Array.from(
              page.querySelectorAll<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
              >("input,select,textarea"),
            ).find((control) => !control.checkValidity());
            if (invalid) {
              event.preventDefault();
              step = index;
              show();
              invalid.reportValidity();
              return;
            }
          }
        },
        true,
      );
      show();
    });
}
