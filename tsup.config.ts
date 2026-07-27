import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: false,
    target: "node22",
    outDir: "dist"
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "node22",
    banner: { js: "#!/usr/bin/env node" },
    outDir: "dist"
  },
  {
    entry: { action: "src/action.ts" },
    format: ["cjs"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "node22",
    outExtension: () => ({ js: ".cjs" }),
    outDir: "dist"
  }
]);
