import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import type { APIContext } from "astro";
import type { Workspace } from "../src/lib/server/access.ts";
import {
  enquiryPayload,
  quotePayload,
  quoteOrder,
  historyCursor,
  mergeMessages,
  pendingText,
  type Enquiry,
  type Quote,
  type ThreadMessage,
} from "../src/lib/procurement.ts";
import {
  verifiedCompany,
  quoteTarget,
  conversation,
  sendText,
  messagePage,
  conversationFeed,
  quoteBundle,
} from "../src/lib/server/procurement.ts";
import { procurementAction } from "../src/lib/server/procurement-actions.ts";
import {
  ownedIntent,
  uploadBucket,
  attachMessageMetadata,
} from "../src/lib/server/uploads.ts";
import { validateFile } from "../src/lib/catalog.ts";
import { quotePdf } from "../src/lib/server/quote-pdf.ts";
import { AccessError } from "../src/lib/security.ts";
const future = "2099-01-01T12:00:00Z";
const e = {
  id: 5,
  buyer_company_id: 10,
  supplier_company_id: null,
  enquiry_type: "public_rfq",
  title: "Steel bolts",
  message: "Stainless steel bolts",
  status: "open",
  publication_status: "published",
  visibility: "public",
  quote_deadline: future,
  quantity: 100,
  unit_of_measure: "units",
  currency: "CAD",
  delivery_country: "Canada",
  delivery_city: "Calgary",
  delivery_province_state: "Alberta",
} as Enquiry;
const q = {
  id: 20,
  enquiry_id: 5,
  supplier_company_id: 30,
  status: "sent",
  version: 1,
  total_price: 200,
  price_per_unit: 2,
  currency: "CAD",
  lead_time_days: 7,
  created_at: "2026-01-01T12:00:00Z",
  valid_until: future,
  notes: "Delivery included",
  payment_terms: "Net 30",
  shipping_terms: "FOB",
} as Quote;
function state(
  client: unknown = {},
  company = 10,
  permissions = ["procurement", "sales"],
) {
  return {
    client,
    user: { id: "u1" },
    company: { id: company, role: "owner", verification_status: "verified" },
    companies: [],
    permissions,
    factors: [],
    allFactors: [],
    needsMfa: false,
    profile: { status: "active" },
  } as unknown as Workspace;
}
function client(
  tables: Record<string, unknown>,
  rpc?: (name: string, args: unknown) => unknown,
) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  return {
    calls,
    rpc: async (name: string, args: unknown) =>
      rpc?.(name, args) ?? {
        data: [{ id: 10, verification_status: "verified" }],
        error: null,
      },
    from(table: string) {
      let filters: Record<string, unknown> = {};
      const query: any = {};
      for (const method of [
        "select",
        "eq",
        "neq",
        "in",
        "or",
        "order",
        "limit",
        "range",
        "insert",
        "upsert",
        "delete",
        "gt",
        "ilike",
      ])
        query[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          if (method === "eq") filters[String(args[0])] = args[1];
          return query;
        };
      const result = () => ({
        data:
          typeof tables[table] === "function"
            ? (tables[table] as Function)(filters)
            : (tables[table] ?? null),
        error: null,
      });
      query.maybeSingle = async () => result();
      query.then = (resolve: Function) => resolve(result());
      return query;
    },
  };
}
const ctx = (s: Workspace) =>
  ({ locals: { workspace: s } }) as unknown as APIContext;
