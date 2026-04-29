import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { readFileSync } from "fs"

// Single source of truth for the shipped version: package.json. The
// bundle picks it up via `__APP_VERSION__` so the StatusBar footer
// (and any other consumer) doesn't need a literal that drifts on every
// version bump.
const pkg = JSON.parse(
    readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version: string }

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
    server: {
        port: 3000,
    },
    build: {
        target: "esnext",
        sourcemap: true,
    },
})
