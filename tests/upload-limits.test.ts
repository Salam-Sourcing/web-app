import assert from "node:assert/strict";
import { test } from "node:test";
import { validateFile } from "../src/lib/catalog.ts";
import { validatePicked } from "../src/scripts/procurement.ts";

for (const kind of [
  "listing",
  "company",
  "profile",
  "message",
  "enquiry",
  "document",
  "deal",
] as const) {
  for (const mime of [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]) {
    if (
      mime === "application/pdf" &&
      ["listing", "company", "profile"].includes(kind)
    )
      continue;
    if (kind === "deal" && mime === "image/webp") continue;
    test(`${kind} ${mime} accepts its exact limit and rejects one byte over`, () => {
      const max = (mime === "application/pdf" ? 10 : 5) * 1024 * 1024;
      const bytes = new Uint8Array(max);
      bytes.set(
        mime === "image/jpeg"
          ? [255, 216, 255]
          : mime === "image/png"
            ? [137, 80, 78, 71, 13, 10, 26, 10]
            : new TextEncoder().encode(
                mime === "image/webp" ? "RIFFxxxxWEBP" : "%PDF-1.7",
              ),
      );
      validateFile(bytes, mime, kind);
      assert.throws(
        () => validateFile(new Uint8Array(max + 1), mime, kind),
        /up to (5|10) MB/,
      );
      validatePicked({ type: mime, size: max } as File, kind);
      assert.throws(() =>
        validatePicked({ type: mime, size: max + 1 } as File, kind),
      );
      assert.throws(() => validateFile(new Uint8Array(0), mime, kind));
    });
  }
}
