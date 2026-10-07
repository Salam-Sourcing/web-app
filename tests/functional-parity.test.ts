import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIContext } from "astro";
import type { Workspace } from "../src/lib/server/access.ts";
import { companyPayload, validateFile } from "../src/lib/catalog.ts";
import {
  preservedText,
  reportPayload,
  MESSAGE_LIMIT,
} from "../src/lib/client-contracts.ts";
import { messageCaption } from "../src/lib/message-caption.ts";
import { prepareUpload, attachUpload } from "../src/lib/server/uploads.ts";
import { personalExport, exportSections } from "../src/lib/account.ts";
import { AccessError } from "../src/lib/security.ts";

const company = {
  legal_name: "Example",
  display_name: "Example",
  company_type: "supplier",
  country: "Canada",
  email: "owner@example.com",
};
test("company edits preserve authorized legacy values without admitting new over-limit values", () => {
  const original = {
    ...company,
    description: "x".repeat(4001),
    email: "",
    website: "old-invalid-website",
  };
  const payload = companyPayload({ ...original, city: "Edmonton" }, original);
  assert.equal(payload.description, original.description);
  assert.equal(payload.email, null);
  assert.equal(payload.website, original.website);
  assert.equal(payload.city, "Edmonton");
  assert.throws(() =>
    companyPayload({ ...original, description: "y".repeat(4001) }, original),
  );
  assert.throws(() =>
    companyPayload({ ...original, website: "javascript:alert(1)" }, original),
  );
  assert.throws(() => companyPayload({ ...company, email: "" }));
  assert.equal(companyPayload({ ...company, email: "" }, company).email, null);
  assert.equal(
    companyPayload({ ...company, description: "x".repeat(4000) }).description
      ?.length,
    4000,
  );
});
test("personal fields preserve unchanged older values and enforce UTF-16 bounds on new values", () => {
  const name = "x".repeat(81);
  assert.equal(
    preservedText({ first_name: name }, "first_name", 80, name),
    name,
  );
  assert.throws(() =>
    preservedText({ first_name: "y".repeat(81) }, "first_name", 80, name),
  );
  assert.equal(
    preservedText({ first_name: "New name" }, "first_name", 80, name),
    "New name",
  );
  assert.equal(
    messageCaption("😀".repeat(MESSAGE_LIMIT / 2)).length,
    MESSAGE_LIMIT,
  );
  assert.throws(() => messageCaption("😀".repeat(MESSAGE_LIMIT / 2 + 1)));
});
test("review and generic reports have the complete reason set and matching explanation bounds", () => {
  assert.equal(
    reportPayload({
      reason: "impersonation",
      description: "Pretending to be another company",
    }).reason,
    "impersonation",
  );
  for (const description of ["abcd", "x".repeat(1001)])
    assert.throws(() => reportPayload({ reason: "other", description }));
  assert.throws(() =>
    reportPayload({ reason: "made-up", description: "Valid explanation" }),
  );
  assert.equal(
    reportPayload({ reason: "other", description: "x".repeat(1000) })
      .description.length,
    1000,
  );
});
test("listing and message uploads accept the exact bucket limit and reject one byte over", () => {
  for (const [kind, max] of [
    ["listing", 5 * 1024 * 1024],
    ["message", 5 * 1024 * 1024],
  ] as const) {
    const bytes = new Uint8Array(max);
    bytes.set([255, 216, 255]);
    validateFile(bytes, "image/jpeg", kind);
    const larger = new Uint8Array(max + 1);
    larger.set([255, 216, 255]);
    assert.throws(() => validateFile(larger, "image/jpeg", kind));
  }
});

