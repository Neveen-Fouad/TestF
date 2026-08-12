import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly", document: "readonly", location: "readonly",
        localStorage: "readonly", sessionStorage: "readonly", fetch: "readonly",
        URLSearchParams: "readonly", FormData: "readonly", setTimeout: "readonly",
        confirm: "readonly"
      }
    },
    rules: { "no-empty": ["error", { allowEmptyCatch: true }] }
  }
];
