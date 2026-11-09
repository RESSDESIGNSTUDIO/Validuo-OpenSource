import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const SessionSchema = defineEntity({
  name: "Session",
  tableName: "sessions",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    personId: p.uuid(),
    accountId: p.uuid(),
    // SHA-256 digest of the cookie token; the token itself is never stored.
    tokenHash: p.string().length(64).unique(),
    createdAt: p.datetime().defaultRaw("now()"),
    lastSeenAt: p.datetime().defaultRaw("now()"),
    expiresAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
  },
  indexes: [{ name: "sessions_expires_at_index", properties: ["expiresAt"] }],
});

export type Session = InferEntity<typeof SessionSchema>;
