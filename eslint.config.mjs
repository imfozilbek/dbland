// @ts-check
import eslint from "@eslint/js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: [
            "eslint.config.mjs",
            "**/dist/**",
            "**/node_modules/**",
            "**/coverage/**",
            "**/build/**",
            "**/examples/**",
            "**/test/**",
            "**/tests/**",
            "**/*.config.ts",
            "**/scripts/**",
            "**/src-tauri/**",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.es2021,
            },
            sourceType: "module",
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            // TypeScript Best Practices
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/explicit-function-return-type": [
                "warn",
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                },
            ],
            "@typescript-eslint/explicit-module-boundary-types": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/prefer-optional-chain": "warn",
            "@typescript-eslint/prefer-readonly": "warn",
            "@typescript-eslint/promise-function-async": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-unnecessary-type-parameters": "warn",
            "@typescript-eslint/no-deprecated": "off",
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                    allowBoolean: true,
                },
            ],

            // Code Quality
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "error",
            "no-alert": "error",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-arrow-callback": "warn",
            "prefer-template": "warn",
            "no-nested-ternary": "off",
            "no-unneeded-ternary": "error",
            "no-else-return": "warn",
            eqeqeq: ["error", "always"],
            curly: ["error", "all"],
            "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
            "no-trailing-spaces": "error",
            "comma-dangle": ["error", "always-multiline"],

            // Code Style
            indent: "off",
            "@typescript-eslint/indent": "off",
            quotes: ["error", "double", { avoidEscape: true }],
            semi: ["error", "never"],

            // Prettier Integration
            "prettier/prettier": [
                "error",
                {
                    tabWidth: 4,
                    endOfLine: "auto",
                },
            ],

            // Complexity
            complexity: ["warn", 15],
            "max-depth": ["warn", 4],
            "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }],
            "max-params": ["warn", 5],

            // Imports
            "no-duplicate-imports": "error",
            "sort-imports": [
                "warn",
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                },
            ],

            // Comments
            "spaced-comment": [
                "error",
                "always",
                {
                    markers: ["/"],
                    exceptions: ["-", "+", "*", "="],
                    block: {
                        balanced: true,
                    },
                },
            ],
        },
    },
    {
        // React components
        files: ["**/*.tsx"],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "max-lines-per-function": "off",
        },
    },
    {
        // DDD Value Objects and Use Cases
        files: ["**/domain/value-objects/**/*.ts", "**/application/use-cases/**/*.ts"],
        rules: {
            "max-params": ["warn", 8],
        },
    },
    {
        // Ports, adapters and utilities
        files: ["**/application/ports/**/*.ts", "**/infrastructure/**/*.ts", "**/domain/events/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
        },
    },
    {
        // Platform adapters: thin pass-throughs over Tauri invoke / web stubs.
        // The PlatformAPI contract returns Promise<T>, so the rules
        // require-await and promise-function-async fight each other —
        // one wants `async`, the other doesn't. Disable both for adapter files.
        files: [
            "**/lib/tauri-platform.ts",
            "**/lib/web-platform.ts",
            "**/contexts/PlatformContext.tsx",
        ],
        rules: {
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/promise-function-async": "off",
        },
    },
)
