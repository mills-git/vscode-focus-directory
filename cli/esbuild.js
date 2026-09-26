const esbuild = require("esbuild");

// Bundles the CLI together with the shared extension source and its
// `ignore` dependency into one self-contained file.
esbuild
    .build({
        entryPoints: ["cli.ts"],
        bundle: true,
        platform: "node",
        format: "cjs",
        target: "node20",
        outfile: "dist/cli.js",
        banner: { js: "#!/usr/bin/env node" },
        logLevel: "info",
    })
    .catch(() => process.exit(1));
