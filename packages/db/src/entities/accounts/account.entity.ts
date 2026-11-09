import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const AccountSchema = defineEntity({
  name: "Account",
  tableName: "accounts",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.string().length(120),
    createdAt: p.datetime().defaultRaw("now()"),
  },
});

export type Account = InferEntity<typeof AccountSchema>;
