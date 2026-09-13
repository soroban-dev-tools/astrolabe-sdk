/* Copyright 2026 The Astrolabe Authors. Apache-2.0. */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: { node: true, browser: true, es2022: true },
  ignorePatterns: ["dist", "src/generated", "node_modules"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
