import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { snapshot, contracts } from "./parity-lib.mjs";
const web = fileURLToPath(new URL("../", import.meta.url));
const index = process.argv.indexOf("--native");
if (index < 0 || !process.argv[index + 1])
  throw Error(
    "Usage: npm run verify:parity -- --native /path/to/Flutter/repository",
  );
const native = path.resolve(process.argv[index + 1]);
await contracts(web, native);
const revisions = { web: await snapshot(web), flutter: await snapshot(native) };
const out = path.join(web, ".parity-artifacts");
await mkdir(out, { recursive: true });
const checks = [];
const commands = [
  ["web-check", web, "npm", ["run", "check"]],
  ["web-unit", web, "npm", ["test"]],
  ["web-build", web, "npm", ["run", "build"]],
  ["web-http", web, "npm", ["run", "test:release"]],
  [
    "flutter-analysis",
    native,
    process.env.DART_BIN || "dart",
    ["analyze", "lib", "test", "integration_test"],
  ],
  [
    "flutter-unit",
    native,
    process.env.FLUTTER_BIN || "flutter",
    ["test", "--no-pub"],
  ],
  ["database", path.join(native, "supabase/tests"), "npm", ["test"]],
];
for (const [id, cwd, command, args] of commands) {
  console.log(`Verifying ${id}...`);
  const started = Date.now();
  let output = "";
  let status = await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (data) => {
        output += data.toString();
      });
    child.on("error", (error) => {
      output += error.message;
      resolve("failed");
    });
    child.on("close", (code) => resolve(code === 0 ? "passed" : "failed"));
  });
  if (
    id === "database" &&
    status === "passed" &&
    !process.env.CONCURRENCY_DATABASE_URL
  ) {
    status = "unverified";
    output +=
      "\nSQL checks passed; real PostgreSQL concurrency evidence requires CONCURRENCY_DATABASE_URL for a disposable database.\n";
  }
  await writeFile(path.join(out, `${id}.log`), output);
  checks.push({
    id,
    status,
    durationMs: Date.now() - started,
    artifact: `.parity-artifacts/${id}.log`,
  });
  console.log(`${id}: ${status}`);
  // Continue independent checks; the result remains failed if any check failed.
}
const changed =
  JSON.stringify(revisions) !==
  JSON.stringify({ web: await snapshot(web), flutter: await snapshot(native) });
await writeFile(
  path.join(out, "automated.json"),
  JSON.stringify(
    {
      version: 1,
      executedAt: new Date().toISOString(),
      revisions,
      checks,
      sourceChangedDuringRun: changed,
    },
    null,
    2,
  ) + "\n",
);
if (changed || checks.some((c) => c.status !== "passed")) process.exitCode = 1;
console.log(
  "Saved automated evidence. Browser/device acceptance still requires execution evidence; run gate:parity to see outstanding cases.",
);
