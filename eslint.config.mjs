import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    // Pakiety współdzielone nie mogą zależeć od aplikacji ani od Next.js.
    files: ["packages/{core,db,ui}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@validuo/app", "@validuo/app/*"], message: "Pakiety współdzielone nie mogą importować z @validuo/app." },
            { group: ["next", "next/*"], message: "Kod Next.js należy do @validuo/app." },
          ],
        },
      ],
    },
  },
  {
    // core jest niezależny od bazy i UI.
    files: ["packages/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@validuo/*"], message: "@validuo/core nie zależy od innych pakietów workspace." },
            { group: ["react", "react-dom", "react/*", "next", "next/*"], message: "@validuo/core nie zależy od React/Next.js." },
          ],
        },
      ],
    },
  },
  {
    // Strony publiczne stylujemy Tailwindem; komponenty shadcn są dla panelu (backend).
    files: ["packages/app/src/app/(frontend)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@validuo/ui/components/*"],
              message: "Strony (frontend) używają klas Tailwind, nie komponentów shadcn z @validuo/ui.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "packages/db/src/migrations/**",
  ]),
]);

export default eslintConfig;
