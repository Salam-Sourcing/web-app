import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Enquiry, Quote } from "../procurement";
import { money, dateLabel, location, expired } from "../procurement";
import { AccessError } from "../security";
export async function quotePdf(
  e: Enquiry,
  quotes: Quote[],
  names: Map<number, string>,
  fontBytes: Uint8Array,
  now = new Date(),
) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const available = new Set(font.getCharacterSet());
  const normalize = (text: string) =>
    text
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .replaceAll("\t", "    ")
      .replace(/[\u2010-\u2015]/g, "-");
  const check = (text: string) => {
    for (const c of normalize(text)) {
      if (c !== "\n" && c !== "\r" && !available.has(c.codePointAt(0)!))
        throw new AccessError(
          422,
          "pdf_font_unavailable",
          "This export contains characters the PDF font cannot render. View the full quote on the website.",
        );
    }
  };
  const width = 595.28,
    height = 841.89,
    left = 44,
    right = width - 44,
    bottom = 60;
  let page = pdf.addPage([width, height]),
    y = height - 100,
    pageNo = 0;
  const header = () => {
    pageNo++;
    page.drawText("Salam Sourcing", {
      x: left,
      y: height - 45,
      size: 17,
      font,
      color: rgb(0.61, 0.15, 0.18),
    });
    page.drawText("QUOTE EXPORT", {
      x: left,
      y: height - 65,
      size: 9,
      font,
      color: rgb(0.38, 0.4, 0.44),
    });
    page.drawLine({
      start: { x: left, y: height - 77 },
      end: { x: right, y: height - 77 },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.9),
    });
    page.drawText(
      "Generated " + now.toISOString().slice(0, 16).replace("T", " ") + " UTC",
      { x: left, y: 30, size: 8, font, color: rgb(0.38, 0.4, 0.44) },
    );
    page.drawText(String(pageNo), { x: right - 15, y: 30, size: 9, font });
  };
  header();
  const newPage = () => {
    page = pdf.addPage([width, height]);
    y = height - 100;
    header();
  };
  const line = (text: string, size = 11, bold = false) => {
    check(text);
    const clean = normalize(text),
      max = right - left;
    for (const para of clean.split(/\r?\n/)) {
      let current = "";
      const paint = () => {
        if (y < bottom) newPage();
        page.drawText(current.trimEnd(), {
          x: left,
          y,
          size,
          font,
          color: bold ? rgb(0.1, 0.12, 0.16) : rgb(0.22, 0.25, 0.29),
        });
        y -= size * 1.5;
        current = "";
      };
      for (const token of para.match(/\S+\s*/g) ?? []) {
        if (current && font.widthOfTextAtSize(current + token, size) > max)
          paint();
        if (font.widthOfTextAtSize(token, size) <= max) {
          current += token;
          continue;
        }
        for (const char of token) {
          if (current && font.widthOfTextAtSize(current + char, size) > max)
            paint();
          current += char;
        }
      }
      if (y < bottom) newPage();
      if (current)
        page.drawText(current, {
          x: left,
          y,
          size,
          font,
          color: bold ? rgb(0.1, 0.12, 0.16) : rgb(0.22, 0.25, 0.29),
        });
      y -= size * 1.5;
    }
  };
  const field = (label: string, value: string) => {
    line(label, 9, true);
    line(value || "Not supplied", 11);
    y -= 6;
  };
  line("Enquiry #" + e.id + ": " + e.title, 16, true);
  y -= 12;
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
  y -= 15;
  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i];
    if (i > 0 || y < height / 2) newPage();
    line("Quote #" + q.id + " - Version " + q.version, 15, true);
    y -= 10;
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
  pdf.setTitle("Quotes for enquiry #" + e.id);
  pdf.setAuthor("Salam Sourcing");
  pdf.setCreationDate(now);
  return await pdf.save();
}