function fixture(failure: "before" | "after" | null = null) {
  const cookies = new Map<string, string>();
  let message: any = null,
    attachment: any = null,
    stored: Uint8Array | null = null;
  let failed = false,
    uploads = 0,
    messageWrites = 0;
  const client = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let mutation: Record<string, unknown> | undefined;
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        upsert: (data: Record<string, unknown>) => {
          mutation = data;
          return query;
        },
      };
      const result = () => {
        let error: any = null;
        if (mutation && table === "messages") {
          message ??= { id: 7, ...mutation };
          messageWrites++;
        }
        if (mutation && table === "message_attachments") {
          if (failure !== "before" || failed)
            attachment ??= { id: 19, ...mutation };
          if (failure && !failed) {
            failed = true;
            error = { message: "Lost acknowledgement" };
          }
        }
        const data =
          table === "conversations"
            ? {
                id: 3,
                buyer_company_id: 10,
                supplier_company_id: 30,
                enquiry_id: 5,
                status: "open",
              }
            : table === "messages"
              ? message
              : table === "message_attachments"
                ? attachment
                : null;
        return { data, error };
      };
      query.maybeSingle = async () => result();
      query.then = (resolve: any) => Promise.resolve(result()).then(resolve);
      return query;
    },
    storage: {
      from: () => ({
        upload: async (_path: string, bytes: Uint8Array) => {
          uploads++;
          if (stored)
            return { error: { statusCode: "409", message: "Duplicate" } };
          stored = bytes;
          return { error: null };
        },
        download: async () => ({
          error: null,
          data: new Blob([new Uint8Array(stored!)]),
        }),
      }),
    },
  };
  const state = {
    client,
    user: { id: "u1" },
    company: { id: 10, role: "owner", verification_status: "verified" },
    permissions: ["procurement"],
    companies: [],
    profile: { status: "active" },
  } as unknown as Workspace;
  const context = () =>
    ({
      locals: { workspace: state },
      url: new URL("https://fixture.invalid/api/uploads"),
      request: new Request("https://fixture.invalid/api/uploads", {
        headers: {
          cookie: [...cookies]
            .map(([key, value]) => key + "=" + encodeURIComponent(value))
            .join("; "),
        },
      }),
      cookies: {
        get: (key: string) =>
          cookies.has(key) ? { value: cookies.get(key) } : undefined,
        set: (key: string, value: string) => cookies.set(key, value),
        delete: (key: string) => cookies.delete(key),
      },
    }) as unknown as APIContext;
  const form = (key: string, caption = "Inspection results") => {
    const data = new FormData();
    for (const [name, value] of Object.entries({
      key,
      kind: "message",
      target_id: "3",
      company_id: "10",
      caption,
    }))
      data.set(name, value);
    data.set(
      "file",
      new File([new Uint8Array([255, 216, 255])], "inspection.jpg", {
        type: "image/jpeg",
      }),
    );
    return data;
  };
  return {
    context,
    form,
    cookies,
    state,
    get message() {
      return message;
    },
    get uploads() {
      return uploads;
    },
    get messageWrites() {
      return messageWrites;
    },
  };
}
for (const failure of ["before", "after", null] as const) {
  test(`caption upload remains one message across ${failure ?? "no"} metadata acknowledgement failure`, async () => {
    const f = fixture(failure);
    const prepared = await prepareUpload(f.context(), {
      kind: "message",
      target_id: "3",
      company_id: "10",
      mime: "image/jpeg",
      caption: "Inspection results",
    });
    const { key } = await prepared.json();
    const journal = JSON.parse([...f.cookies.values()][0]);
    assert.equal("caption" in journal, false);
    assert.match(journal.caption_hash, /^[a-f0-9]{64}$/);
    if (failure)
      await assert.rejects(attachUpload(f.context(), f.form(key)), AccessError);
    const result = await attachUpload(f.context(), f.form(key));
    assert.equal((await result.json()).attached, true);
    assert.equal(f.message.content, "Inspection results");
    assert.equal(f.messageWrites, 1);
    assert.equal(f.cookies.size, 0);
    // A lost final HTTP response must also reconcile after the journal was cleared.
    const replay = await attachUpload(f.context(), f.form(key));
    assert.equal((await replay.json()).attached, true);
    await assert.rejects(
      attachUpload(f.context(), f.form(key, "Changed caption")),
      (error: any) => error.code === "retry_changed",
    );
  });
}
test("prepared caption changes and company changes are rejected before any upload", async () => {
  const f = fixture();
  const prepared = await prepareUpload(f.context(), {
    kind: "message",
    target_id: "3",
    company_id: "10",
    mime: "image/jpeg",
    caption: "Inspection results",
  });
  const { key } = await prepared.json();
  await assert.rejects(
    attachUpload(f.context(), f.form(key, "Different caption")),
    (e: any) => e.code === "retry_changed",
  );
  const wrongCompany = f.form(key);
  wrongCompany.set("company_id", "30");
  await assert.rejects(attachUpload(f.context(), wrongCompany), AccessError);
  assert.equal(f.uploads, 0);
  assert.equal(f.messageWrites, 0);
});
test("larger exports return complete-export guidance rather than partial data", async () => {
  let requested = 0;
  const page = (n: number) => ({
    subject: "u1",
    page: n,
    page_size: 100,
    ...Object.fromEntries(
      exportSections.map((key) => [
        key,
        key === "messages"
          ? Array.from({ length: 100 }, (_, id) => ({ id }))
          : [],
      ]),
    ),
  });
  await assert.rejects(
    personalExport(async (n) => {
      requested++;
      return page(n);
    }, "u1"),
    (e: any) =>
      e.code === "export_limit" && e.message.includes("complete export"),
  );
  assert.equal(requested, 100);
  await assert.rejects(
    personalExport(async (n) => page(n), "u1", 100, 1),
    (e: any) => e.code === "export_limit",
  );
});
