import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const PermissionSchema = defineEntity({
  name: "Permission",
  tableName: "permissions",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    accountId: p.uuid(),
    personId: p.uuid(),
    // Values come from the catalogue in `@validuo/core/permissions`; the migration adds CHECKs.
    scopeType: p.string().length(16),
    // Account id for the `account` scope, group id for `group`.
    scopeId: p.uuid(),
    action: p.string().length(32),
    grantedByPersonId: p.uuid(),
    createdAt: p.datetime().defaultRaw("now()"),
  },
  uniques: [
    { name: "permissions_person_scope_action_unique", properties: ["personId", "scopeType", "scopeId", "action"] },
  ],
});

export type Permission = InferEntity<typeof PermissionSchema>;
