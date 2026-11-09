import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const PermissionSchema = defineEntity({
  name: "Permission",
  tableName: "permissions",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    accountId: p.uuid(),
    personId: p.uuid(),
    // In v1 a permission covers the whole account. Values come from the catalogue in
    // `@validuo/core/permissions`; the migration adds the CHECK.
    action: p.string().length(32),
    createdAt: p.datetime().defaultRaw("now()"),
  },
  uniques: [{ name: "permissions_person_action_unique", properties: ["personId", "action"] }],
});

export type Permission = InferEntity<typeof PermissionSchema>;
