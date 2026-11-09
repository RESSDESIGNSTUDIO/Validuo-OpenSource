import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/** Sign-in identity. Membership in an account is a `Person`. */
export const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    // Stored in the canonical (trimmed, lower-case) form, so a plain unique index is enough.
    email: p.string().length(254).unique(),
    passwordHash: p.text(),
    createdAt: p.datetime().defaultRaw("now()"),
  },
});

export type User = InferEntity<typeof UserSchema>;
