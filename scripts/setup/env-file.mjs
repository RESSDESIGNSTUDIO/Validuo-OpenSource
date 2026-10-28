// Files `loadRootEnv()` reads in development, highest precedence first (Next.js rules). The
// installer only needs to know whether `DATABASE_URL` is set somewhere and not an example value;
// real validation stays in `parseServerEnv()` (the migration step).
export const ENV_FILES = [".env.development.local", ".env.local", ".env.development", ".env"];
export const ENV_EXAMPLE_FILE = ".env.example";
const EXAMPLE_PASSWORD = "change-me";

/**
 * Reads `KEY` from dotenv text. Empty values count as "not set", like in `parseServerEnv()`.
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
  return value === "" ? undefined : value;
}

/** @param {string} raw */
function unquote(raw) {
  const trimmed = raw.trim();
  const quoted = /^(["'])(.*)\1/.exec(trimmed);
  if (quoted) {
    return quoted[2];
  }
  return trimmed.replace(/\s+#.*$/, "");
}

/**
 * First `DATABASE_URL` by precedence: shell environment, then env files. Never logged.
 * @param {{ env: Record<string, string | undefined>; fileContents: Array<string | null> }} sources
 *   `fileContents` follows `ENV_FILES` order, `null` for a missing file.
 * @returns {string | undefined}
 */
export function resolveDatabaseUrl({ env, fileContents }) {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  for (const content of fileContents) {
    const value = content === null ? undefined : parseDotenvValue(content, "DATABASE_URL");
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
  try {
    const url = new URL(value);
    const port = url.port ? `:${url.port}` : "";
    return `${url.hostname}${port}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return null;
  }
}
