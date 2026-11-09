import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { ConflictError } from "@validuo/core/errors";
import type { UserRecord, UserRepository } from "@validuo/core/ports/accounts";

import { UserSchema } from "../../entities/accounts/user.entity";

export class MikroOrmUserRepository implements UserRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.deps.em.findOne(UserSchema, { email });
    return user === null ? null : { id: user.id, passwordHash: user.passwordHash };
  }

  async create({ email, passwordHash }: { email: string; passwordHash: string }): Promise<{ id: string }> {
    try {
      return { id: await this.deps.em.insert(UserSchema, { email, passwordHash }) };
    } catch (error) {
      // `users.email` is the only unique constraint of the table: a violation means "taken".
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError("Ten adres e-mail jest już zajęty.", { cause: error });
      }
      throw error;
    }
  }
}
