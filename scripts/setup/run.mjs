import { checkRequirements } from "./requirements.mjs";
import { needsInstall } from "./install.mjs";
import {
  ENV_EXAMPLE_FILE,
  describeDatabaseTarget,
  envFilesFor,
  isExampleDatabaseUrl,
  parseDotenvValue,
  resolveEnvValue,
} from "./env-file.mjs";

const LOCKFILE = "package-lock.json";
const INSTALLED_LOCKFILE = "node_modules/.package-lock.json";

/**
 * @typedef {object} SetupDeps
 * @property {Record<string, string | undefined>} env
 * @property {string} nodeVersion
 * @property {() => string | null} getNpmVersion
 * @property {(relativePath: string) => boolean} exists
 * @property {(relativePath: string) => string} readText
 * @property {(relativePath: string) => number | null} mtimeMs
 * @property {(from: string, to: string) => void} createFrom Copies `from` to a NEW `to` (never overwrites), mode 0600.
 * @property {(args: string[]) => Promise<number>} runNpm Exit code of `npm <args>`; output goes to the terminal.
 * @property {(line: string) => void} log
 */

/**
 * Runs the steps of README "Uruchomienie" in order, skipping what is already done. Returns the
 * process exit code. Our own messages never contain the DATABASE_URL value or its password.
 * @param {SetupDeps} deps
 * @returns {Promise<number>}
 */
export async function runSetup(deps) {
  const done = [];
  const skipped = [];
  const step = (list, status, message) => {
    list.push(message);
    deps.log(`[${status}] ${message}`);
  };
  const fail = (message) => {
    deps.log(`[błąd] ${message}`);
    return 1;
  };

  try {
    const problems = checkRequirements({ nodeVersion: deps.nodeVersion, npmVersion: deps.getNpmVersion() });
    if (problems.length > 0) {
      problems.forEach((problem) => deps.log(`[błąd] ${problem}`));
      return 1;
    }

    if (
      needsInstall({
        lockMtimeMs: deps.mtimeMs(LOCKFILE),
        installedLockMtimeMs: deps.mtimeMs(INSTALLED_LOCKFILE),
      })
    ) {
      if ((await deps.runNpm(["install"])) !== 0) {
        return fail("npm install nie powiódł się — popraw błąd powyżej i uruchom npm run setup ponownie.");
      }
      step(done, "wykonano", "zależności zainstalowane (npm install)");
    } else {
      step(skipped, "pominięto", "zależności są aktualne");
    }

    const envFiles = envFilesFor(deps.env.NODE_ENV);
    if (envFiles.some((file) => deps.exists(file))) {
      step(skipped, "pominięto", "plik .env już istnieje (nie jest nadpisywany)");
    } else if (!deps.exists(ENV_EXAMPLE_FILE)) {
      return fail(`Brakuje pliku ${ENV_EXAMPLE_FILE} — nie można utworzyć .env.`);
    } else {
      deps.createFrom(ENV_EXAMPLE_FILE, ".env");
      step(done, "wykonano", `utworzono .env z ${ENV_EXAMPLE_FILE}`);
    }

    const fileContents = envFiles.map((file) => (deps.exists(file) ? deps.readText(file) : null));
    const exampleText = deps.exists(ENV_EXAMPLE_FILE) ? deps.readText(ENV_EXAMPLE_FILE) : "";
    const lookup = (key) => resolveEnvValue({ env: deps.env, fileContents, key });
    const runtimeUrl = lookup("DATABASE_URL");
    // `db:migrate` connects with MIGRATION_DATABASE_URL and falls back to DATABASE_URL (parseServerEnv).
    const migrationUrl = lookup("MIGRATION_DATABASE_URL") || runtimeUrl;
    const isUnset = (value) => value === undefined || value === "";
    const needsEdit = (key, value) => isUnset(value) || isExampleDatabaseUrl(value, parseDotenvValue(exampleText, key));
    // MIGRATION_DATABASE_URL is optional: an empty one means "not set", so only the effective
    // migration URL is checked for example values.
    if (needsEdit("DATABASE_URL", runtimeUrl) || needsEdit("DATABASE_URL", migrationUrl)) {
      return fail(
        "Uzupełnij DATABASE_URL (i ewentualnie MIGRATION_DATABASE_URL) w .env — adres PostgreSQL 17 z prawdziwymi danymi dostępu — potem uruchom npm run setup ponownie.",
      );
    }

    const target = describeDatabaseTarget(migrationUrl);
    if (target !== null) {
      deps.log(`Baza, na której zostaną zastosowane migracje: ${target}`);
    }
    if ((await deps.runNpm(["run", "db:migrate"])) !== 0) {
      return fail(
        "Nie udało się zastosować migracji — sprawdź, czy PostgreSQL działa oraz czy DATABASE_URL i uprawnienia konta są poprawne.",
      );
    }
    step(done, "wykonano", "migracje aktualne (npm run db:migrate)");
  } catch (error) {
    return fail(`Nieoczekiwany błąd: ${error instanceof Error ? error.message : String(error)}`);
  }

  deps.log(`Gotowe (wykonano: ${done.length}, pominięto: ${skipped.length}).`);
  deps.log("Uruchom aplikację: npm run dev (http://localhost:3000, stan: /api/health).");
  return 0;
}
