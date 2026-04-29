import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { readFileSync } from "fs"

// Read package.json once at config-load time so `__APP_VERSION__` in
// the bundle stays in lockstep with the actual shipped version. The
// alternative — hard-coding "v1.1.0" in StatusBar's default prop — was
// already drifting (the prop default lived next to the literal in
// every PR that bumped the package version).
const pkg = JSON.parse(
    readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version: string }

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    // Tauri expects a fixed port
    server: {
        port: 1420,
        strictPort: true,
    },
    // Env prefix for Tauri
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        // Tauri uses Chromium on Windows and WebKit on macOS and Linux
        target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
        // Don't minify for debug builds
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        // Produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,
        // `@dbland/core` ships compiled CommonJS (TypeScript with
        // `module: "nodenext"` + a `package.json` that doesn't set
        // `"type": "module"` produces CJS). Vite's `@rollup/plugin-
        // commonjs` only sweeps `node_modules` by default, but the
        // workspace dep lives at `libs/core` — outside that scope —
        // so the plugin never converts its getter-based re-exports
        // (`Object.defineProperty(exports, "x", { get: ... })`) into
        // ES re-exports rollup can statically introspect. Without
        // this, named imports like `extractErrorMessage` fail with
        // "X is not exported by libs/core/dist/index.js" even though
        // the symbol is there at runtime. Pulling the workspace
        // package into the include list fixes the resolution at
        // build time without touching the dist format.
        commonjsOptions: {
            include: [/libs\/core/, /node_modules/],
            transformMixedEsModules: true,
        },
    },
})
