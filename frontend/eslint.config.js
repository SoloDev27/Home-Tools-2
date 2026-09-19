import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    { ignores: ["dist", "node_modules", "public"] },
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        settings: { react: { version: "detect" } },
        plugins: {
            react,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...react.configs.flat.recommended.rules,
            ...react.configs.flat["jsx-runtime"].rules,
            ...reactHooks.configs["recommended-latest"].rules,
            "react/prop-types": "off",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": ["warn", { allow: ["warn", "error"] }],
        },
    },
    {
        // React Three Fiber uses its own JSX props (position, args, castShadow, ...)
        // that the DOM-oriented react/no-unknown-property rule cannot know about.
        files: [
            "src/components/RenderPageComponents/**",
            "src/pages/UnifiedEditor/Unified3DCanvas.jsx",
        ],
        rules: { "react/no-unknown-property": "off" },
    },
    {
        files: ["src/__tests__/**", "src/setupTests.js", "**/*.test.{js,jsx}"],
        languageOptions: { globals: { ...globals.vitest } },
    },
];
