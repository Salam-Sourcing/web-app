import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { snapshot, contracts, evaluateRelease } from "./parity-lib.mjs";
const web = fileURLToPath(new URL("../", import.meta.url));
const index = process.argv.indexOf("--native");
if (index < 0 || !process.argv[index + 1])
  throw Error(
    "Usage: npm run gate:parity -- --native /path/to/Flutter/repository",
  );
const native = path.resolve(process.argv[index + 1]);
const contract = await contracts(web, native);
const current = { web: await snapshot(web), flutter: await snapshot(native) };
const out = path.join(web, ".parity-artifacts");
await mkdir(out, { recursive: true });
if (process.argv.includes("--template")) {
  await writeFile(
    path.join(out, "acceptance-template.json"),
    JSON.stringify(
      {
        version: 1,
        revisions: current,
        results: contract.acceptance.flatMap((s) =>
          s.clients.map((client) => ({
            scenario: s.id,
            client,
            status: "unverified",
            executedAt: null,
            environment: "",
            artifact: "",
            details: "",
          })),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Created acceptance-template.json with unverified entries. Record actual execution outcomes and save as acceptance.json.",
  );
} else {
  const load = async (file) => {
    try {
      return JSON.parse(await readFile(path.join(out, file), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  };
  const automated = await load("automated.json");
  const evidence = await load("acceptance.json");
  const problems = evaluateRelease(contract, automated, evidence, current);
  if (automated?.sourceChangedDuringRun)
    problems.push(
      "Source changed during automated verification. Rerun verification.",
    );
  console.log(
    problems.length
      ? `Release blocked:\n${problems.map((p) => "• " + p).join("\n")}`
      : "Release acceptance passed for this exact paired source snapshot.",
  );
  process.exitCode = problems.length ? 1 : 0;
}
