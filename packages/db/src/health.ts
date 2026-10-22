import type { MikroORM } from "@mikro-orm/postgresql";

export type DatabaseStatus = { ok: true } | { ok: false; reason: string };

/**
 * Checks the connection with a real query. `orm.checkConnection()` is not enough: an ORM created
 * with the constructor connects lazily, so before the first query it always reports
 * "Connection not established".
 */
export async function checkDatabase(orm: MikroORM): Promise<DatabaseStatus> {
  try {
    await orm.em.getConnection().execute("select 1");
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
