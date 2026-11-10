import { createRequire } from "node:module";
// tsx supplies esbuild in the locked dependency graph; no extra build dependency.
const resolveBuildDependency = createRequire(import.meta.url);
const { buildSync } = createRequire(resolveBuildDependency.resolve("tsx/package.json"))("esbuild");
buildSync({
  entryPoints: ["scripts/production-bootstrap.ts"],
  outfile: ".next/bootstrap.cjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
});
