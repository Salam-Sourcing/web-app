import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
import { once } from "node:events";
const port = 4330;
const server = spawn(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `import {preview} from 'astro'; await preview({server:{host:'127.0.0.1',port:${port}}});`,
  ],
  { stdio: ["ignore", "pipe", "pipe"], env: process.env },
);
let logs = "";
for (const stream of [server.stdout, server.stderr])
  stream.on("data", (data) => (logs = (logs + data.toString()).slice(-6000)));
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error("Preview exited: " + logs);
    try {
      if ((await fetch("http://127.0.0.1:" + port + "/login")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(250);
  }
  if (!ready) throw new Error("Preview did not become ready: " + logs);
  const test = spawn(process.execPath, ["tests/http-smoke.mjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      SMOKE_URL: "http://127.0.0.1:" + port,
      SMOKE_PRODUCTION: "true",
    },
  });
  const [code] = await once(test, "exit");
  if (code !== 0) throw new Error("Production HTTP smoke failed.");
} finally {
  server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), pause(2000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
