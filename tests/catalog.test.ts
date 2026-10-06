import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import {
  companyPayload,
  listingPayload,
  searchInput,
  storagePath,
  validateFile,
  allowedTransition,
  uniquePage,
  numberValue,
} from "../src/lib/catalog.ts";
import {
  activeCompany,
  companyManager,
  contactAllowed,
  checked,
  search,
} from "../src/lib/server/catalog.ts";
import {
  ownedIntent,
  readMultipart,
  recoverUploads,
  attachUpload,
} from "../src/lib/server/uploads.ts";
import { handleCatalogAction } from "../src/lib/server/catalog-actions.ts";
import { AccessError } from "../src/lib/security.ts";
import type { Workspace, Client } from "../src/lib/server/access.ts";
const base = {
  legal_name: "Acme",
  display_name: "Acme",
  company_type: "supplier",
  country: "Canada",
  email: "OWNER@example.test",
};
const listing = {
  listing_type: "product",
  name: "Bolts",
  description: "Steel bolts",
  sub_category_id: "2",
  unit_of_measure: "piece",
  specifications: '{"Grade":"A"}',
};
function state(
  client: unknown = {},
  permissions = ["listings", "procurement"],
): Workspace {
  return {
    user: { id: "user-1" },
    client: client as Client,
    company: { id: 10, role: "owner", verification_status: "verified" },
    permissions,
    companies: [],
    factors: [],
    allFactors: [],
    needsMfa: false,
    profile: { status: "active" },
  } as unknown as Workspace;
}
function context(value: Workspace, cookie = ""): APIContext {
  return {
    locals: { workspace: value },
    url: new URL("https://web.example.test/api"),
    request: new Request("https://web.example.test/api", {
      headers: { cookie },
    }),
    cookies: {
      get: (name: string) => {
        const raw = cookie.split("; ").find((s) => s.startsWith(name + "="));
        return raw
          ? { value: decodeURIComponent(raw.slice(name.length + 1)) }
          : undefined;
      },
      delete: () => {},
      set: () => {},
    },
  } as unknown as APIContext;
}
test("company creation whitelists identity fields and excludes owner/status injection", () => {
  const payload = companyPayload({
    ...base,
    owner_user_id: "other",
    verification_status: "verified",
    status: "active",
    website: "example.test",
  });
  assert.equal(payload.email, "owner@example.test");
  assert.equal(payload.website, "https://example.test/");
  assert.equal("owner_user_id" in payload, false);
  assert.equal("verification_status" in payload, false);
  assert.throws(
    () => companyPayload({ ...base, company_type: "admin_partner" }),
    AccessError,
  );
  for (const website of [
    "javascript:alert(1)",
    "https://user:pass@example.test",
    "ftp://example.test",
  ])
    assert.throws(() => companyPayload({ ...base, website }), AccessError);
});
test("listing payload preserves zero terms and cannot change moderation or currency", () => {
  const payload = listingPayload({
    ...listing,
    price_per_unit: "0",
    minimum_order_quantity: "0",
    estimated_lead_time_days: "0",
    currency: "USD",
    status: "published",
  });
  assert.equal(payload.price_per_unit, 0);
  assert.equal(payload.estimated_lead_time_days, 0);
  assert.equal("currency" in payload, false);
  assert.equal("status" in payload, false);
  for (const specifications of [
    '{"__proto__":"bad"}',
    '{"key":123}',
    "[]",
    JSON.stringify(
      Object.fromEntries(
        Array.from({ length: 31 }, (_, i) => [String(i), "v"]),
      ),
    ),
  ])
    assert.throws(
      () => listingPayload({ ...listing, specifications }),
      AccessError,
    );
});
test("numeric filters reject negatives, nonfinite, fractional days and inverted ranges", () => {
  for (const value of ["-1", "NaN", "Infinity", "1e999", {}, true])
    assert.throws(() => numberValue(value, "price"), AccessError);
  for (const params of [
    "min_price=20&max_price=10",
    "max_lead_days=1.5",
    "offset=10001",
    "sort=popular",
    "currency=US",
    "company_id=-1",
  ])
    assert.throws(() => searchInput(new URLSearchParams(params)), AccessError);
});
test("search preserves exact taxonomy, 24-item cursor and currency grouping contract", async () => {
  let args: unknown;
  const s = state({
    rpc: async (name: string, input: unknown) => {
      assert.equal(name, "search_marketplace");
      args = input;
      return { error: null, data: [] };
    },
  });
  const page = await search(
    s,
    new URLSearchParams(
      "category=Metal+%26+Steel&currency=usd&offset=24&sort=price_low&saved=true&verified=true",
    ),
  );
  assert.deepEqual(args, {
    p_filters: {
      query: "",
      category: "Metal & Steel",
      location: "",
      currency: "USD",
      min_price: null,
      max_price: null,
      max_moq: null,
      max_lead_days: null,
      verified: true,
      saved: true,
      sort: "price_low",
    },
    p_offset: 24,
    p_limit: 24,
  });
  assert.equal(page.nextOffset, 24);
  assert.equal(page.hasMore, false);
});
test("storage references stay within project and bucket and reject traversal", () => {
  const project = "https://project.supabase.co",
    bucket = "listing-images";
  assert.equal(
    storagePath("user/12/image.png", project, bucket),
    "user/12/image.png",
  );
  assert.equal(
    storagePath(
      project +
        "/storage/v1/object/sign/" +
        bucket +
        "/user/12/image.png?token=old",
      project,
      bucket,
    ),
    "user/12/image.png",
  );
  for (const value of [
    "../secret",
    "/absolute",
    "a//b",
    "a/../b",
    "a\\b",
    "a?token=x",
    "https://evil.test/storage/v1/object/public/listing-images/a",
    "https://project.supabase.co/storage/v1/object/public/other/a",
  ])
    assert.equal(storagePath(value, project, bucket), null);
});
test("uploads validate MIME signatures and strict Flutter size limits", () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  validateFile(png, "image/png", "listing");
  validateFile(
    new TextEncoder().encode("%PDF-1.7"),
    "application/pdf",
    "document",
  );
  for (const [bytes, mime, kind] of [
    [new Uint8Array(), "image/png", "listing"],
    [png, "image/jpeg", "listing"],
    [new TextEncoder().encode("%PDF-1.7"), "application/pdf", "listing"],
    [new Uint8Array(5 * 1024 * 1024), "image/jpeg", "listing"],
    [new Uint8Array(10 * 1024 * 1024), "application/pdf", "document"],
  ] as const)
    assert.throws(() => validateFile(bytes, mime, kind), AccessError);
});
test("current company and effective scope are checked before mutations", async () => {
  const s = state();
  assert.throws(() => activeCompany(s, 20, "listings"), AccessError);
  assert.throws(
    () => activeCompany(state({}, []), 10, "listings"),
    AccessError,
  );
  assert.throws(
    () => companyManager({ ...s, company: { ...s.company!, role: "viewer" } }),
    AccessError,
  );
  await assert.rejects(
    handleCatalogAction(context(s), { company_id: 20 }, "listing-create"),
    AccessError,
  );
  assert.equal(contactAllowed(s, 10), false);
  assert.equal(contactAllowed(s, 20), true);
  assert.equal(
    contactAllowed(
      { ...s, company: { ...s.company!, verification_status: "unverified" } },
      20,
    ),
    false,
  );
});
test("listing lifecycle cannot skip review or resume pending review", () => {
  assert.equal(allowedTransition("draft", "submit"), true);
  assert.equal(allowedTransition("rejected", "submit"), true);
  assert.equal(allowedTransition("published", "pause"), true);
  assert.equal(allowedTransition("paused", "resume"), true);
  for (const [status, action] of [
    ["draft", "publish"],
    ["draft", "resume"],
    ["pending_review", "resume"],
    ["published", "submit"],
    ["archived", "archive"],
  ])
    assert.equal(allowedTransition(status, action), false);
});
test("pagination deduplicates across and within pages", () =>
  assert.deepEqual(
    uniquePage([{ id: 1 }], [{ id: 1 }, { id: 2 }, { id: 2 }, { id: 3 }]),
    [{ id: 1 }, { id: 2 }, { id: 3 }],
  ));
