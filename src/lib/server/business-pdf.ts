import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AccessError } from "../security";
export async function pdfWriter(
  title: string,
  label: string,
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
          "This export contains characters the PDF font cannot render. View the full record on the website.",
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
    page.drawText(label, {
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
    page.drawText(
      "Business summary only. Not an invoice, payment receipt or proof of delivery.",
      { x: left, y: 17, size: 7, font, color: rgb(0.38, 0.4, 0.44) },
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
  return {
    line,
    field,
    newPage,
    gap: (space: number) => {
      y -= space;
    },
    low: () => y < height / 2,
    save: async () => {
      pdf.setTitle(title);
      pdf.setAuthor("Salam Sourcing");
      pdf.setCreationDate(now);
      return pdf.save();
    },
  };
}
