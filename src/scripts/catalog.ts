import { bindImageLoading } from "./loading";
import { toast } from "./toast";
import { post } from "./forms";
import type { ListingCardData } from "../lib/catalog";
import { uniquePage } from "../lib/catalog";
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(href: string, text: string, className = "") {
  const node = el("a", className, text);
  node.href = href;
  return node;
}
function saveButton(id: number, kind: string, saved: boolean, name: string) {
  const button = el("button", "save-button" + (saved ? " is-saved" : ""));
  button.type = "button";
  button.dataset.saveId = String(id);
  button.dataset.saveKind = kind;
  button.dataset.itemName = name;
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", (saved ? "Remove saved " : "Save ") + name);
  const heart = el("span", "", saved ? "♥" : "♡");
  heart.setAttribute("aria-hidden", "true");
  const label = el("span", "", saved ? "Saved" : "Save");
  label.dataset.saveLabel = "";
  button.append(heart, label);
  return button;
}
function listingCard(row: ListingCardData) {
  const card = el("article", "listing-card");
  card.dataset.recordId = String(row.id);
  const picture = el("div", "listing-picture");
  const imageLink = link("/listings/" + row.id, "");
  imageLink.setAttribute("aria-label", "View " + row.name);
  imageLink.append(el("span", "image-placeholder", "▧"));
  if (row.has_image) {
    const image = el("img", "");
    image.alt = row.name;
    image.src = "/api/media/listing/" + row.id;
    image.loading = "lazy";
    image.dataset.privateMedia = "";
    image.addEventListener("error", () => (image.hidden = true));
    imageLink.append(image);
  }
  picture.append(imageLink);
  const body = el("div", "listing-card-body");
  body.append(
    link(
      "/suppliers/" + row.company_id,
      row.vendor_name,
      "eyebrow supplier-link",
    ),
  );
  const title = el("h2", "");
  title.append(link("/listings/" + row.id, row.name));
  body.append(title);
  if (row.category) body.append(el("p", "help-text", row.category));
  const facts = el("div", "listing-facts");
  if (row.price_per_unit !== null)
    facts.append(
      el(
        "strong",
        "",
        row.currency +
          " " +
          row.price_per_unit.toLocaleString("en") +
          " / " +
          row.unit_of_measure,
      ),
    );
  if (row.minimum_order_quantity !== null)
    facts.append(
      el(
        "p",
        "",
        "MOQ: " + row.minimum_order_quantity + " " + row.unit_of_measure,
      ),
    );
  if (row.location) facts.append(el("p", "", row.location));
  body.append(facts, saveButton(row.id, "listing", row.saved, row.name));
  card.append(picture, body);
  bindImageLoading(card);
  return card;
}
function supplierCard(row: {
  id: number;
  profile: {
    display_name: string;
    verification_status: string;
    city: string | null;
    province_state: string | null;
    country: string;
    total_reviews: number;
    total_listings: number;
  } | null;
}) {
  const card = el("article", "card supplier-card");
  card.dataset.recordId = String(row.id);
  const heading = el("h2", "");
  if (row.profile) {
    heading.append(link("/suppliers/" + row.id, row.profile.display_name));
    card.append(heading);
    card.append(
      el(
        "p",
        "help-text",
        [row.profile.city, row.profile.province_state, row.profile.country]
          .filter(Boolean)
          .join(", "),
      ),
      el(
        "p",
        "",
        row.profile.total_reviews +
          " reviews · " +
          row.profile.total_listings +
          " listings",
      ),
    );
  } else {
    heading.textContent = "Supplier unavailable";
    card.append(
      heading,
      el(
        "p",
        "help-text",
        "This saved supplier is no longer accessible. You can remove it from your account.",
      ),
    );
  }
  card.append(
    saveButton(
      row.id,
      "company",
      true,
      row.profile?.display_name ?? "unavailable supplier",
    ),
  );
  return card;
}
export function bindCatalog() {
  document
    .querySelectorAll<HTMLImageElement>("img[data-private-media]")
    .forEach((image) => {
      image.addEventListener("error", () => (image.hidden = true));
    });
  document
    .querySelectorAll<HTMLElement>("[data-catalog-feed]")
    .forEach((feed) => {
      if (feed.dataset.bound) return;
      feed.dataset.bound = "true";
      const form = feed.querySelector<HTMLFormElement>("[data-discovery-form]"),
        results = feed.querySelector<HTMLElement>("[data-feed-results]")!,
        message = feed.querySelector<HTMLElement>("[data-feed-message]")!,
        more = feed.querySelector<HTMLAnchorElement>("[data-feed-more]")!,
        empty = feed.querySelector<HTMLElement>("[data-feed-empty]")!;
      const supplierTab = feed.dataset.supplierTab === "true";
      let offset = Number(feed.dataset.offset ?? 0),
        generation = 0,
        controller: AbortController | undefined,
        timer: number | undefined,
        busy = false;
      let ids = Array.from(
        results.querySelectorAll<HTMLElement>("[data-record-id]"),
      ).map((node) => ({ id: Number(node.dataset.recordId) }));
      const parameters = () =>
        form
          ? new URLSearchParams(
              Array.from(new FormData(form)).map(([key, value]) => [
                key,
                String(value),
              ]),
            )
          : new URLSearchParams(location.search);
      const load = async (append = false) => {
        if (append && busy) return;
        const ownGeneration = ++generation;
        controller?.abort();
        controller = new AbortController();
        busy = true;
        message.dataset.loading = "true";
        message.hidden = false;
        message.textContent = append ? "Loading more…" : "Searching…";
        message.setAttribute("role", "status");
        results.setAttribute("aria-busy", "true");
        more.setAttribute("aria-disabled", "true");
        const params = parameters();
        if (supplierTab) params.set("tab", "suppliers");
        params.set("offset", String(append ? offset : 0));
        try {
          const response = await fetch("/api/catalog/search?" + params, {
            credentials: "same-origin",
            cache: "no-store",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(30000),
            ]),
          });
          const data = (await response.json()) as {
            rows: any[];
            nextOffset: number;
            hasMore: boolean;
            error?: string;
            redirect?: string;
            fingerprint?: string;
          };
          if (ownGeneration !== generation) return;
          if (!response.ok) {
            if (data.redirect === "/login" || data.redirect === "/auth/mfa")
              location.replace(data.redirect);
            throw new Error(data.error ?? "Unable to load listings.");
          }
          if (
            data.fingerprint !==
            document.querySelector<HTMLElement>("#private-content")?.dataset
              .fingerprint
          ) {
            location.reload();
            return;
          }
          const fresh = uniquePage(append ? ids : [], data.rows).filter(
            (row) => !append || !ids.some((old) => old.id === row.id),
          );
          if (!append) {
            results.replaceChildren();
            ids = [];
          }
          for (const row of fresh)
            results.append(
              supplierTab
                ? supplierCard(row as Parameters<typeof supplierCard>[0])
                : listingCard(row as ListingCardData),
            );
          ids = uniquePage(ids, fresh);
          offset = data.nextOffset;
          more.hidden = !data.hasMore;
          empty.hidden = ids.length > 0;
          const nextParams = new URLSearchParams(params);
          nextParams.set("offset", String(offset));
          more.href = "?" + nextParams;
          params.delete("offset");
          history.replaceState(
            null,
            "",
            location.pathname + (params.size ? "?" + params : ""),
          );
          feed
            .querySelectorAll<HTMLAnchorElement>("[data-category]")
            .forEach((a) =>
              a.dataset.category === params.get("category")
                ? a.setAttribute("aria-current", "page")
                : a.removeAttribute("aria-current"),
            );
          message.dataset.loading = "false";
          message.hidden = true;
          feed
            .querySelector<HTMLElement>("[data-feed-retry]")
            ?.setAttribute("hidden", "");
        } catch (error) {
          if (ownGeneration === generation) {
            message.hidden = false;
            message.dataset.loading = "false";
            message.setAttribute("role", "alert");
            message.textContent =
              (error instanceof Error
                ? error.message
                : "Unable to load results.") +
              " Your earlier results are retained. Retry your search.";
            let retry =
              feed.querySelector<HTMLAnchorElement>("[data-feed-retry]");
            if (!retry) {
              retry = link(
                location.pathname + location.search,
                "Retry",
                "button secondary",
              );
              retry.dataset.feedRetry = "";
              feed.insertBefore(retry, results);
            }
            retry.hidden = false;
          }
        } finally {
          if (ownGeneration === generation) {
            busy = false;
            results.removeAttribute("aria-busy");
            more.removeAttribute("aria-disabled");
          }
        }
      };
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (form.reportValidity()) void load();
      });
      form?.addEventListener("input", (event) => {
        if ((event.target as HTMLInputElement).name !== "query") return;
        ++generation;
        controller?.abort();
        clearTimeout(timer);
        timer = window.setTimeout(() => void load(), 350);
      });
      form?.addEventListener("change", (event) => {
        if (
          (event.target as HTMLInputElement).name !== "query" &&
          form.reportValidity()
        )
          void load();
      });
      feed.addEventListener("click", (event) => {
        const category = (event.target as Element).closest<HTMLAnchorElement>(
          "[data-category]",
        );
        if (category && form) {
          event.preventDefault();
          form.querySelector<HTMLInputElement>(
            'input[name="category"]',
          )!.value = category.dataset.category ?? "";
          void load();
        }
        if ((event.target as Element).closest("[data-feed-more]")) {
          event.preventDefault();
          void load(true);
        }
        if ((event.target as Element).closest("[data-feed-retry]")) {
          event.preventDefault();
          void load();
        }
      });
      window.addEventListener(
        "pagehide",
        () => {
          generation++;
          controller?.abort();
          clearTimeout(timer);
        },
        { once: true },
      );
    });
}
export function bindSavedActions() {
  document
    .querySelectorAll<HTMLImageElement>("img[data-private-media]")
    .forEach((image) => {
      const hide = () => (image.hidden = true);
      image.addEventListener("error", hide);
      if (image.complete && image.naturalWidth === 0) hide();
    });

  document.addEventListener("click", async (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "[data-save-id]",
    );
    if (!button || button.disabled) return;
    button.disabled = true;
    const old = button.getAttribute("aria-pressed") === "true";
    try {
      const result = await post("/api/catalog/save", {
        id: button.dataset.saveId,
        kind: button.dataset.saveKind,
        saved: !old,
      });
      const saved = result.saved === true;
      document
        .querySelectorAll<HTMLButtonElement>("[data-save-id]")
        .forEach((other) => {
          if (
            other.dataset.saveId !== button.dataset.saveId ||
            other.dataset.saveKind !== button.dataset.saveKind
          )
            return;
          other.setAttribute("aria-pressed", String(saved));
          other.classList.toggle("is-saved", saved);
          other.setAttribute(
            "aria-label",
            (saved ? "Remove saved " : "Save ") +
              (other.dataset.itemName ?? "item"),
          );
          other.querySelector("[data-save-label]")!.textContent = saved
            ? "Saved"
            : "Save";
          other.querySelector("span[aria-hidden]")!.textContent = saved
            ? "♥"
            : "♡";
        });
      toast(saved ? "Added to saved items" : "Removed from saved items");
      if (!saved && location.pathname === "/saved") {
        button.closest("[data-record-id]")?.remove();
        const feed =
          button.closest("[data-catalog-feed]") ??
          document.querySelector("[data-catalog-feed]");
        const empty = feed?.querySelector<HTMLElement>("[data-feed-empty]");
        if (empty && !feed?.querySelector("[data-record-id]"))
          empty.hidden = false;
      }
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Could not update this saved item. Retry.",
        true,
      );
    } finally {
      button.disabled = false;
    }
  });
  const recover = () => {
    void post("/api/uploads/recover", {}).catch(() => {});
  };
  recover();
  window.addEventListener("online", recover);
}
