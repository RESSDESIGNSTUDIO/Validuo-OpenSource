import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/** Rate-limit counter of one fixed time window; the key is a digest, never a raw e-mail or IP. */
export const LoginAttemptSchema = defineEntity({
  name: "LoginAttempt",
  tableName: "login_attempts",
  properties: {
    kind: p.string().length(16).primary(),
    keyHash: p.string().length(64).primary(),
    windowStart: p.datetime().primary(),
    count: p.integer().default(0),
  },
});

export type LoginAttempt = InferEntity<typeof LoginAttemptSchema>;
