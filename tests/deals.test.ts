import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import type { APIContext } from "astro";
import type { Workspace } from "../src/lib/server/access.ts";
import {
  nextMilestone,
  calendarDate,
  reviewRating,
  messageImage,
  type DealBundle,
  type ReviewState,
} from "../src/lib/deals.ts";
import { dealAction } from "../src/lib/server/deal-actions.ts";
import {
  dealBundle,
  editableDeal,
  companyReviews,
  dealDocumentUrl,
} from "../src/lib/server/deals.ts";
import { dealPdf } from "../src/lib/server/deal-pdf.ts";
import { ownedIntent, uploadBucket } from "../src/lib/server/uploads.ts";
import { validateFile } from "../src/lib/catalog.ts";
import type { Enquiry, Quote } from "../src/lib/procurement.ts";
import { AccessError } from "../src/lib/security.ts";
const bundle = {
  deal: {
    id: 7,
    enquiry_id: 5,
    quote_id: 20,
    buyer_company_id: 10,
    supplier_company_id: 30,
    status: "in_progress",
    product_name: "Stainless steel fasteners",
    currency: "CAD",
    deal_value_estimate: 450,
    buyer_completed_at: null,
    supplier_completed_at: null,
  },
  buyer: "Buyer company",
  supplier: "Supplier company",
  progress: { stage: "shipped" },
  events: [],
  documents: [],
} as unknown as DealBundle;
const eligibility = {
  can_confirm: true,
  can_review: false,
  own_confirmed: false,
  other_confirmed: false,
  review_id: null,
  deal_status: "in_progress",
  reviewed_company_id: 30,
  reviewed_company_name: "Supplier company",
  product_name: "Fasteners",
} as ReviewState;
function fixture(
  company = 10,
  permissions = ["procurement"],
  data = bundle,
  review = eligibility,
  error: unknown = null,
) {
  const calls: { name: string; args: any }[] = [];
  const state = {
    user: { id: "u1" },
    company: { id: company, role: "owner" },
    permissions,
    client: {
      rpc: async (name: string, args: any) => {
        calls.push({ name, args });
        return {
          data:
            name === "get_deal_progress"
              ? data
              : name === "get_deal_review_state"
                ? review
                : [],
          error,
        };
      },
      from: () => {
        const q: any = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({
            data: { id: 2, reviewed_company_id: company, status: "published" },
            error: null,
          }),
        };
        return q;
      },
    },
  } as unknown as Workspace;
  return {
    state,
    calls,
    context: { locals: { workspace: state } } as unknown as APIContext,
  };
}
test("milestones belong to the correct party and active sequential stage", () => {
  assert.equal(nextMilestone(bundle.deal, "agreed", 30), "preparing");
  assert.equal(nextMilestone(bundle.deal, "preparing", 30), "shipped");
  assert.equal(nextMilestone(bundle.deal, "shipped", 10), "received");
  for (const stage of ["agreed", "preparing", "received"])
    assert.equal(nextMilestone(bundle.deal, stage, 10), null);
  assert.equal(nextMilestone(bundle.deal, "shipped", 30), null);
  assert.equal(nextMilestone(bundle.deal, "shipped", 99), null);
  for (const status of ["completed", "cancelled", "disputed"])
    assert.equal(
      nextMilestone({ ...bundle.deal, status }, "shipped", 10),
      null,
    );
});
test("invalid dates, fractional stars and non-raster attachment types are rejected", () => {
  for (const date of ["2026-02-30", "2026-01-01T00:00:00Z", "tomorrow", 123])
    assert.throws(() => calendarDate(date), AccessError);
  assert.equal(calendarDate("2028-02-29"), "2028-02-29");
  assert.equal(calendarDate(""), undefined);
  for (const rating of [0, 6, 1.5, "bad"])
    assert.throws(() => reviewRating(rating), AccessError);
  assert.equal(reviewRating("5"), 5);
  for (const mime of ["image/png", "image/jpeg", "image/webp"])
    assert.equal(messageImage(mime), true);
  for (const mime of ["image/svg+xml", "text/html", "application/pdf", null])
    assert.equal(messageImage(mime), false);
});
test("company mismatch and bidder access do not invoke a business mutation", async () => {
  const f = fixture();
  await assert.rejects(
    dealAction(f.context, { company_id: "30", deal_id: "7" }, "complete"),
    AccessError,
  );
  assert.equal(f.calls.length, 0);
  const bidder = fixture(99, ["sales"]);
  await assert.rejects(dealBundle(bidder.state, 7), AccessError);
  assert.deepEqual(
    bidder.calls.map((c) => c.name),
    ["get_deal_progress"],
  );
});
test("restricted team member cannot advance or confirm a deal", async () => {
  const f = fixture(10, []);
  await assert.rejects(
    dealAction(
      f.context,
      { company_id: "10", deal_id: "7", confirm: "CONFIRM" },
      "complete",
    ),
    AccessError,
  );
  assert.ok(!f.calls.some((c) => c.name === "confirm_deal_completion"));
});
test("buyer receipt forwards original date, reference and trimmed note to guarded RPC", async () => {
  const f = fixture();
  const result = await dealAction(
    f.context,
    {
      company_id: "10",
      deal_id: "7",
      stage: "received",
      confirm: "CONFIRM",
      delivery: "2026-11-01",
      tracking: " Ref123 ",
      note: " Received ",
    },
    "advance",
  );
  assert.equal((await result.json()).redirect, "/deals/7");
  assert.deepEqual(f.calls.at(-1), {
    name: "advance_deal_progress",
    args: {
      p_deal_id: 7,
      p_company_id: 10,
      p_stage: "received",
      p_note: "Received",
      p_expected_delivery: "2026-11-01",
      p_tracking_reference: "Ref123",
    },
  });
});
test("wrong party, skipped milestone and stale duplicate are rejected before mutation", async () => {
  for (const stage of ["agreed", "preparing", "shipped"]) {
    const f = fixture();
    await assert.rejects(
      dealAction(
        f.context,
        { company_id: "10", deal_id: "7", stage, confirm: "CONFIRM" },
        "advance",
      ),
      AccessError,
    );
    assert.ok(!f.calls.some((c) => c.name === "advance_deal_progress"));
  }
  const f = fixture(10, ["procurement"], {
    ...bundle,
    progress: { stage: "received" },
  });
  await assert.rejects(
    dealAction(
      f.context,
      { company_id: "10", deal_id: "7", stage: "received", confirm: "CONFIRM" },
      "advance",
    ),
    AccessError,
  );
});
test("milestone and completion require explicit confirmation", async () => {
  for (const action of ["advance", "complete"]) {
    const f = fixture();
    await assert.rejects(
      dealAction(
        f.context,
        { company_id: "10", deal_id: "7", stage: "received" },
        action,
      ),
      AccessError,
    );
    assert.ok(
      !f.calls.some((c) =>
        ["advance_deal_progress", "confirm_deal_completion"].includes(c.name),
      ),
    );
  }
});
test("completion stays separate from delivery and obeys fresh eligibility", async () => {
  const f = fixture();
  await dealAction(
    f.context,
    { company_id: "10", deal_id: "7", confirm: "CONFIRM" },
    "complete",
  );
  assert.equal(f.calls.at(-1)?.name, "confirm_deal_completion");
  assert.ok(!f.calls.some((c) => c.name === "advance_deal_progress"));
  const blocked = fixture(10, ["procurement"], bundle, {
    ...eligibility,
    can_confirm: false,
  });
  await assert.rejects(
    dealAction(
      blocked.context,
      { company_id: "10", deal_id: "7", confirm: "CONFIRM" },
      "complete",
    ),
    AccessError,
  );
  assert.ok(!blocked.calls.some((c) => c.name === "confirm_deal_completion"));
});
test("reviews require both-party backend eligibility and preserve company scope", async () => {
  const denied = fixture();
  await assert.rejects(
    dealAction(
      denied.context,
      { company_id: "10", deal_id: "7", rating: "5", review: "Great service" },
      "review",
    ),
    AccessError,
  );
  const yes = fixture(10, ["procurement"], bundle, {
    ...eligibility,
    can_review: true,
  });
  await dealAction(
    yes.context,
    { company_id: "10", deal_id: "7", rating: "4", review: " Great service " },
    "review",
  );
  assert.deepEqual(yes.calls.at(-1), {
    name: "submit_company_review",
    args: {
      p_deal_id: 7,
      p_company_id: 10,
      p_rating: 4,
      p_review_text: "Great service",
    },
  });
});
test("backend denial or race failure remains an error, never successful completion", async () => {
  const f = fixture(10, ["procurement"], bundle, eligibility, {
    code: "42501",
    message: "Denied",
  });
  await assert.rejects(
    dealBundle(f.state, 7),
    (e) => e instanceof AccessError && e.status === 403,
  );
});
test("documents remain immutable and uploads close when the deal completes", async () => {
  const f = fixture(10, ["procurement"], {
    ...bundle,
    deal: { ...bundle.deal, status: "completed" },
  });
  await assert.rejects(
    editableDeal(f.state, 7),
    (e) => e instanceof AccessError && e.status === 409,
  );
  assert.equal(uploadBucket("deal"), "deal-documents");
  const key = "b430b035-8b81-4c56-81b6-a101fcf2ac77",
    intent = {
      user: "u1",
      kind: "deal",
      target: 7,
      key,
      path: "7/u1/" + key + ".png",
      mime: "image/png",
      created: Date.now(),
    };
  assert.ok(ownedIntent(intent, "u1"));
  assert.ok(!ownedIntent({ ...intent, mime: "image/webp" }, "u1"));
  assert.ok(!ownedIntent({ ...intent, path: "5/u1/" + key + ".png" }, "u1"));
  validateFile(new TextEncoder().encode("%PDF-1.7"), "application/pdf", "deal");
  assert.throws(
    () =>
      validateFile(
        new TextEncoder().encode("RIFFxxxxWEBP"),
        "image/webp",
        "deal",
      ),
    AccessError,
  );
});
test("deal documents allow exactly 10 MB but reject oversized files", () => {
  const bytes = new Uint8Array(10 * 1024 * 1024);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  validateFile(bytes, "image/png", "deal");
  assert.throws(
    () =>
      validateFile(new Uint8Array(10 * 1024 * 1024 + 1), "image/png", "deal"),
    AccessError,
  );
});
test("responses use the selected reviewed company and reject non-managers", async () => {
  const f = fixture();
  await dealAction(
    f.context,
    { company_id: "10", review_id: "2", response: " Thank you " },
    "respond",
  );
  assert.equal(f.calls.at(-1)?.args.p_response_text, "Thank you");
  const denied = fixture();
  denied.state.company!.role = "staff";
  await assert.rejects(
    dealAction(
      denied.context,
      { company_id: "10", review_id: "2", response: "Thank you" },
      "respond",
    ),
    AccessError,
  );
  assert.equal(denied.calls.length, 0);
});
test("reports work for signed-in accounts without a company and retain review identity", async () => {
  const f = fixture();
  f.state.company = null;
  await dealAction(
    f.context,
    {
      review_id: "2",
      reviewed_company_id: "30",
      reason: "misleading",
      description: "Wrong item mentioned",
    },
    "report",
  );
  assert.deepEqual(f.calls[0], {
    name: "report_company_review",
    args: {
      p_review_id: 2,
      p_reason: "misleading",
      p_description: "Wrong item mentioned",
    },
  });
});
test("review pagination retains offset and backend visibility errors", async () => {
  const f = fixture();
  await companyReviews(f.state, 30, 20);
  assert.deepEqual(f.calls[0].args, {
    p_company_id: 30,
    p_limit: 20,
    p_offset: 20,
  });
});
test("deal PDF includes long accepted terms, history and document names across pages", async () => {
  const font = new Uint8Array(
    await readFile(new URL("../public/fonts/Inter.ttf", import.meta.url)),
  );
  const e = {
    id: 5,
    title: "Stainless steel fasteners",
    message: "Requirements",
    quantity: 100,
    unit_of_measure: "units",
  } as Enquiry;
  const q = {
    id: 20,
    version: 1,
    total_price: 450,
    price_per_unit: 4.5,
    currency: "CAD",
    lead_time_days: 7,
    payment_terms: "Net 30",
    shipping_terms: "FOB Calgary",
    notes: "Long delivery requirements. ".repeat(450),
  } as Quote;
  const doc = await PDFDocument.load(
    await dealPdf(
      {
        ...bundle,
        events: [
          {
            id: 1,
            deal_id: 7,
            company_id: 30,
            stage: "shipped",
            created_at: "2026-10-05T12:00:00Z",
            note: "Tracking included",
          },
        ],
        documents: [
          { id: 1, file_name: "certificate.pdf", storage_path: "private-path" },
        ],
      },
      e,
      q,
      font,
      new Date("2026-10-05T00:00:00Z"),
    ),
  );
  assert.ok(doc.getPageCount() > 3);
  assert.equal(doc.getTitle(), "Deal summary #7");
  assert.equal(
    doc.getCreationDate()?.toISOString(),
    "2026-10-05T00:00:00.000Z",
  );
});

