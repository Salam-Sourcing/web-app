import currencies from "../../parity/currencies.json";
export { currencies };
export type Rate = { base: string; quote: string; rate: number; date: string };
export type CurrencyState = {
  currency: string | null;
  rates: Rate[];
  unavailable?: boolean;
};
export function preferredCurrency(value: unknown): string | null {
  if (value === "" || value === null) return null;
  if (typeof value !== "string" || !currencies.some((c) => c.code === value))
    throw new Error("Choose a supported display currency.");
  return value;
}
const day = 86400000;
function usable(row: Rate, now: number) {
  const date = Date.parse(row.date);
  return (
    row.base === "USD" &&
    Number.isFinite(row.rate) &&
    row.rate > 0 &&
    row.rate < 1e12 &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    Number.isFinite(date) &&
    date <= now + day &&
    now - date < 7 * day
  );
}
export function convertedPrice(
  amount: number,
  source: string,
  target: string | null,
  rates: Rate[],
  now = Date.now(),
) {
  if (!target || source === target || !Number.isFinite(amount) || amount < 0)
    return null;
  const find = (code: string): Rate | undefined =>
    code === "USD"
      ? {
          base: "USD",
          quote: "USD",
          rate: 1,
          date: new Date(now).toISOString().slice(0, 10),
        }
      : rates.find((row) => row.quote === code && usable(row, now));
  const from = find(source),
    to = find(target);
  if (!from || !to) return null;
  const value = (amount / from.rate) * to.rate;
  if (!Number.isFinite(value)) return null;
  return { amount: value, date: from.date < to.date ? from.date : to.date };
}
export function listingMoney(amount: number, code: string, original = false) {
  const digits = currencies.find((c) => c.code === code)?.digits ?? 2;
  return (
    code +
    " " +
    amount.toLocaleString("en", {
      minimumFractionDigits: digits,
      maximumFractionDigits:
        original || (amount > 0 && amount < 10 ** -digits) ? 6 : digits,
    })
  );
}
export function listingPriceDisplay(
  amount: number,
  source: string,
  unit: string,
  state: CurrencyState,
  now = Date.now(),
) {
  const original = listingMoney(amount, source, true) + " / " + unit;
  const conversion = convertedPrice(
    amount,
    source,
    state.currency,
    state.rates,
    now,
  );
  return conversion
    ? {
        price:
          "≈ " +
          listingMoney(conversion.amount, state.currency!) +
          " / " +
          unit,
        note: "Original: " + original + " · Rate: " + conversion.date,
      }
    : {
        price: original,
        note:
          state.currency && source !== state.currency
            ? "Conversion unavailable · Original price"
            : state.unavailable
              ? "Original price · Currency settings unavailable"
              : "",
      };
}
