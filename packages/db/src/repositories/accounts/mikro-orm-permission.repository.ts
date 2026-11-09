import type { EntityManager } from "@mikro-orm/postgresql";
import {
  PERMISSION_ACTIONS,
  PERMISSION_SCOPES,
  type Permission,
  type PermissionAction,
  type PermissionScope,
} from "@validuo/core/permissions";
import type { PermissionRepository } from "@validuo/core/ports/accounts";

import { PermissionSchema } from "../../entities/accounts/permission.entity";

export class MikroOrmPermissionRepository implements PermissionRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async grant(input: {
    accountId: string;
    personId: string;
    grantedByPersonId: string;
    permissions: readonly Permission[];
  }): Promise<void> {
    const { accountId, personId, grantedByPersonId, permissions } = input;
    if (permissions.length === 0) {
      return;
    }
    await this.deps.em.insertMany(
      PermissionSchema,
      permissions.map(({ scope, scopeId, action }) => ({
        accountId,
        personId,
        grantedByPersonId,
        scopeType: scope,
        scopeId,
        action,
      })),
    );
  }

  async listForPerson(accountId: string, personId: string): Promise<Permission[]> {
    const rows = await this.deps.em.find(PermissionSchema, { accountId, personId });
    return rows.map((row) => ({
      scope: oneOf(PERMISSION_SCOPES, row.scopeType),
      scopeId: row.scopeId,
      action: oneOf(PERMISSION_ACTIONS, row.action),
    }));
  }
}

// A value outside the catalogue (e.g. written by hand) must never be read as a permission.
function oneOf<T extends PermissionScope | PermissionAction>(allowed: readonly T[], value: string): T {
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new Error(`Unknown permission value in storage: ${value}`);
  }
  return match;
}
