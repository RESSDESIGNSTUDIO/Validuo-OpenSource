import type { EntityManager } from "@mikro-orm/postgresql";
import { PERMISSION_ACTIONS, type PermissionAction } from "@validuo/core/permissions";
import type { PermissionRepository } from "@validuo/core/ports/accounts";

import { PermissionSchema } from "../../entities/accounts/permission.entity";

export class MikroOrmPermissionRepository implements PermissionRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async grant(input: { accountId: string; personId: string; actions: readonly PermissionAction[] }): Promise<void> {
    const { accountId, personId, actions } = input;
    if (actions.length === 0) {
      return;
    }
    await this.deps.em.insertMany(
      PermissionSchema,
      actions.map((action) => ({ accountId, personId, action })),
    );
  }

  async listForPerson(accountId: string, personId: string): Promise<PermissionAction[]> {
    const rows = await this.deps.em.find(PermissionSchema, { accountId, personId });
    return rows.map((row) => oneOf(PERMISSION_ACTIONS, row.action));
  }
}

// A value outside the catalogue (e.g. written by hand) must never be read as a permission.
function oneOf(allowed: readonly PermissionAction[], value: string): PermissionAction {
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new Error(`Unknown permission value in storage: ${value}`);
  }
  return match;
}
