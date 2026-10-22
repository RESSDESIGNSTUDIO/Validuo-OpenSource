import type { EntityManager } from "@mikro-orm/postgresql";
import { MikroORM } from "@mikro-orm/postgresql";
import { asFunction, type DiModule } from "@validuo/core/di";

import { createOrmConfig } from "./config";

declare module "@validuo/core/di" {
  interface Cradle {
    /** Singleton ORM z pulą połączeń; łączy się leniwie przy pierwszym zapytaniu. */
    orm: MikroORM;
    /** `EntityManager` rozwidlony per scope (np. per request) — używaj go zamiast `orm.em`. */
    em: EntityManager;
  }
}

export const dbModule: DiModule = (container) => {
  container.register({
    orm: asFunction(() => new MikroORM(createOrmConfig()))
      .singleton()
      .disposer((orm) => orm.close()),
    em: asFunction(({ orm }: { orm: MikroORM }) => orm.em.fork()).scoped(),
  });
};
