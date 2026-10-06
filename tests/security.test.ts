import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeNext,
  positiveId,
  selectCompany,
  defaultSafetyCompany,
  readMutation,
  AccessError,
  errorResponse,
  type CompanySummary,
  verifiedCallbackFlow,
} from "../src/lib/security.ts";

const company = (id: number, role = "member"): CompanySummary => ({
  id,
  role,
  display_name: "Company " + id,
  verification_status: "unverified",
  city: null,
  province_state: null,
  country: null,
});

test("redirects stay in normalized workspace paths and drop arbitrary queries", () => {
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/app\\evil.test",
    "/app/../api/company",
    "/app/../../evil",
    "/app x",
    null,
  ])
    assert.equal(safeNext(value), "/app/discover");
  assert.equal(
    safeNext("/app/account/password?code=private#token"),
    "/app/account/password",
  );
  assert.equal(safeNext("/app/enquiries"), "/app/enquiries");
});
test("IDs reject imprecise bigint numbers and malformed targets", () => {
  for (const value of ["01", "0", -1, "1.5", "1e2", "9007199254740992", null])
    assert.throws(() => positiveId(value), AccessError);
  assert.equal(positiveId("123"), 123);
});
test("company selection cannot promote a cookie to membership", () => {
  const rows = [company(7), company(12)];
  assert.equal(selectCompany(rows, "999")?.id, 7);
  assert.equal(selectCompany(rows, "12")?.id, 12);
  assert.equal(selectCompany([], "12"), null);
});
test("safety scope matches owner priority then lowest ID, not active-company selection", () => {
  const rows = [company(2), company(19, "owner"), company(11, "owner")];
  assert.equal(defaultSafetyCompany(rows)?.id, 11);
  assert.equal(defaultSafetyCompany([company(19), company(4)])?.id, 4);
  assert.equal(rows[0].id, 2);
});
const request = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://test.salamsourcing.com/api/company", {
    method: "POST",
    headers: {
      origin: "https://test.salamsourcing.com",
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
test("mutations require same-origin JSON and reject cross-site requests", async () => {
  for (const headers of [
    { origin: "https://evil.test" },
    { origin: "" },
    { "content-type": "application/x-www-form-urlencoded" },
    { "sec-fetch-site": "cross-site" },
  ] as Record<string, string>[])
    await assert.rejects(
      readMutation(request("{}", headers)),
      (error: AccessError) => error.status === 403,
    );
  assert.deepEqual(await readMutation(request('{"company_id":12}')), {
    company_id: 12,
  });
});
test("JSON body bounds count bytes and also cover chunked requests", async () => {
  await assert.rejects(
    readMutation(request(JSON.stringify({ data: "界".repeat(6000) }))),
    (error: AccessError) => error.status === 413,
  );
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(17000));
      controller.close();
    },
  });
  const chunked = new Request("https://test.salamsourcing.com/api/company", {
    method: "POST",
    headers: {
      origin: "https://test.salamsourcing.com",
      "content-type": "application/json",
    },
    body: stream,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    readMutation(chunked),
    (error: AccessError) => error.status === 413,
  );
});
test("malformed or non-object JSON is rejected", async () => {
  for (const body of ["", "{", "[]", "null", "1", '"text"'])
    await assert.rejects(
      readMutation(request(body)),
      (error: AccessError) => error.status === 400,
    );
});
test("error responses never serialize unknown SDK secrets", async () => {
  const result = errorResponse({
    access_token: "secret",
    message: "private record",
  });
  assert.equal(result.status, 503);
  assert.ok(result.headers.get("cache-control")?.includes("no-store"));
  const body = await result.text();
  assert.ok(!body.includes("secret"));
  assert.ok(!body.includes("private record"));
});

test("confirmation/recovery requires a matching unexpired same-browser flow", () => {
  const cookie = JSON.stringify({
    state: "random-nonce",
    flow: "recovery",
    expires: 2000,
  });
  assert.equal(verifiedCallbackFlow(cookie, "random-nonce", 1000), "recovery");
  assert.equal(verifiedCallbackFlow(cookie, "other", 1000), null);
  assert.equal(verifiedCallbackFlow(cookie, "random-nonce", 2000), null);
  assert.equal(verifiedCallbackFlow(undefined, "random-nonce", 1000), null);
  assert.equal(verifiedCallbackFlow("invalid", "random-nonce", 1000), null);
  assert.equal(
    verifiedCallbackFlow(
      JSON.stringify({ state: "random-nonce", flow: "admin", expires: 2000 }),
      "random-nonce",
      1000,
    ),
    null,
  );
});
