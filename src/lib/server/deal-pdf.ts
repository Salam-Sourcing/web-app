import { statusLabel } from "../status-label";
import { pdfWriter } from "./business-pdf";
import type { DealBundle } from "../deals";
import type { Enquiry, Quote } from "../procurement";
import { money, dateLabel, quantityLabel } from "../procurement";
export async function dealPdf(
  bundle: DealBundle,
  e: Enquiry,
  q: Quote | null,
  fontBytes: Uint8Array,
  now = new Date(),
) {
  const d = bundle.deal,
    p = bundle.progress;
  const { line, field, gap, save } = await pdfWriter(
    "Deal summary #" + d.id,
    "DEAL SUMMARY",
    fontBytes,
    now,
  );
  line("Deal #" + d.id + ": " + d.product_name, 16, true);
  gap(12);
  for (const [label, value] of [
    ["Buyer", bundle.buyer],
    ["Supplier", bundle.supplier],
    ["Enquiry", "#" + e.id + " - " + e.title],
    ["Requirements", e.message ?? ""],
    ["Quantity", quantityLabel(e)],
    ["Deal status", statusLabel(d.status)],
    ["Agreed value", money(d.deal_value_estimate, d.currency)],
    ["Agreed", dateLabel(d.agreed_at)],
    ["Delivery progress", statusLabel(p.stage)],
    ["Expected delivery", p.expected_delivery ?? ""],
    ["Tracking / reference", p.tracking_reference ?? ""],
    ["Buyer completion", dateLabel(d.buyer_completed_at)],
    ["Supplier completion", dateLabel(d.supplier_completed_at)],
    ["Completed", dateLabel(d.completed_at)],
  ])
    field(label, value);
  if (q) {
    line("Accepted quote #" + q.id + " - Version " + q.version, 14, true);
    gap(8);
    for (const [label, value] of [
      [
        "Total / unit price",
        money(q.total_price, q.currency) +
          " / " +
          money(q.price_per_unit, q.currency),
      ],
      [
        "Lead time",
        q.lead_time_days === null ? "" : q.lead_time_days + " days",
      ],
      ["Quote validity", dateLabel(q.valid_until)],
      ["Payment terms", q.payment_terms ?? ""],
      ["Shipping terms", q.shipping_terms ?? ""],
      ["Quote notes", q.notes ?? ""],
    ])
      field(label, value);
  }
  line("Milestone history", 14, true);
  gap(8);
  for (const event of bundle.events) {
    field(
      "Milestone",
      statusLabel(event.stage) +
        " - " +
        (event.company_id === d.buyer_company_id
          ? bundle.buyer
          : bundle.supplier),
    );
    field("Recorded", dateLabel(event.created_at));
    field("Shared note", event.note);
  }
  if (bundle.events.length === 100)
    line("Latest 100 milestones are included.", 9);
  line("Shared document names", 14, true);
  gap(8);
  for (const a of bundle.documents) line(a.file_name);
  line("Private files and access links are not embedded in this summary.", 9);
  return save();
}
