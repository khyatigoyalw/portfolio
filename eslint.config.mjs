import { defineConfig, globalIgnores } from "eslint/config";
import nextTs from "eslint-config-next/typescript";

// Lints scripts/ and packages/. Each app has its own eslint.config.mjs (Next rules).
export default defineConfig([
  ...nextTs,
  globalIgnores(["apps/**", "legacy/**", "node_modules/**"]),
]);
