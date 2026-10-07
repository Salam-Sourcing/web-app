import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
// Opt-in fixture test. Its skip remains unverified, never a release pass.
const config = process.env.PARITY_UI_CONFIG
  ? JSON.parse(readFileSync(process.env.PARITY_UI_CONFIG, "utf8"))
  : null;
const stage = process.env.PARITY_UI_STAGE;
const photo = Buffer.from(
  JSON.parse(readFileSync("parity/contract.json", "utf8")).fixtureImageBase64,
  "base64",
);
const handoff = ".parity-artifacts/handoff.json";
async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(config.UI_TEST_BUYER_EMAIL);
  await page
    .locator('input[name="password"]')
    .fill(config.UI_TEST_BUYER_PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/discover/);
}
test("web enquiry → Flutter quote and message → web acceptance and export", async ({
  page,
}, info) => {
  test.skip(
    !config || !stage,
    "Requires generated fixture and paired Flutter execution.",
  );
  test.skip(
    info.project.name !== "chromium",
    "Paired mutation journey runs once; separate layout tests run on every browser.",
  );
  const client = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const signed = await client.auth.signInWithPassword({
    email: config.UI_TEST_BUYER_EMAIL,
    password: config.UI_TEST_BUYER_PASSWORD,
  });
  expect(signed.error).toBeNull();
  await login(page);
  if (stage === "prepare") {
    await page.goto(
      `/enquiries/new?supplier=${config.UI_TEST_SUPPLIER_COMPANY_ID}&listing=${config.UI_TEST_LISTING_ID}`,
    );
    await page.locator('input[name="title"]').fill("Paired parity enquiry");
    await page
      .locator('textarea[name="message"]')
      .fill("Generated paired request for 12.25 kg.");
    await page.locator('input[name="quantity"]').fill("12.25");
    await page.locator('input[name="unit_of_measure"]').fill("kg");
    await page
      .getByRole("button", { name: "Send enquiry", exact: true })
      .click();
    await expect(page).toHaveURL(/\/enquiries\/\d+/);
    const id = Number(new URL(page.url()).pathname.split("/").at(-1));
    const e = await client
      .from("enquiries")
      .select("id,quantity,unit_of_measure,currency,supplier_company_id")
      .eq("id", id)
      .single();
    expect(e.error).toBeNull();
    expect(e.data?.quantity).toBe(12.25);
    mkdirSync(".parity-artifacts", { recursive: true });
    writeFileSync(handoff, JSON.stringify({ enquiry: id }));
  } else if (stage === "verify") {
    const { enquiry } = JSON.parse(readFileSync(handoff, "utf8"));
    expect(Number.isSafeInteger(enquiry) && enquiry > 0).toBeTruthy();
    const quotes = await client
      .from("quotes")
      .select("id,total_price,notes,lead_time_days")
      .eq("enquiry_id", enquiry);
    expect(quotes.error).toBeNull();
    expect(quotes.data).toHaveLength(1);
    const q = quotes.data![0];
    expect(q.total_price).toBe(122.5);
    expect(q.lead_time_days).toBeNull();
    expect(q.notes).toBe("Created through Flutter quote form");
    await page.goto(`/quotes/${q.id}`);
    await expect(
      page.getByText("Created through Flutter quote form"),
    ).toBeVisible();
    const notice = await client
      .from("notifications")
      .select("id")
      .eq("entity_type", "quote")
      .eq("entity_id", q.id)
      .eq("user_id", config.UI_TEST_BUYER_ID)
      .single();
    expect(notice.error).toBeNull();
    await page.goto(`/notifications/${notice.data!.id}`);
    await expect(page).toHaveURL(new RegExp(`/quotes/${q.id}$`));
    const conversation = await client
      .from("conversations")
      .select("id")
      .eq("enquiry_id", enquiry)
      .single();
    expect(conversation.error).toBeNull();
    await page.goto(`/messages/${conversation.data!.id}`);
    await expect(page.getByText("Flutter paired reply")).toBeVisible();
    await expect(page.getByText("Photo from Flutter")).toBeVisible();
    const embedded = page.locator("img[data-message-image]").first();
    await expect
      .poll(() =>
        embedded.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBeTruthy();
    await page
      .getByRole("link", {
        name: "Open image: native-fixture.png",
        exact: true,
      })
      .click();
    const viewer = page.getByRole("dialog", { name: "Chat photo viewer" });
    await expect(viewer).toBeVisible();
    await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(viewer.getByText("150%", { exact: true })).toBeVisible();
    await viewer.getByRole("button", { name: "Reset", exact: true }).click();
    await viewer.getByRole("button", { name: "Close", exact: true }).click();
    await expect(viewer).not.toBeVisible();
    const send = page.getByRole("button", {
      name: "Send message",
      exact: true,
    });
    await expect(send).toBeDisabled();
    await page.locator('textarea[name="content"]').fill("Web paired reply");
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByText("Web paired reply")).toBeVisible();
    await page
      .getByRole("button", { name: "Attach a file", exact: true })
      .click();
    const attachment = page.getByRole("dialog", { name: "Send an attachment" });
    await expect(attachment).toBeVisible();
    await attachment
      .locator('input[type="file"]')
      .setInputFiles({
        name: "web-fixture.png",
        mimeType: "image/png",
        buffer: photo,
      });
    await attachment.locator('textarea[name="caption"]').fill("Photo from web");
    await attachment
      .getByRole("button", { name: "Send attachment", exact: true })
      .click();
    await expect(page.getByText("Photo from web")).toBeVisible();
    await page.goto(`/quotes/${q.id}`);
    await page
      .locator('form[action="/api/procurement/accept"] input[name="confirm"]')
      .check();
    await page
      .getByRole("button", { name: "Accept quote", exact: true })
      .click();
    await expect(page).toHaveURL(/\/deals\/\d+/);
    await expect(
      page.getByRole("button", { name: "Accept quote", exact: true }),
    ).toHaveCount(0);
    const deals = await client
      .from("deals")
      .select("id")
      .eq("enquiry_id", enquiry);
    expect(deals.error).toBeNull();
    expect(deals.data).toHaveLength(1);
    const pdf = await page.request.get(
      `/api/quotes/${enquiry}/export?quote=${q.id}`,
    );
    expect(pdf.ok()).toBeTruthy();
    expect(pdf.headers()["content-type"]).toMatch(/application\/pdf/);
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  } else throw Error("Unknown paired stage");
  await client.auth.signOut();
});
