import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // Async server pages catch database-fetch failures and return a safe state.
    // The JSX itself is still covered by app/error.tsx.
    rules: { "react-hooks/error-boundaries": "off" },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
