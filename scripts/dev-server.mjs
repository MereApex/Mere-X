import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required to start the unified development server.");

const build = spawnSync(process.execPath, [npmCli, "run", "build"], { stdio: "inherit" });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawnSync(process.execPath, ["server/index.js", "--production"], { stdio: "inherit" });
if (server.error) throw server.error;
process.exit(server.status ?? 0);