test("upload recovery rejects foreign owners and arbitrary paths", () => {
  const key = "11111111-1111-4111-8111-111111111111",
    intent = {
      user: "user-1",
      kind: "listing",
      target: 10,
      key,
      path: "user-1/10/" + key + ".png",
      mime: "image/png",
      created: Date.now() - 1,
    };
  assert.equal(ownedIntent(intent, "user-1"), true);
  assert.equal(ownedIntent(intent, "user-2"), false);
  assert.equal(
    ownedIntent({ ...intent, path: "user-1/20/" + key + ".png" }, "user-1"),
    false,
  );
});
test("retained upload cleanup never deletes business objects", async () => {
  let removed = false;
  const key = "11111111-1111-4111-8111-111111111111",
    intent = {
      user: "user-1",
      kind: "listing",
      target: 10,
      key,
      path: "user-1/10/" + key + ".png",
      mime: "image/png",
      created: Date.now() - 2 * 86400000,
    };
  const client = {
    rpc: async () => ({ data: "retained", error: null }),
    storage: {
      from: () => ({
        remove: async () => {
          removed = true;
          return { error: null };
        },
      }),
    },
  };
  const result = await recoverUploads(
    context(
      state(client),
      "ss-upload-" + key + "=" + encodeURIComponent(JSON.stringify(intent)),
    ),
  );
  assert.equal(removed, false);
  assert.equal((await result.json()).remaining, 0);
});
test("unknown backend failures remain retryable 503 instead of false success", () => {
  assert.throws(
    () => checked({ message: "Failed to fetch" }),
    (error: unknown) => error instanceof AccessError && error.status === 503,
  );
});
test("multipart upload rejects foreign origin and bounded oversized body", async () => {
  await assert.rejects(
    readMultipart(
      new Request("https://web.example.test/api", {
        method: "POST",
        headers: {
          origin: "https://other.invalid",
          "content-type": "multipart/form-data; boundary=x",
        },
        body: "x",
      }),
    ),
    AccessError,
  );
  await assert.rejects(
    readMultipart(
      new Request("https://web.example.test/api", {
        method: "POST",
        headers: {
          origin: "https://web.example.test",
          "content-type": "multipart/form-data; boundary=x",
          "content-length": String(11 * 1024 * 1024),
        },
        body: "x",
      }),
    ),
    (e: unknown) => e instanceof AccessError && e.status === 413,
  );
  const form = new FormData();
  form.set(
    "file",
    new File(["%PDF-1.7"], "proof.pdf", { type: "application/pdf" }),
  );
  const parsed = await readMultipart(
    new Request("https://web.example.test/api", {
      method: "POST",
      headers: { origin: "https://web.example.test" },
      body: form,
    }),
  );
  assert.equal((parsed.get("file") as File).name, "proof.pdf");
});
test("lost upload acknowledgement can reconcile existing attachment without upload cookie", async () => {
  let uploaded = false;
  const client = {
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({
          error: null,
          data:
            table === "listings"
              ? { id: 10, status: "draft", company_id: 10 }
              : { id: 99 },
        }),
      };
      return q;
    },
    storage: {
      from: () => ({
        upload: () => {
          uploaded = true;
          throw Error("must not upload");
        },
      }),
    },
  };
  const form = new FormData(),
    key = "11111111-1111-4111-8111-111111111111";
  for (const [name, value] of Object.entries({
    kind: "listing",
    target_id: "10",
    company_id: "10",
    key,
  }))
    form.set(name, value);
  form.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "photo.png", {
      type: "image/png",
    }),
  );
  const result = await attachUpload(context(state(client)), form);
  assert.equal((await result.json()).attached, true);
  assert.equal(uploaded, false);
});

