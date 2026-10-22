import { ConfigurationError } from "./errors";

export type Env = Readonly<Record<string, string | undefined>>;

/** Zwraca wartość zmiennej środowiskowej lub rzuca, gdy jej brak. */
export function requireEnv(name: string, env: Env = process.env): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new ConfigurationError(`Brak wymaganej zmiennej środowiskowej ${name}.`);
  }
  return value;
}

/** Zwraca liczbę całkowitą ze zmiennej środowiskowej albo wartość domyślną. */
export function intEnv(name: string, fallback: number, env: Env = process.env): number {
  const raw = env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new ConfigurationError(`Zmienna ${name} musi być liczbą całkowitą, otrzymano "${raw}".`);
  }
  return value;
}

/** Interpretuje zmienną środowiskową jako flagę (`1`, `true`, `yes`, `on`). */
export function boolEnv(name: string, fallback: boolean, env: Env = process.env): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(raw);
}
