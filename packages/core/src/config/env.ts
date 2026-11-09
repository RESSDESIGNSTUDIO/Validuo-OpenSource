import { z } from "zod";

import { ConfigurationError } from "../errors/configuration-error";

export type EnvSource = Readonly<Record<string, string | undefined>>;

export type DatabaseConfig = {
  /** Runtime connection — a least-privilege role. */
  url: string;
  poolMin: number;
  poolMax: number;
  debug: boolean;
};

export type AuthConfig = {
  /** Public origin of the application (`https://app.example.com`); unset → the request's `Host`. */
  appOrigin: string | undefined;
  /** Whether `x-forwarded-for` comes from a proxy we control and may identify the client IP. */
  trustedProxy: boolean;
};

export type ServerEnv = {
  database: DatabaseConfig;
  auth: AuthConfig;
  /** Connection used by the MikroORM CLI (migrations); defaults to `database.url`, e.g. locally. */
  migrationDatabaseUrl: string;
};

// `KEY=` in a .env file means "not set", not "empty value".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const postgresUrl = z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgres:// or postgresql:// URL" });

// An origin has no path, query or trailing slash: it is compared as a string with the `Origin` header.
const httpOrigin = z
  .url({ protocol: /^https?$/, error: "must be an http(s) URL" })
  .refine((value) => URL.canParse(value) && new URL(value).origin === value, {
    error: "must be an origin without a path or trailing slash",
  });

const serverEnvSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    MIGRATION_DATABASE_URL: optional(postgresUrl.optional()),
    DB_POOL_MIN: optional(z.coerce.number().int().min(0).default(0)),
    DB_POOL_MAX: optional(z.coerce.number().int().min(1).default(10)),
    DB_DEBUG: optional(z.stringbool().default(false)),
    APP_ORIGIN: optional(httpOrigin.optional()),
    TRUSTED_PROXY: optional(z.stringbool().default(false)),
  })
  .refine((env) => env.DB_POOL_MIN <= env.DB_POOL_MAX, {
    path: ["DB_POOL_MAX"],
    error: "must be greater than or equal to DB_POOL_MIN",
  })
  .transform((env): ServerEnv => ({
    database: {
      url: env.DATABASE_URL,
      poolMin: env.DB_POOL_MIN,
      poolMax: env.DB_POOL_MAX,
      debug: env.DB_DEBUG,
    },
    auth: { appOrigin: env.APP_ORIGIN, trustedProxy: env.TRUSTED_PROXY },
    migrationDatabaseUrl: env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL,
  }));

/**
 * Validates the server environment in one place. The error lists variable names and problems
 * only — never values, because they may contain secrets.
 */
export function parseServerEnv(source: EnvSource): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
  throw new ConfigurationError(`Invalid environment configuration:\n${problems.join("\n")}`);
}
