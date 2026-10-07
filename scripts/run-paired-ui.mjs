import { spawn } from "node:child_process";
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contracts, snapshot } from "./parity-lib.mjs";
const web = fileURLToPath(new URL("../", import.meta.url));
const index = process.argv.indexOf("--native");
if (index < 0 || !process.argv[index + 1])
  throw Error(
    "Supply --native /path/to/Flutter/repository after preparing its disposable UI backend.",
  );
const native = path.resolve(process.argv[index + 1]);
await contracts(web, native);
const configPath = path.join(native, ".dart_tool/ui-test-config.json");
const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw);
if (
  config.SUPABASE_URL !== "http://127.0.0.1:55431" ||
  config.AUTH_CAPTCHA_ENABLED !== "false" ||
  ![config.UI_TEST_BUYER_EMAIL, config.UI_TEST_SUPPLIER_EMAIL].every((v) =>
    v?.endsWith("@ui-tests.example.test"),
  )
)
  throw Error("Only generated disposable Supabase fixtures are accepted.");
const out = path.join(web, ".parity-artifacts");
await mkdir(out, { recursive: true });
const revisions = { web: await snapshot(web), flutter: await snapshot(native) };
const checks = [];
async function run(id, cwd, command, args, extra = {}) {
  console.log(`${id}...`);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, ...extra },
    });
    child.on("error", reject);
    child.on("close", resolve);
  });
  checks.push({ id, status: code === 0 ? "passed" : "failed" });
  if (code !== 0) throw Error(`${id} failed.`);
}
try {
  await run(
    "browser-layout",
    web,
    "npm",
    ["run", "test:browser", "--", "tests/browser/public.spec.ts"],
    { PARITY_UI_CONFIG: configPath },
  );
  await copyFile(
    path.join(out, "browser-results.json"),
    path.join(out, "browser-layout.json"),
  );
  await run(
    "web-create",
    web,
    "npm",
    [
      "run",
      "test:browser",
      "--",
      "tests/browser/paired-journey.spec.ts",
      "--project=chromium",
    ],
    { PARITY_UI_CONFIG: configPath, PARITY_UI_STAGE: "prepare" },
  );
  await copyFile(
    path.join(out, "browser-results.json"),
    path.join(out, "web-create.json"),
  );
  const { enquiry } = JSON.parse(
    await readFile(path.join(out, "handoff.json"), "utf8"),
  );
  if (!Number.isSafeInteger(enquiry) || enquiry <= 0)
    throw Error("Invalid handoff enquiry.");
  async function flutter(stage) {
    await writeFile(
      configPath,
      JSON.stringify({
        ...config,
        UI_TEST_ENQUIRY_ID: String(enquiry),
        UI_TEST_PARITY_STAGE: stage,
      }),
      { mode: 0o600 },
    );
    await run(
      `flutter-${stage}`,
      native,
      "node",
      ["scripts/run-android-ui-tests.mjs"],
      { PARITY_UI_TARGET: "integration_test/paired_workflow_test.dart" },
    );
    await copyFile(
      path.join(native, ".dart_tool/ui-test-artifacts/flutter-test.log"),
      path.join(out, `flutter-${stage}.log`),
    );
  }
  await flutter("supplier");
  await run(
    "web-accept",
    web,
    "npm",
    [
      "run",
      "test:browser",
      "--",
      "tests/browser/paired-journey.spec.ts",
      "--project=chromium",
    ],
    { PARITY_UI_CONFIG: configPath, PARITY_UI_STAGE: "verify" },
  );
  await copyFile(
    path.join(out, "browser-results.json"),
    path.join(out, "web-accept.json"),
  );
  await flutter("buyer");
  console.log(
    "Paired enquiry → native quote/chat → web acceptance/PDF → native reload passed. This is one journey, not full release acceptance.",
  );
} finally {
  await writeFile(configPath, raw, { mode: 0o600 });
  await writeFile(
    path.join(out, "paired-ui.json"),
    JSON.stringify(
      {
        version: 1,
        revisions,
        executedAt: new Date().toISOString(),
        environment: "disposable local Supabase + Android emulator",
        checks,
      },
      null,
      2,
    ) + "\n",
  );
}
