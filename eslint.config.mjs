import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Package boundaries (see AGENTS.md and .ai/specs/engineering-standards.md):
//   app -> ui, app -> core, app -> db -> core; ui and core depend on no workspace package.
// In flat config a later block replaces the options of the same rule instead of merging them,
// so every block below lists the complete set of restrictions for its files.
const restrict = (...patterns) => ["error", { patterns }];

const relativeIntoPackage = {
  regex: String.raw`^(\.\./)+(packages/)?(app|core|db|ui)/src(/|$)`,
  message: "Import other packages through their public `exports` (e.g. @validuo/core/di), not relative paths.",
};
const noApp = { group: ["@validuo/app", "@validuo/app/*"], message: "Shared packages must not import @validuo/app." };
const noNext = { group: ["next", "next/*"], message: "Next.js code belongs to @validuo/app." };
const noReact = {
  group: ["react", "react/*", "react-dom", "react-dom/*"],
  message: "This package is framework-free: no React.",
};
const noOrm = {
  group: ["@mikro-orm/*", "pg", "pg/*", "kysely", "kysely/*"],
  message: "Persistence lives in @validuo/db behind ports from @validuo/core.",
};
const noAwilix = {
  group: ["awilix", "awilix/*"],
  message: "Use @validuo/core/di — the container is configured in one place.",
};
const noServerOnly = { group: ["server-only"], message: "`server-only` marks @validuo/app server entries only." };

const corePatterns = [
  relativeIntoPackage,
  { group: ["@validuo/*"], message: "@validuo/core depends on no other workspace package." },
  noReact,
  noNext,
  noOrm,
  noServerOnly,
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    files: ["packages/core/**/*.{ts,tsx,mjs}"],
    rules: { "no-restricted-imports": restrict(...corePatterns, noAwilix) },
  },
  {
    // The only place in core that talks to Awilix directly.
    files: ["packages/core/src/di/**/*.ts"],
    rules: { "no-restricted-imports": restrict(...corePatterns) },
  },
  {
    files: ["packages/db/**/*.{ts,tsx,mjs}"],
    rules: {
      "no-restricted-imports": restrict(
        relativeIntoPackage,
        noApp,
        { group: ["@validuo/ui", "@validuo/ui/*"], message: "@validuo/db must not depend on UI." },
        noReact,
        noNext,
        noAwilix,
        noServerOnly,
      ),
    },
  },
  {
    files: ["packages/ui/**/*.{ts,tsx,mjs}"],
    rules: {
      "no-restricted-imports": restrict(
        relativeIntoPackage,
        {
          group: ["@validuo/*", "!@validuo/ui", "!@validuo/ui/*"],
          message:
            "@validuo/ui knows no ORM, DI, secrets or other workspace packages — pass data and callbacks as props.",
        },
        noNext,
        noOrm,
        noAwilix,
        noServerOnly,
      ),
    },
  },
  {
    files: ["packages/app/**/*.{ts,tsx,mjs}"],
    rules: { "no-restricted-imports": restrict(relativeIntoPackage, noAwilix) },
  },
  {
    // Public pages are styled with Tailwind classes; shadcn components are for the panel (backend).
    files: ["packages/app/src/app/(frontend)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrict(relativeIntoPackage, noAwilix, {
        group: ["@validuo/ui/components/*"],
        message: "(frontend) pages use Tailwind classes, not shadcn components from @validuo/ui.",
      }),
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
