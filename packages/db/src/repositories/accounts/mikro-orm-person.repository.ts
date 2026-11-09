import type { EntityManager } from "@mikro-orm/postgresql";
import type { PersonRecord, PersonRepository } from "@validuo/core/ports/accounts";

import { PersonSchema } from "../../entities/accounts/person.entity";

export class MikroOrmPersonRepository implements PersonRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async create(input: { accountId: string; userId: string; displayName: string }): Promise<{ id: string }> {
    return { id: await this.deps.em.insert(PersonSchema, input) };
  }

  async findByUserId(userId: string): Promise<PersonRecord | null> {
    const person = await this.deps.em.findOne(PersonSchema, { userId });
    return person === null ? null : { id: person.id, accountId: person.accountId };
  }
}