test("missing upload journal cannot create or attach a new object", async () => {
  let uploaded = false;
  const client = {
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({
          error: null,
          data:
            table === "listings"
              ? { id: 10, status: "draft", company_id: 10 }
              : null,
        }),
      };
      return q;
    },
    storage: {
      from: () => ({
        upload: () => {
          uploaded = true;
          throw Error("must not upload");
        },
      }),
    },
  };
  const form = new FormData();
  for (const [name, value] of Object.entries({
    kind: "listing",
    target_id: "10",
    company_id: "10",
    key: "11111111-1111-4111-8111-111111111111",
  }))
    form.set(name, value);
  form.set(
    "file",
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "photo.png", {
      type: "image/png",
    }),
  );
  await assert.rejects(
    attachUpload(context(state(client)), form),
    (e: unknown) => e instanceof AccessError && e.code === "upload_expired",
  );
  assert.equal(uploaded, false);
});
test("failed cleanup keeps the recovery intent for a later retry", async () => {
  const key = "11111111-1111-4111-8111-111111111111",
    intent = {
      user: "user-1",
      kind: "listing",
      target: 10,
      key,
      path: "user-1/10/" + key + ".png",
      mime: "image/png",
      created: Date.now() - 2 * 86400000,
    };
  let deleted = false;
  const client = {
    rpc: async () => ({ data: "claimed", error: null }),
    storage: {
      from: () => ({
        remove: async () => ({ error: { message: "network error" } }),
      }),
    },
  };
  const c = context(
    state(client),
    "ss-upload-" + key + "=" + encodeURIComponent(JSON.stringify(intent)),
  );
  c.cookies.delete = () => {
    deleted = true;
  };
  const result = await recoverUploads(c);
  assert.equal((await result.json()).remaining, 1);
  assert.equal(deleted, false);
});