test("private document URLs authorize the selected party before signing for five minutes", async () => {
  const f = fixture(),
    signed: any[] = [];
  const doc = {
    deal_id: 7,
    storage_path: "7/u1/certification.pdf",
    file_mime_type: "application/pdf",
  };
  f.state.client.from = (() => {
    const q: any = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: doc, error: null }),
    };
    return q;
  }) as any;
  (f.state.client as any).storage = {
    from: (bucket: string) => ({
      createSignedUrl: async (path: string, seconds: number) => {
        signed.push({ bucket, path, seconds });
        return {
          data: { signedUrl: "https://example.test/authorized" },
          error: null,
        };
      },
    }),
  };
  assert.equal(
    await dealDocumentUrl(f.state, 91, "https://example.supabase.co"),
    "https://example.test/authorized",
  );
  assert.deepEqual(signed, [
    { bucket: "deal-documents", path: "7/u1/certification.pdf", seconds: 300 },
  ]);
  f.state.company!.id = 99;
  await assert.rejects(
    dealDocumentUrl(f.state, 91, "https://example.supabase.co"),
    AccessError,
  );
  assert.equal(signed.length, 1);
});
test("foreign bucket URLs and missing document references never produce a signed URL", async () => {
  const f = fixture();
  f.state.client.from = (() => {
    const q: any = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({
        data: {
          deal_id: 7,
          storage_path: "https://evil.test/file.pdf",
          file_mime_type: "application/pdf",
        },
        error: null,
      }),
    };
    return q;
  }) as any;
  await assert.rejects(
    dealDocumentUrl(f.state, 91, "https://example.supabase.co"),
    AccessError,
  );
});
