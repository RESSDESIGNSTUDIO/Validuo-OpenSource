import type { EntityManager } from "@mikro-orm/postgresql";
import type { AccountRepository } from "@validuo/core/ports/accounts";

import { AccountSchema } from "../../entities/accounts/account.entity";

export class MikroOrmAccountRepository implements AccountRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async create({ name }: { name: string }): Promise<{ id: string }> {
    return { id: await this.deps.em.insert(AccountSchema, { name }) };
  }
}
