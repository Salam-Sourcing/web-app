import assert from "node:assert/strict";
import test from "node:test";
import {
  isPrivatePath,
  cleanLegacyPath,
  privateRoots,
} from "../src/lib/routes";
test("all former workspace routes remain private after removing the app prefix", () => {
  for (const root of privateRoots)
    for (const suffix of ["", "/", "/123"])
      assert.equal(isPrivatePath("/" + root + suffix), true);
  for (const path of [
    "/",
    "/platform",
    "/plans",
    "/verification",
    "/about",
    "/help",
    "/api/preview/1",
    "/accounting",
    "/messages-extra",
  ])
    assert.equal(isPrivatePath(path), false);
});
test("legacy redirects preserve destinations and never become external URLs", () => {
  assert.equal(cleanLegacyPath("/app/messages/3"), "/messages/3");
  assert.equal(cleanLegacyPath("/app"), "/discover");
  for (const path of [
    "/app//evil.test",
    "/app/%2f%2fevil.test",
    "/app/login",
    "/app/api/auth",
    "/app/unknown",
  ])
    assert.equal(cleanLegacyPath(path), "/discover");
});
