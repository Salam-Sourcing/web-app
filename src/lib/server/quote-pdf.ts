import { pdfWriter } from "./business-pdf";
import type { Enquiry, Quote } from "../procurement";
import { money, dateLabel, location, expired } from "../procurement";
export async function quotePdf(
  e: Enquiry,
  quotes: Quote[],
  names: Map<number, string>,
  fontBytes: Uint8Array,
  now = new Date(),
) {
  const { line, field, newPage, gap, low, save } = await pdfWriter(
    "Quotes for enquiry #" + e.id,
    "QUOTE EXPORT",
    fontBytes,
    now,
  );
  line("Enquiry #" + e.id + ": " + e.title, 16, true);
  gap(12);
  field("Buyer", names.get(e.buyer_company_id) ?? "Buyer unavailable");
  field("Requirements", e.message ?? "Not supplied");
  field(
    "Quantity / delivery",
    (e.quantity ?? "Not supplied") +
      " " +
      (e.unit_of_measure ?? "") +
      " / " +
      location(e),
  );
  field("Quote deadline", dateLabel(e.quote_deadline));
  line("Prices retain their original currencies. No conversion is applied.", 9);
  gap(15);
  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i];
    if (i > 0 || low()) newPage();
    line("Quote #" + q.id + " - Version " + q.version, 15, true);
    gap(10);
    field(
      "Supplier",
      names.get(q.supplier_company_id) ?? "Supplier unavailable",
    );
    field(
      "Status",
      q.status + (expired(q.valid_until, now.getTime()) ? " (expired)" : ""),
    );
    field(
      "Total price / unit price",
      money(q.total_price, q.currency) +
        " / " +
        money(q.price_per_unit, q.currency),
    );
    field(
      "Lead time",
      q.lead_time_days === null ? "Not supplied" : q.lead_time_days + " days",
    );
    field("Valid until", dateLabel(q.valid_until));
    field("Payment terms", q.payment_terms ?? "");
    field("Shipping terms", q.shipping_terms ?? "");
    field("Notes", q.notes ?? "");
    if (q.rejection_reason) field("Rejection reason", q.rejection_reason);
    field("Created", dateLabel(q.created_at));
  }
  return save();
}
