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
    },
})
