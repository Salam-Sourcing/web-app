import type { Workspace } from "./access";
import { checked } from "./catalog";
import type { Rate, CurrencyState } from "../listing-currency";
export async function currencyPreference(state: Workspace) {
  const { data, error } = await state.client
    .from("listing_currency_preferences")
    .select("currency")
    .eq("user_id", state.user.id)
    .maybeSingle();
  checked(error);
  return data?.currency ?? null;
}
export async function listingCurrencyState(
  state: Workspace,
  includeRates = false,
): Promise<CurrencyState> {
  const currency = await currencyPreference(state);
  if (!currency && !includeRates) return { currency, rates: [] };
  try {
    const cached = await state.client
      .from("listing_exchange_rates")
      .select("rates,fetched_at")
      .eq("singleton", true)
      .maybeSingle();
    const age = Date.now() - Date.parse(cached.data?.fetched_at ?? "");
    if (
      !cached.error &&
      age >= 0 &&
      age < 86400000 &&
      Array.isArray(cached.data?.rates)
    )
      return { currency, rates: cached.data.rates as unknown as Rate[] };
    const { data, error } = await state.client.functions.invoke(
      "listing-exchange-rates",
    );
    if (error) return { currency, rates: [] };
    return {
      currency,
      rates: Array.isArray(data?.rates) ? (data.rates as Rate[]) : [],
    };
  } catch {
    return { currency, rates: [] };
  }
}
