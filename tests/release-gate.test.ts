import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRelease } from "../scripts/parity-lib.mjs";
const revisions = {
  web: { head: "a", tree: "1" },
  flutter: { head: "b", tree: "2" },
};
const contract = {
  acceptance: [{ id: "chat", required: true, clients: ["web", "flutter"] }],
};
const checks = [
  "web-check",
  "web-unit",
  "web-build",
  "web-http",
  "flutter-analysis",
  "flutter-unit",
  "database",
].map((id) => ({ id, status: "passed" }));
const now = Date.parse("2026-10-06T12:00:00Z");
function evidence() {
  return {
    revisions,
    results: ["web", "flutter"].map((client) => ({
      scenario: "chat",
      client,
      status: "passed",
      executedAt: new Date(now - 1000).toISOString(),
      environment: "disposable backend",
      artifact: "ci-run/report",
      details: "send, receive, caption and report verified",
    })),
  };
}
test("release gate accepts matching current complete paired evidence", () => {
  assert.deepEqual(
    evaluateRelease(
      contract,
      { revisions, checks },
      evidence(),
      revisions,
      now,
    ),
    [],
  );
});
test("release gate rejects missing, skipped, failed, stale and expired evidence", () => {
  for (const change of [
    (e: any) => e.results.pop(),
    (e: any) => e.results.push({ ...e.results[0], status: "failed" }),
    (e: any) => (e.results[0].status = "skipped"),
    (e: any) => (e.results[0].status = "failed"),
    (e: any) => (e.results[0].artifact = ""),
    (e: any) => (e.results[0].executedAt = "2026-09-01T00:00:00Z"),
    (e: any) =>
      (e.revisions = { ...revisions, web: { head: "a", tree: "old" } }),
  ]) {
    const e = evidence();
    change(e);
    assert.ok(
      evaluateRelease(contract, { revisions, checks }, e, revisions, now)
        .length,
    );
  }
  assert.ok(
    evaluateRelease(
      contract,
      { revisions, checks: checks.slice(1) },
      evidence(),
      revisions,
      now,
    ).length,
  );
  assert.ok(evaluateRelease(contract, null, null, revisions, now).length);
});
