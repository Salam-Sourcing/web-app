import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
export async function snapshot(root) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  const files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean),
    ),
  ].sort();
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update("\0");
    try {
      digest.update(await readFile(path.join(root, file)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      digest.update("[deleted]");
    }
    digest.update("\0");
  }
  return {
    head: git(["rev-parse", "HEAD"]).trim(),
    tree: digest.digest("hex"),
  };
}
export async function contracts(web, native) {
  const a = await readFile(path.join(web, "parity/contract.json"));
  const b = await readFile(path.join(native, "parity/contract.json"));
  if (!a.equals(b))
    throw Error(
      "The two parity contracts differ. Review and synchronize them before verification.",
    );
  const contract = JSON.parse(a);
  const screens = (await readdir(path.join(native, "lib/presentation/screens")))
    .filter((f) => f.endsWith("_screen.dart"))
    .sort();
  const expected = contract.screens.map((s) => s.screen).sort();
  if (JSON.stringify(screens) !== JSON.stringify(expected))
    throw Error(
      "Flutter screen inventory changed without a shared acceptance update.",
    );
  return contract;
}
export function evaluateRelease(
  contract,
  automated,
  evidence,
  current,
  now = Date.now(),
) {
  const problems = [];
  for (const client of ["web", "flutter"]) {
    if (
      JSON.stringify(automated?.revisions?.[client]) !==
      JSON.stringify(current[client])
    )
      problems.push(`${client}: automated evidence is stale or missing.`);
    if (
      JSON.stringify(evidence?.revisions?.[client]) !==
      JSON.stringify(current[client])
    )
      problems.push(`${client}: acceptance evidence is stale or missing.`);
  }
  for (const required of [
    "web-check",
    "web-unit",
    "web-build",
    "web-http",
    "flutter-analysis",
    "flutter-unit",
    "database",
  ]) {
    if (
      automated?.checks?.filter((c) => c.id === required).length !== 1 ||
      automated?.checks?.find((c) => c.id === required)?.status !== "passed"
    )
      problems.push(`${required}: required automated check is not passed.`);
  }
  for (const scenario of contract.acceptance) {
    if (!scenario.required) continue;
    for (const client of scenario.clients) {
      const records =
        evidence?.results?.filter(
          (r) => r.scenario === scenario.id && r.client === client,
        ) ?? [];
      const result =
        records.length === 1 &&
        records.find(
          (r) =>
            r.status === "passed" &&
            typeof r.artifact === "string" &&
            r.artifact.trim() &&
            typeof r.environment === "string" &&
            r.environment.trim() &&
            typeof r.details === "string" &&
            r.details.trim() &&
            Number.isFinite(Date.parse(r.executedAt)) &&
            now - Date.parse(r.executedAt) >= 0 &&
            now - Date.parse(r.executedAt) < 7 * 86400000,
        );
      if (!result)
        problems.push(
          `${scenario.id}/${client}: current execution evidence missing, failed, expired or unverified.`,
        );
    }
  }
  return problems;
}
