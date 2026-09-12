import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5180, strictPort: false, open: false },
  preview: { port: 4173 },
  build: {
    target: "es2022",
    outDir: "../dist/site",
    emptyOutDir: true,
    assetsDir: "assets",
    cssCodeSplit: false,
    reportCompressedSize: false
  }
});
