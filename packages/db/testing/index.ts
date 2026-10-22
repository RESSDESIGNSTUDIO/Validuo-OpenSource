// Plain Node entry (no Vitest imports) — also used by scripts such as `npm run app:ephemeral`.
export { reportStartupFailure, requireTestDatabaseUrl, startTestDatabase, type TestDatabase } from "./test-database";
