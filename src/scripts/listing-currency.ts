import {
  listingPriceDisplay,
  type CurrencyState,
} from "../lib/listing-currency";
let state: Promise<CurrencyState> | undefined;
let checkedAt = 0;
let listening = false;
function load() {
  return (state ??= (async () => {
    checkedAt = Date.now();
    try {
      const wantsRates = document.querySelector("[data-currency-select]")
        ? "?rates=1"
        : "";
      const response = await fetch("/api/listing-currency" + wantsRates, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Currency unavailable");
      const data = await response.json();
      if (
        data.fingerprint !==
        document.querySelector<HTMLElement>("[data-fingerprint]")?.dataset
          .fingerprint
      )
        throw new Error("Account changed");
      return {
        currency: data.currency,
        rates: Array.isArray(data.rates) ? data.rates : [],
      } as CurrencyState;
    } catch {
      return { currency: null, rates: [], unavailable: true };
    }
  })());
}
function render(node: HTMLElement, value: CurrencyState) {
  const price = listingPriceDisplay(
    Number(node.dataset.amount),
    node.dataset.currency!,
    node.dataset.unit!,
    value,
  );
  node.querySelector<HTMLElement>("[data-price-value]")!.textContent =
    price.price;
  const note = node.querySelector<HTMLElement>("[data-price-note]")!;
  note.textContent = price.note;
  note.hidden = !price.note;
  node.removeAttribute("aria-busy");
}
export function bindListingPrices(root: ParentNode = document) {
  if (!listening) {
    listening = true;
    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        Date.now() - checkedAt < 60000
      )
        return;
      state = undefined;
      document
        .querySelectorAll<HTMLElement>("[data-listing-price]")
        .forEach((node) => delete node.dataset.currencyBound);
      bindListingPrices();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("online", refresh);
  }
  root.querySelectorAll<HTMLElement>("[data-listing-price]").forEach((node) => {
    if (node.dataset.currencyBound) return;
    node.dataset.currencyBound = "1";
    node.setAttribute("aria-busy", "true");
    const note = node.querySelector<HTMLElement>("[data-price-note]")!;
    note.textContent = "Checking display currency…";
    note.hidden = false;
    void load().then((value) => {
      const select = document.querySelector<HTMLSelectElement>(
        "[data-currency-select]",
      );
      render(
        node,
        !value.unavailable && select && node.closest("[data-currency-preview]")
          ? { ...value, currency: select.value || null }
          : value,
      );
    });
  });
}
export function bindCurrencyPreview() {
  const select = document.querySelector<HTMLSelectElement>(
    "[data-currency-select]",
  );
  if (!select) return;
  select.addEventListener("change", async () => {
    const value = await load();
    document
      .querySelectorAll<HTMLElement>(
        "[data-currency-preview] [data-listing-price]",
      )
      .forEach((node) =>
        render(
          node,
          value.unavailable
            ? value
            : { ...value, currency: select.value || null },
        ),
      );
  });
}
