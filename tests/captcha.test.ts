import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { freshCaptcha } from "../src/scripts/forms.ts";

function fixture(t: TestContext) {
  const options: Record<string, unknown>[] = [];
  const operations: string[] = [];
  let executed: (options: Record<string, unknown>) => void = () => {};
  const turnstile = {
    render(_node: HTMLElement, config: Record<string, unknown>) {
      options.push(config);
      operations.push("render");
      return "widget-" + options.length;
    },
    execute(id: string) {
      operations.push("execute:" + id);
      executed(options.at(-1)!);
    },
    reset(id: string) {
      operations.push("reset:" + id);
    },
    remove(id: string) {
      operations.push("remove:" + id);
    },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { turnstile, setTimeout },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  });
  const container = { replaceChildren() {} };
  const form = {
    dataset: {
      captchaEnabled: "true",
      captcha: "login",
      siteKey: "public-fixture-site-key",
    },
    querySelector: () => container,
  } as unknown as HTMLFormElement;
  return {
    form,
    options,
    operations,
    turnstile,
    onExecute(callback: typeof executed) {
      executed = callback;
    },
  };
}

test("each auth attempt retains its own widget through submission then resets before retry", async (t) => {
  const f = fixture(t);
  let nextToken = 0;
  f.onExecute((config) =>
    (config.callback as (token: string) => void)("token-" + ++nextToken),
  );
  const first = await freshCaptcha(f.form);
  assert.equal(first.token, "token-1");
  assert.deepEqual(f.operations, ["render", "execute:widget-1"]);
  assert.equal(f.options[0].action, "login");
  first.cleanup();
  first.cleanup();
  assert.deepEqual(f.operations.slice(-2), [
    "reset:widget-1",
    "remove:widget-1",
  ]);
  const second = await freshCaptcha(f.form);
  assert.equal(second.token, "token-2");
  assert.notEqual(second.token, first.token);
  second.cleanup();
  assert.deepEqual(f.operations.slice(-2), [
    "reset:widget-2",
    "remove:widget-2",
  ]);
});

test("hostname rejection cleans up and the next attempt can acquire a fresh token", async (t) => {
  const f = fixture(t);
  f.onExecute((config) =>
    (config["error-callback"] as (code: string) => void)("110200"),
  );
  await assert.rejects(freshCaptcha(f.form), /website address.*110200/);
  assert.deepEqual(f.operations.slice(-2), [
    "reset:widget-1",
    "remove:widget-1",
  ]);
  f.onExecute((config) =>
    (config.callback as (token: string) => void)("retry-token"),
  );
  const retried = await freshCaptcha(f.form);
  assert.equal(retried.token, "retry-token");
  retried.cleanup();
});

test("expired, timed out, blank and oversized tokens cannot reach submission", async (t) => {
  const f = fixture(t);
  for (const event of ["expired-callback", "timeout-callback"]) {
    f.onExecute((config) => (config[event] as () => void)());
    await assert.rejects(freshCaptcha(f.form));
  }
  for (const token of ["", "   ", "x".repeat(2049)]) {
    f.onExecute((config) =>
      (config.callback as (value: string) => void)(token),
    );
    await assert.rejects(freshCaptcha(f.form));
  }
  assert.equal(f.operations.filter((op) => op.startsWith("remove:")).length, 5);
});

test("a synchronous render error removes the widget without executing it", async (t) => {
  const f = fixture(t);
  f.turnstile.render = (_node, config) => {
    (config["error-callback"] as (code: string) => void)("110200");
    return "synchronous-widget";
  };
  await assert.rejects(freshCaptcha(f.form), /110200/);
  assert.deepEqual(f.operations, [
    "reset:synchronous-widget",
    "remove:synchronous-widget",
  ]);
});

test("missing configured CAPTCHA elements fail before loading a widget", async (t) => {
  const f = fixture(t);
  f.form.dataset.siteKey = "";
  await assert.rejects(freshCaptcha(f.form), /unavailable/);
  assert.equal(f.operations.length, 0);
});

test("cleanup errors do not change the protected request result", async (t) => {
  const f = fixture(t);
  f.onExecute((config) =>
    (config.callback as (token: string) => void)("verified-token"),
  );
  f.turnstile.reset = () => {
    throw new Error("widget reset failed");
  };
  const result = await freshCaptcha(f.form);
  assert.doesNotThrow(() => result.cleanup());
  assert.equal(result.token, "verified-token");
  assert.ok(f.operations.includes("remove:widget-1"));
});
