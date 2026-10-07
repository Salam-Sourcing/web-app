import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ownedIntent,
  prepareUpload,
  uploadBucket,
} from "../src/lib/server/uploads.ts";
import { validateFile } from "../src/lib/catalog.ts";
import { validatePicked } from "../src/scripts/procurement.ts";
import { savedEnquiry } from "../src/lib/server/saved-enquiry.ts";
const user = "00000000-0000-4000-8000-000000000001",
  key = "40000000-0000-4000-8000-000000000001";
test("personal upload intent is bound to own immutable profile path", () => {
  const i = {
    user,
    key,
    kind: "profile",
    target: 1,
    created: Date.now(),
    mime: "image/png",
    path: `profile/${user}/${key}.png`,
  };
  assert.equal(ownedIntent(i, user), true);
  assert.equal(uploadBucket("profile"), "profile-photos");
  assert.equal(ownedIntent({ ...i, target: 2 }, user), false);
  assert.equal(
    ownedIntent({ ...i, path: `1/${user}/${key}.png` }, user),
    false,
  );
  assert.equal(ownedIntent(i, "another-user"), false);
});
test("personal photo preparation works without a company and snapshots only the current user's photo", async () => {
  const filters: unknown[] = [],
    cookies: any[] = [];
  const sdk = {
    from: (table: string) => {
      assert.equal(table, "profile_photos");
      return {
        select: (columns: string) => {
          assert.equal(columns, "storage_path");
          return {
            eq: (column: string, id: string) => {
              filters.push([column, id]);
              return {
                maybeSingle: async () => ({
                  data: { storage_path: `profile/${user}/${key}.png` },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
  const context = {
    locals: {
      workspace: {
        user: { id: user },
        profile: { id: user, status: "active" },
        company: null,
        client: sdk,
      },
    },
    request: new Request("http://local.test/api/uploads/prepare"),
    url: new URL("http://local.test/api/uploads/prepare"),
    cookies: {
      get: () => undefined,
      set: (...args: any[]) => cookies.push(args),
    },
  };
  const response = await prepareUpload(context as never, {
    kind: "profile",
    target_id: "1",
    mime: "image/png",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(filters, [["user_id", user]]);
  const intent = JSON.parse(cookies[0][1]);
  assert.equal(intent.previous_path, `profile/${user}/${key}.png`);
  assert.equal(ownedIntent(intent, user), true);
  assert.equal(cookies[0][2].httpOnly, true);
  await assert.rejects(() =>
    prepareUpload(context as never, {
      kind: "profile",
      target_id: "2",
      mime: "image/png",
    }),
  );
});
test("personal photos enforce real image type and size before upload", () => {
  assert.doesNotThrow(() =>
    validateFile(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
      "profile",
    ),
  );
  assert.throws(() =>
    validateFile(new Uint8Array(5242881), "image/png", "profile"),
  );
  assert.throws(() =>
    validateFile(
      new TextEncoder().encode("%PDF-1.7"),
      "application/pdf",
      "profile",
    ),
  );
  assert.throws(() =>
    validatePicked(
      new File(["%PDF-1.7"], "x.pdf", { type: "application/pdf" }),
      "profile",
    ),
  );
});
test("enquiry saved state uses the actual composite key schema and user scope", async () => {
  const filters: unknown[] = [];
  const builder: any = {
    eq: (...args: any[]) => {
      filters.push(args);
      return builder;
    },
    maybeSingle: async () => ({ data: { enquiry_id: 42 }, error: null }),
  };
  const state = {
    user: { id: user },
    client: {
      from: (table: string) => {
        assert.equal(table, "saved_enquiries");
        return {
          select: (columns: string) => {
            if (columns !== "enquiry_id")
              throw new Error(
                "Column is not present in saved_enquiries schema",
              );
            return builder;
          },
        };
      },
    },
  };
  assert.deepEqual((await savedEnquiry(state as never, 42)).data, {
    enquiry_id: 42,
  });
  assert.deepEqual(filters, [
    ["enquiry_id", 42],
    ["user_id", user],
  ]);
});
