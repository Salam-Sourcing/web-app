import assert from "node:assert/strict";
import test from "node:test";
import { createRequestId } from "../src/lib/request-id";
import { pendingText } from "../src/lib/procurement";
import { chatPhotoUrl } from "../src/scripts/chat-image-viewer";

test("HTTP preview creates secure v4 UUIDs without randomUUID", () => {
  const source = {
    getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
  };
  const ids = Array.from({ length: 100 }, () => createRequestId(source));
  assert.equal(new Set(ids).size, 100);
  for (const id of ids)
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
});
test("request IDs keep the native crypto receiver and fail without secure entropy", () => {
  const source = {
    randomUUID() {
      assert.equal(this, source);
      return "native";
    },
    getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
  };
  assert.equal(createRequestId(source as unknown as Crypto), "native");
  assert.throws(
    () => createRequestId({} as Crypto),
    /cannot prepare a secure message/,
  );
  assert.throws(() => pendingText(" \n "), /Write a message/);
});
test("photo viewer uses only same-origin protected message media routes", () => {
  const origin = "https://test.salamsourcing.com";
  assert.deepEqual(chatPhotoUrl("/api/media/message/81?inline=1", origin), {
    image: "/api/media/message/81?inline=1",
    download: "/api/media/message/81",
  });
  for (const href of [
    "https://other.test/api/media/message/81?inline=1",
    "javascript:alert(1)",
    "/api/media/message/0?inline=1",
    "/api/media/deal/81?inline=1",
    "/api/media/message/81?inline=1&redirect=elsewhere",
  ])
    assert.equal(chatPhotoUrl(href, origin), null);
});
