// Downloads the exact, full-colour brand mark for every catalog entry into
// src/assets/plugins/<plugin id>.svg (plus <id>-dark.svg where a dark variant
// exists). Run with: npm run logos
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

import { ALL_PLUGINS } from "../src/js/plugin-catalog.js";

const SOURCES = {
  gb: (name) => `https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/${name}.svg`,
  svgl: (name) => `https://svgl.app/library/${name}.svg`,
  vlz: (name) => `https://www.vectorlogo.zone/logos/${name}/${name}-icon.svg`
};

const outDir = fileURLToPath(new URL("../src/assets/plugins/", import.meta.url));

async function download(reference) {
  const [source, name] = reference.split(":");
  const build = SOURCES[source];
  if (!build) throw new Error(`${reference}: unknown logo source "${source}"`);

  const response = await fetch(build(name));
  if (!response.ok) throw new Error(`${reference}: ${response.status} from ${build(name)}`);

  const svg = await response.text();
  if (!svg.includes("<svg")) throw new Error(`${reference}: response is not an svg`);
  return addViewBox(svg.trim().replace(/<\?xml[^>]*\?>\s*/, "").replace(/<!--[\s\S]*?-->\s*/g, ""));
}

// A few sources ship width/height without a viewBox, which stops the mark from
// scaling cleanly into the icon slot.
function addViewBox(svg) {
  if (/viewBox=/.test(svg)) return svg;
  const width = svg.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)/)?.[1];
  const height = svg.match(/<svg[^>]*\sheight="(\d+(?:\.\d+)?)/)?.[1];
  if (!width || !height) return svg;
  return svg.replace("<svg", `<svg viewBox="0 0 ${width} ${height}"`);
}

// Reported so a mark that is a single dark colour can be flagged invertOnDark.
function describe(svg) {
  const colors = [...new Set([...svg.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((match) => match[0].toUpperCase()))];
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/[\s,]+/).map(Number);
  const ratio = viewBox && viewBox.length === 4 ? (viewBox[2] / viewBox[3]).toFixed(2) : "?";
  return { colors, ratio };
}

await fs.mkdir(outDir, { recursive: true });

const failures = [];
const wide = [];

for (const plugin of ALL_PLUGINS) {
  try {
    const svg = await download(plugin.logo);
    await fs.writeFile(path.join(outDir, `${plugin.id}.svg`), `${svg}\n`, "utf8");

    if (plugin.dark) {
      const darkSvg = await download(plugin.dark);
      await fs.writeFile(path.join(outDir, `${plugin.id}-dark.svg`), `${darkSvg}\n`, "utf8");
    }

    const { colors, ratio } = describe(svg);
    if (Number(ratio) > 1.6) wide.push(`${plugin.id} (${ratio}:1)`);
    console.log(`${plugin.id.padEnd(18)} ${String(ratio).padStart(5)}  ${colors.slice(0, 6).join(" ")}`);
  } catch (error) {
    failures.push(error.message);
  }
}

console.log(`\nWrote ${ALL_PLUGINS.length - failures.length}/${ALL_PLUGINS.length} logos to src/assets/plugins/`);
if (wide.length) console.log(`Wordmark-shaped (check these): ${wide.join(", ")}`);
if (failures.length) {
  console.error(`\nFailed:\n  ${failures.join("\n  ")}`);
  process.exitCode = 1;
}
