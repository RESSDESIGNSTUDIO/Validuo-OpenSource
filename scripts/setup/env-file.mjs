// Files `loadRootEnv()` reads, highest precedence first (Next.js rules, chosen by NODE_ENV). The
// installer only needs to know whether the database URLs are set and not example values; real
// validation stays in `parseServerEnv()` (the migration step).
export const ENV_EXAMPLE_FILE = ".env.example";
const ENV_FILES_BY_MODE = {
  production: [".env.production.local", ".env.local", ".env.production", ".env"],
  test: [".env.test.local", ".env.test", ".env"],
  development: [".env.development.local", ".env.local", ".env.development", ".env"],
};

/** @param {string | undefined} nodeEnv */
export function envFilesFor(nodeEnv) {
  return nodeEnv === "production" || nodeEnv === "test" ? ENV_FILES_BY_MODE[nodeEnv] : ENV_FILES_BY_MODE.development;
}
const EXAMPLE_PASSWORD = "change-me";

/**
 * Reads `KEY` from dotenv text (single-line values only; no `$VAR` expansion). A key set to an
 * empty value is returned as "" — like @next/env, it still shadows lower-precedence files.
 * @param {string} content
 * @param {string} key
 * @returns {string | undefined}
 */
export function parseDotenvValue(content, key) {
  let value;
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match && match[1] === key) {
      value = unquote(match[2]);
    }
  }
  return value;
}

/** @param {string} raw */
function unquote(raw) {
  const trimmed = raw.trim();
  const quoted = /^(["'`])(.*)\1/.exec(trimmed);
  if (quoted) {
    return quoted[2];
  }
  return trimmed.replace(/\s+#.*$/, "");
}

/**
 * First definition of `key` by precedence: shell environment, then env files (a defined but empty
 * value counts as defined, as in @next/env). Never logged.
 * @param {{ env: Record<string, string | undefined>; fileContents: Array<string | null>; key: string }} sources
 *   `fileContents` follows `envFilesFor()` order, `null` for a missing file.
 * @returns {string | undefined}
 */
export function resolveEnvValue({ env, fileContents, key }) {
  if (env[key] !== undefined) {
    return env[key];
  }
  for (const content of fileContents) {
    const value = content === null ? undefined : parseDotenvValue(content, key);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * True for the value copied from `.env.example` (or any URL still using its example password).
 * @param {string} value
 * @param {string | undefined} exampleValue
 */
export function isExampleDatabaseUrl(value, exampleValue) {
  if (value === exampleValue) {
    return true;
  }
  try {
    return new URL(value).password === EXAMPLE_PASSWORD;
  } catch {
    // Not a URL: leave it to `parseServerEnv()` during migration, which reports variable names only.
    return false;
  }
}

/**
 * `host:port/database` without credentials, for the log line before migrating.
 * @param {string} value
 * @returns {string | null}
 */
export function describeDatabaseTarget(value) {
  if (value.includes("$")) {
    // Contains a variable reference that @next/env expands and we do not: do not print a wrong target.
    return null;
  }
  try {
    const url = new URL(value);
    const port = url.port ? `:${url.port}` : "";
    return `${url.hostname}${port}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return null;
  }
}
