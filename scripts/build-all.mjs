import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedDirectories = [path.join(workspace, "dist"), path.join(workspace, "landing", "dist")];

for (const directory of generatedDirectories) {
  const expectedParent = directory.endsWith(`${path.sep}landing${path.sep}dist`)
    ? path.join(workspace, "landing")
    : workspace;
  if (path.basename(directory) !== "dist" || path.dirname(directory) !== expectedParent) {
    throw new Error(`Refusing to clean unexpected build directory: ${directory}`);
  }
  fs.rmSync(directory, { recursive: true, force: true });
}

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required to run the unified build.");

for (const script of ["build:workspace", "build:landing"]) {
  const result = spawnSync(process.execPath, [npmCli, "run", script], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
