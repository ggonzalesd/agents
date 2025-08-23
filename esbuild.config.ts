import * as esbuild from "esbuild";

const entry = process.env.ENTRY || "./server/index.ts";
const minify = (process.env.MINIFY || "false") === "true";

console.log(`Building ${entry}...`);
console.log(`Minify: ${minify}`);
console.log(`Output directory: build`);

esbuild
  .build({
    entryPoints: [entry],
    outdir: "build",

    bundle: true,
    sourcemap: true,
    minify,

    format: "esm",
    target: "esnext",
    platform: "node",

    packages: "external",

    tsconfig: "tsconfig.node.json",
  })
  .then(() => {
    console.log("Build completed successfully.");
  })
  .catch(() => process.exit(1));
