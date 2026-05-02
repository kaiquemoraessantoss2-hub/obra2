import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow any for migration/compatibility
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow setState in useEffect for initialization
      "react-hooks/set-state-in-effect": "warn",
      // Allow Date.now() in component for IDs
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
