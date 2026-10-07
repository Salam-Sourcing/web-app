import { submitChatOnEnter } from "../src/lib/chat-keyboard.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ownedIntent, uploadBucket } from "../src/lib/server/uploads.ts";
import { validateFile } from "../src/lib/catalog.ts";
import { validatePicked } from "../src/scripts/procurement.ts";
import { relatedListings } from "../src/lib/server/related-listings.ts";
const user = "00000000-0000-4000-8000-000000000001",
  key = "30000000-0000-4000-8000-000000000001";
test("company photo intent is limited to own immutable image path", () => {
  const value = {
    user,
    key,
    kind: "company",
    target: 1,
    created: Date.now(),
    mime: "image/png",
    path: `1/${user}/${key}.png`,
  };
  assert.equal(ownedIntent(value, user), true);
  assert.equal(uploadBucket("company"), "company-photos");
  assert.equal(
    ownedIntent({ ...value, path: `2/${user}/${key}.png` }, user),
    false,
  );
  assert.equal(
    ownedIntent(
      { ...value, mime: "application/pdf", path: `1/${user}/${key}.pdf` },
      user,
    ),
    false,
  );
  assert.equal(ownedIntent(value, "another-user"), false);
});
test("company photos enforce the same 5 MB image-only limits before upload", () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.doesNotThrow(() => validateFile(png, "image/png", "company"));
  assert.throws(() =>
    validateFile(new Uint8Array(5 * 1024 * 1024 + 1), "image/png", "company"),
  );
  assert.throws(() =>
    validateFile(
      new TextEncoder().encode("%PDF-1.7"),
      "application/pdf",
      "company",
    ),
  );
  assert.throws(() =>
    validatePicked(
      new File(["%PDF-1.7"], "x.pdf", { type: "application/pdf" }),
      "company",
    ),
  );
});
test("related listings use authenticated category search and exclude current product", async () => {
  const requests: unknown[] = [];
  const state = {
    user: { id: user },
    client: {
      rpc: async (name: string, args: unknown) => {
        requests.push([name, args]);
        return {
          error: null,
          data: [
            { id: 38, company_id: 78, name: "Current", category: "Packaging" },
            { id: 37, company_id: 78, name: "Related", category: "Packaging" },
          ],
        };
      },
      from: () => ({
        select: () => ({
          eq: () => ({ in: async () => ({ error: null, data: [] }) }),
        }),
      }),
    },
  };
  const rows = await relatedListings(state as never, {
    id: 38,
    category: "Packaging",
  });
  assert.deepEqual(
    rows.map((r) => r.id),
    [37],
  );
  assert.equal((requests[0] as any)[0], "search_marketplace");
  assert.equal((requests[0] as any)[1].p_filters.category, "Packaging");
  assert.deepEqual(
    await relatedListings(state as never, { id: 38, category: "" }),
    [],
  );
});

test("chat Enter submits only a ready draft; Shift Enter and IME keep editing", () => {
  const enter = { key: "Enter", shiftKey: false, isComposing: false };
  assert.equal(submitChatOnEnter(enter, false, false), true);
  assert.equal(submitChatOnEnter(enter, false, true), false);
  assert.equal(
    submitChatOnEnter({ ...enter, shiftKey: true }, false, false),
    false,
  );
  assert.equal(
    submitChatOnEnter({ ...enter, isComposing: true }, false, false),
    false,
  );
  assert.equal(submitChatOnEnter(enter, true, false), false);
});
