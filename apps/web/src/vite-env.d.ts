/// <reference types="vite/client" />

/**
 * Build-time constant injected by Vite's `define` from the app's
 * package.json `version` field. Stays in lockstep with the shipped
 * version so the StatusBar footer never drifts.
 */
declare const __APP_VERSION__: string