test("attachment metadata retries use the database file-path conflict key and confirm the same record", async () => {
  const attachment = {
    message_id: 7,
    file_url: "3/u1/file.pdf",
    file_name: "file.pdf",
    file_mime_type: "application/pdf",
    file_size_bytes: 12,
  };
  const sdk = client({ message_attachments: { id: 9, ...attachment } });
  assert.equal(await attachMessageMetadata(state(sdk), attachment), 9);
  assert.equal(await attachMessageMetadata(state(sdk), attachment), 9);
  const writes = sdk.calls.filter(
    (c) => c.table === "message_attachments" && c.method === "upsert",
  );
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].args[1], {
    onConflict: "file_url",
    ignoreDuplicates: true,
  });
  assert.equal(
    sdk.calls.some((c) => c.method === "insert"),
    false,
  );
});
test("attachment conflict cannot acknowledge a file on another message or overwrite its metadata", async () => {
  const attachment = {
    message_id: 7,
    file_url: "3/u1/file.pdf",
    file_name: "file.pdf",
    file_mime_type: "application/pdf",
    file_size_bytes: 12,
  };
  const sdk = client({
    message_attachments: { id: 9, ...attachment, message_id: 8 },
  });
  await assert.rejects(
    attachMessageMetadata(state(sdk), attachment),
    /same message/,
  );
  assert.equal(
    sdk.calls.some((c) => c.method === "update"),
    false,
  );
});
test("enquiry payload preserves defaults while rejecting identity/status injection", () => {
  const data = enquiryPayload(
    {
      enquiry_type: "public_rfq",
      title: "RFQ",
      message: "Requirements",
      currency: "cad",
      quote_deadline: future,
      buyer_company_id: 99,
      publication_status: "published",
      created_by_user_id: "evil",
    },
    10,
  );
  assert.equal(data.buyer_company_id, 10);
  assert.equal(data.currency, "CAD");
  assert.equal(data.delivery_country, "Canada");
  assert.equal(data.supplier_company_id, null);
  assert.ok(!("publication_status" in data));
  assert.ok(!("created_by_user_id" in data));
  assert.throws(
    () =>
      enquiryPayload(
        {
          enquiry_type: "direct",
          supplier_company_id: "10",
          title: "x",
          message: "y",
          currency: "CAD",
        },
        10,
      ),
    AccessError,
  );
});
test("enquiry/quote validation rejects expired deadlines, bad quantities and unsafe numeric types", () => {
  for (const quantity of ["-1", "1e999", 0, {}, true])
    assert.throws(
      () =>
        enquiryPayload(
          {
            enquiry_type: "public_rfq",
            title: "x",
            message: "y",
            currency: "CAD",
            quantity,
            quote_deadline: future,
          },
          10,
        ),
      AccessError,
    );
  for (const input of [
    { total_price: 0 },
    { total_price: "Infinity" },
    { lead_time_days: "1.5" },
    { valid_until: "2020-01-01" },
    { currency: "CA" },
  ])
    assert.throws(
      () =>
        quotePayload(
          {
            total_price: 2,
            lead_time_days: 0,
            valid_until: future,
            currency: "CAD",
            ...input,
          },
          30,
          e,
        ),
      AccessError,
    );
  const payload = quotePayload(
    {
      total_price: "20",
      price_per_unit: "0",
      lead_time_days: "0",
      valid_until: future,
      currency: "usd",
      status: "accepted",
      version: 999,
    },
    30,
    e,
  );
  assert.equal(payload.lead_time_days, 0);
  assert.equal(payload.price_per_unit, 0);
  assert.equal(payload.currency, "USD");
  assert.ok(!("status" in payload));
});
test("quote price ordering groups currencies and handles missing terms", () => {
  const rows = [
    { ...q, id: 1, currency: "USD", total_price: 1 },
    { ...q, id: 2, total_price: 30, lead_time_days: null },
    { ...q, id: 3, total_price: 10, lead_time_days: 2 },
  ];
  assert.deepEqual(
    quoteOrder(rows, "price").map((x) => x.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    quoteOrder(rows, "lead").map((x) => x.id),
    [3, 1, 2],
  );
});
test("message history preserves microseconds and rejects cursor injection", () => {
  assert.deepEqual(
    historyCursor(
      new URLSearchParams("before=2026-10-05T12%3A00%3A00.123456Z&before_id=9"),
    ),
    { sent_at: "2026-10-05T12:00:00.123456Z", id: 9 },
  );
  for (const p of [
    "before_id=4",
    "before=bad&before_id=1",
    "before=2026-01-01T00:00:00Z),id.gt.0&before_id=1",
    "before=2026-01-01T00:00:00Z&before_id=-1",
  ])
    assert.throws(() => historyCursor(new URLSearchParams(p)), AccessError);
});
test("message merges deduplicate retry acknowledgements and retain history", () => {
  const m = {
    id: 1,
    sent_at: "2026-01-01T00:00:00.000001Z",
    content: "old",
    outgoing: false,
    seen: false,
    is_deleted: false,
    attachments: [],
  } as ThreadMessage;
  const newer = { ...m, id: 2, sent_at: "2026-01-01T00:00:00.000002Z" };
  assert.deepEqual(
    mergeMessages([m, newer], [{ ...m, content: "updated" }, newer]).map(
      (x) => [x.id, x.content],
    ),
    [
      [1, "updated"],
      [2, "old"],
    ],
  );
  const pending = pendingText("  hello  ");
  assert.equal(pending.content, "hello");
  assert.match(pending.client_message_id, /^[0-9a-f-]{36}$/);
});
test("verified company and selected-company scope guard every action", async () => {
  assert.throws(
    () => verifiedCompany(state({}, 10, []), 10, "sales"),
    AccessError,
  );
  assert.throws(
    () =>
      verifiedCompany(
        {
          ...state(),
          company: { ...state().company!, verification_status: "pending" },
        },
        10,
        "procurement",
      ),
    AccessError,
  );
  await assert.rejects(
    procurementAction(ctx(state()), { company_id: 99 }, "save-enquiry"),
    AccessError,
  );
  const c = client({
    conversations: {
      id: 3,
      buyer_company_id: 10,
      supplier_company_id: 30,
      status: "open",
    },
  });
  await assert.rejects(conversation(state(c, 99), 3), AccessError);
  await assert.rejects(conversation(state(c, 10, ["sales"]), 3), AccessError);
});
test("quote guard enforces closed enquiries, own buyer, deadline and invitations", async () => {
  const c = client({ enquiry_supplier_invitations: null });
  await assert.rejects(quoteTarget(state(c, 10), e), AccessError);
  await assert.rejects(
    quoteTarget(state(c, 30), { ...e, status: "closed" }),
    AccessError,
  );
  await assert.rejects(
    quoteTarget(state(c, 30), { ...e, quote_deadline: "2020-01-01T00:00:00Z" }),
    AccessError,
  );
  await assert.rejects(
    quoteTarget(state(c, 30), { ...e, visibility: "invited" }),
    AccessError,
  );
  await quoteTarget(state(c, 30), e);
});
test("quote acceptance requires explicit confirmation and fresh sent/open/expiry state", async () => {
  let mutations = 0;
  const c = client({ quotes: q, enquiries: e }, (name) =>
    name === "get_public_company_profile"
      ? { data: [{ id: 30, verification_status: "verified" }], error: null }
      : (mutations++, { data: 3, error: null }),
  );
  await assert.rejects(
    procurementAction(
      ctx(state(c)),
      { company_id: 10, quote_id: 20 },
      "accept",
    ),
    AccessError,
  );
  assert.equal(mutations, 0);
  const expired = client(
    { quotes: { ...q, valid_until: "2020-01-01T00:00:00Z" }, enquiries: e },
    () => {
      throw Error("no RPC");
    },
  );
  await assert.rejects(
    procurementAction(
      ctx(state(expired)),
      { company_id: 10, quote_id: 20, confirm: "CONFIRM" },
      "accept",
    ),
    AccessError,
  );
  const r = await procurementAction(
    ctx(state(c)),
    { company_id: 10, quote_id: 20, confirm: "CONFIRM" },
    "accept",
  );
  assert.equal((await r.json()).deal_id, 3);
});
test("manual draft edit cannot change direct, pending or closed enquiries", async () => {
  for (const changed of [
    { enquiry_type: "direct" },
    { publication_status: "pending_review" },
    { status: "closed" },
  ]) {
    const c = client({ enquiries: { ...e, ...changed } });
    await assert.rejects(
      procurementAction(
        ctx(state(c)),
        {
          enquiry_id: 5,
          company_id: 10,
          enquiry_type: "public_rfq",
          title: "Update",
          message: "Requirements",
          currency: "CAD",
          quote_deadline: future,
        },
        "save-enquiry",
      ),
      AccessError,
    );
    assert.equal(
      c.calls.some((x) => x.method === "insert"),
      false,
    );
  }
});
test("message retry confirms the same request ID and never resends an existing message", async () => {
  const key = "11111111-1111-4111-8111-111111111111";
  const c = client({
    conversations: {
      id: 3,
      buyer_company_id: 10,
      supplier_company_id: 30,
      status: "open",
    },
    messages: {
      id: 6,
      conversation_id: 3,
      sender_company_id: 10,
      content: "Hello",
      message_type: "text",
    },
  });
  assert.equal(await sendText(state(c), 3, 10, key, "Hello"), 6);
  assert.equal(
    c.calls.some((x) => x.method === "upsert"),
    false,
  );
  await assert.rejects(sendText(state(c), 3, 10, key, "Changed"), AccessError);
  await assert.rejects(
    sendText(state(c, 30), 3, 30, key, "Hello"),
    AccessError,
  );
});
test("new message uses the backend conflict key and confirms server acknowledgement", async () => {
  let inserted = false;
  const c = client({
    conversations: {
      id: 3,
      buyer_company_id: 10,
      supplier_company_id: 30,
      status: "open",
    },
    messages: () =>
      inserted
        ? {
            id: 6,
            conversation_id: 3,
            sender_company_id: 10,
            content: "Hello",
            message_type: "text",
          }
        : null,
  });
  const original = c.from.bind(c);
  c.from = (table: string) => {
    const query = original(table);
    const upsert = query.upsert;
    query.upsert = (...args: unknown[]) => {
      inserted = true;
      return upsert(...args);
    };
    return query;
  };
  assert.equal(
    await sendText(
      state(c),
      3,
      10,
      "11111111-1111-4111-8111-111111111111",
      "Hello",
    ),
    6,
  );
  assert.deepEqual(c.calls.find((x) => x.method === "upsert")?.args[1], {
    onConflict: "sender_user_id,client_message_id",
    ignoreDuplicates: true,
  });
});
test("timestamp/ID pagination removes private sender identity and exposes only guarded media IDs", async () => {
  const c = client({
    conversations: {
      id: 3,
      buyer_company_id: 10,
      supplier_company_id: 30,
      status: "open",
    },
    messages: [
      {
        id: 1,
        sender_user_id: "u1",
        content: "text",
        message_type: "text",
        is_deleted: false,
        sent_at: "2026-01-01T00:00:00.123456Z",
        message_attachments: [
          {
            id: 4,
            file_name: "photo.png",
            file_mime_type: "image/png",
            file_size_bytes: 12,
          },
        ],
      },
    ],
    conversation_participants: [
      { user_id: "u2", last_read_at: "2026-01-02T00:00:00Z" },
    ],
  });
  const page = await messagePage(
    state(c),
    3,
    new URLSearchParams("before=2026-01-02T00%3A00%3A00Z&before_id=3"),
  );
  assert.equal(page.rows[0].seen, true);
  assert.equal("sender_user_id" in page.rows[0], false);
  assert.ok(
    c.calls.some(
      (x) => x.method === "or" && String(x.args[0]).includes("id.lt.3"),
    ),
  );
  assert.equal(page.rows[0].attachments[0].id, 4);
  assert.equal(page.rows[0].attachments[0].file_mime_type, "image/png");
  assert.ok(!("file_url" in page.rows[0].attachments[0]));
});
test("Phase 3 upload journals preserve immutable owner-scoped paths and bucket limits", () => {
  for (const kind of ["enquiry", "message"] as const) {
    const key = "11111111-1111-4111-8111-111111111111",
      i = {
        key,
        user: "u1",
        kind,
        target: 3,
        path: "3/u1/" + key + ".pdf",
        mime: "application/pdf",
        created: Date.now() - 1,
      };
    assert.equal(ownedIntent(i, "u1"), true);
    assert.equal(
      ownedIntent({ ...i, path: "4/u1/" + key + ".pdf" }, "u1"),
      false,
    );
    assert.equal(uploadBucket(kind), kind + "-attachments");
    validateFile(new TextEncoder().encode("%PDF-1.7"), "application/pdf", kind);
    assert.throws(
      () => validateFile(new Uint8Array(10 * 1024 * 1024), "image/png", kind),
      AccessError,
    );
  }
});
test("quote PDF embeds the brand font and paginates long notes without omitting quotes", async () => {
  const font = new Uint8Array(
    await readFile(new URL("../public/fonts/Inter.ttf", import.meta.url)),
  );
  const bytes = await quotePdf(
    { ...e, title: "Équipements - bolts" },
    [
      {
        ...q,
        notes: "Long procurement notes and delivery requirements. ".repeat(250),
      },
      { ...q, id: 21 },
    ],
    new Map([[30, "Acme Supplier"]]),
    font,
    new Date("2026-10-05T00:00:00Z"),
  );
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() > 3);
  assert.equal(doc.getTitle(), "Quotes for enquiry #5");
});

