import type { EntityManager } from "@mikro-orm/postgresql";
import type { UnitOfWork } from "@validuo/core/ports/transactions";

/**
 * Transaction on the scope's own `EntityManager`: the scoped repositories share that `em`, so
 * everything they do inside `work` commits or rolls back together.
 */
export class MikroOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly deps: { em: EntityManager }) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const { em } = this.deps;
    await em.begin();
    try {
      const result = await work();
      await em.commit();
      return result;
    } catch (error) {
      await em.rollback();
      throw error;
    }
  }
}
