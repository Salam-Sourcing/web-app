import { test } from "node:test";
import assert from "node:assert/strict";
import { createBoundaryGuard } from "../src/scripts/boundary.ts";
function harness() {
  let time = 1,
    visible = true,
    content = true,
    blocked = false,
    locks = 0,
    loads = 0,
    reloads = 0;
  let message = "",
    redirect = "",
    draft = "unsaved buyer requirements";
  let load: (signal: AbortSignal) => Promise<Response> = async () =>
    Response.json({ fingerprint: "current" });
  const guard = createBoundaryGuard({
    initial: "current",
    now: () => time,
    visible: () => visible,
    hasContent: () => content,
    load: (signal) => {
      loads++;
      return load(signal);
    },
    lock: (text) => {
      blocked = true;
      locks++;
      message = text;
    },
    unlock: () => {
      blocked = false;
    },
    discard: () => {
      content = false;
      blocked = true;
      draft = "";
    },
    reload: () => {
      reloads++;
    },
    redirect: (path) => {
      redirect = path;
    },
  });
  return {
    guard,
    setTime: (value: number) => (time = value),
    setVisible: (value: boolean) => (visible = value),
    setLoad: (value: typeof load) => (load = value),
    get state() {
      return {
        loads,
        locks,
        blocked,
        content,
        draft,
        message,
        redirect,
        reloads,
      };
    },
  };
}
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => (resolve = done));
  return { promise, resolve };
}
test("fresh server page and repeated focus need no duplicate check or blocking overlay", async () => {
  const h = harness();
  await h.guard.check();
  h.setTime(15000);
  await h.guard.check();
  await h.guard.check();
  assert.equal(h.state.loads, 0);
  assert.equal(h.state.locks, 0);
  assert.equal(h.state.draft, "unsaved buyer requirements");
});
test("periodic access checks stay interactive and preserve unsaved form state", async () => {
  const h = harness(),
    pending = deferred();
  h.setTime(30001);
  h.setLoad(() => pending.promise);
  const check = h.guard.check(true);
  await h.guard.check();
  assert.equal(h.state.loads, 1);
  assert.equal(h.state.blocked, false);
  assert.equal(h.state.locks, 0);
  pending.resolve(Response.json({ fingerprint: "current" }));
  await check;
  assert.equal(h.state.draft, "unsaved buyer requirements");
  assert.equal(h.state.reloads, 0);
});
test("brief hidden-tab return is quiet; prolonged absence waits for fresh access", async () => {
  const h = harness();
  h.setVisible(false);
  h.setTime(20000);
  await h.guard.check(true);
  assert.equal(h.state.loads, 0);
  h.setVisible(true);
  await h.guard.check();
  assert.equal(h.state.locks, 0);
  const pending = deferred();
  h.setTime(65001);
  h.setLoad(() => pending.promise);
  const check = h.guard.check();
  assert.equal(h.state.blocked, true);
  assert.equal(h.state.loads, 1);
  pending.resolve(Response.json({ fingerprint: "current" }));
  await check;
  assert.equal(h.state.blocked, false);
  assert.equal(h.state.draft, "unsaved buyer requirements");
});
test("permission or company changes discard the old DOM and require fresh HTML", async () => {
  const h = harness();
  h.setLoad(async () => Response.json({ fingerprint: "new-company" }));
  await h.guard.check(true);
  assert.equal(h.state.content, false);
  assert.equal(h.state.blocked, true);
  assert.equal(h.state.reloads, 1);
});
test("expired sessions and new MFA requirements discard private content before redirecting", async () => {
  for (const target of ["/login", "/auth/mfa"]) {
    const h = harness();
    h.setLoad(async () => Response.json({ redirect: target }, { status: 401 }));
    await h.guard.check(true);
    assert.equal(h.state.content, false);
    assert.equal(h.state.redirect, target);
    assert.equal(h.state.blocked, true);
  }
});
test("revoked account access cannot preserve private DOM", async () => {
  const h = harness();
  h.setLoad(async () =>
    Response.json({ error: "Your access was revoked." }, { status: 403 }),
  );
  await h.guard.check(true);
  assert.equal(h.state.content, false);
  assert.equal(h.state.blocked, true);
  assert.match(h.state.message, /revoked/);
});
test("verification outages fail closed but a confirmed retry preserves the draft", async () => {
  const h = harness();
  h.setLoad(async () => {
    throw Error("network");
  });
  await h.guard.check(true);
  assert.equal(h.state.blocked, true);
  assert.equal(h.state.content, true);
  h.setLoad(async () => Response.json({ fingerprint: "current" }));
  await h.guard.check(true);
  assert.equal(h.state.blocked, false);
  assert.equal(h.state.draft, "unsaved buyer requirements");
});
test("offline state invalidates an in-flight response and cannot be unmasked by it", async () => {
  const h = harness(),
    pending = deferred();
  h.setLoad(() => pending.promise);
  const check = h.guard.check(true);
  h.guard.offline();
  pending.resolve(Response.json({ fingerprint: "current" }));
  await check;
  assert.equal(h.state.blocked, true);
  assert.match(h.state.message, /offline/);
  h.setLoad(async () => Response.json({ fingerprint: "current" }));
  await h.guard.check(true);
  assert.equal(h.state.blocked, false);
});
test("late background responses cannot restore a page after navigation or cross-tab logout", async () => {
  for (const action of ["leave", "logout"]) {
    const h = harness(),
      pending = deferred();
    h.setLoad(() => pending.promise);
    const check = h.guard.check(true);
    if (action === "logout") h.guard.invalidate("/login");
    else h.guard.leave();
    pending.resolve(Response.json({ fingerprint: "current" }));
    await check;
    assert.equal(h.state.content, false);
    assert.equal(h.state.blocked, true);
    assert.equal(h.state.reloads, 0);
    if (action === "logout") assert.equal(h.state.redirect, "/login");
  }
});