test("conversation search combines company and search restrictions in one logical filter", async () => {
  const sdk = client({ enquiries: [{ id: 5 }], conversations: [] });
  const searchSdk = {
    ...sdk,
    rpc: () => ({ ilike: async () => ({ data: [{ id: 30 }], error: null }) }),
  };
  await conversationFeed(state(searchSdk), new URLSearchParams({ q: "steel" }));
  const filters = sdk.calls.filter(
    (c) => c.table === "conversations" && c.method === "or",
  );
  assert.equal(filters.length, 1);
  assert.match(
    String(filters[0].args[0]),
    /^and\(or\(buyer_company_id.eq.10,supplier_company_id.eq.10\),or\(/,
  );
});
test("draft currency edits are rejected instead of silently ignored by the existing RPC", async () => {
  let called = false;
  const sdk = client(
    { enquiries: { ...e, publication_status: "draft" } },
    () => {
      called = true;
      return { data: null, error: null };
    },
  );
  await assert.rejects(
    procurementAction(
      ctx(state(sdk)),
      {
        enquiry_id: 5,
        company_id: 10,
        enquiry_type: "public_rfq",
        title: "Steel",
        message: "Requirements",
        currency: "USD",
        quote_deadline: future,
      },
      "save-enquiry",
    ),
    /Currency is fixed/,
  );
  assert.equal(called, false);
});
test("quote comparison loads beyond the first database response page", async () => {
  let page = 0;
  const sdk = client({
    enquiries: e,
    quotes: () =>
      ++page === 1
        ? Array.from({ length: 500 }, (_, i) => ({ ...q, id: i + 1 }))
        : [{ ...q, id: 501 }],
  });
  const result = await quoteBundle(state(sdk), 5);
  assert.equal(result.quotes.length, 501);
  assert.deepEqual(
    sdk.calls
      .filter((c) => c.table === "quotes" && c.method === "range")
      .map((c) => c.args),
    [
      [0, 499],
      [500, 999],
    ],
  );
});
test("invalid calendar dates cannot normalize into a different future deadline", () => {
  assert.throws(
    () =>
      enquiryPayload(
        {
          enquiry_type: "public_rfq",
          title: "x",
          message: "y",
          currency: "CAD",
          quote_deadline: "2099-02-31T12:00:00Z",
        },
        10,
      ),
    AccessError,
  );
});
