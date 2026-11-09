import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * Member of an account. Foreign keys (simple and composite) are written by hand in the migration:
 * keep them out of the entities, which map plain columns.
 */
export const PersonSchema = defineEntity({
  name: "Person",
  tableName: "persons",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    accountId: p.uuid(),
    userId: p.uuid(),
    displayName: p.string().length(120),
    createdAt: p.datetime().defaultRaw("now()"),
  },
  uniques: [
    // Target of the composite foreign keys that tie sessions and permissions to the same account.
    { name: "persons_id_account_id_unique", properties: ["id", "accountId"] },
    // v1: one account per user. Lifted by the invitations spec, together with account selection.
    { name: "persons_user_id_unique", properties: ["userId"] },
  ],
});

export type Person = InferEntity<typeof PersonSchema>;
