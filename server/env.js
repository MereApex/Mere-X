import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const filename of [".env.local", ".env"]) {
  const target = path.join(rootDirectory, filename);
  if (fs.existsSync(target) && typeof process.loadEnvFile === "function") process.loadEnvFile(target);
}
