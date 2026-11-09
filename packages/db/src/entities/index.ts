import type { EntitySchema } from "@mikro-orm/core";

import { AccountSchema } from "./accounts/account.entity";
import { LoginAttemptSchema } from "./accounts/login-attempt.entity";
import { PermissionSchema } from "./accounts/permission.entity";
import { PersonSchema } from "./accounts/person.entity";
import { SessionSchema } from "./accounts/session.entity";
import { UserSchema } from "./accounts/user.entity";

/**
 * Explicit list of all entities. Add every new entity (`defineEntity` in its own
 * `<domain>/<name>.entity.ts` file) here — directory scanning does not work in the Next.js bundle.
 */
export const entities: EntitySchema[] = [
  AccountSchema,
  UserSchema,
  PersonSchema,
  SessionSchema,
  PermissionSchema,
  LoginAttemptSchema,
];
