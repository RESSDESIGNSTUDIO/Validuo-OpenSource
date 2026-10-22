import type { MikroORM } from "@mikro-orm/postgresql";

export type DatabaseStatus = { ok: true } | { ok: false; reason: string };

/**
 * Sprawdza połączenie prawdziwym zapytaniem. `orm.checkConnection()` nie wystarcza:
 * ORM tworzony konstruktorem łączy się leniwie, więc przed pierwszym zapytaniem
 * zawsze zgłasza „Connection not established”.
 */
export async function checkDatabase(orm: MikroORM): Promise<DatabaseStatus> {
  try {
    await orm.em.getConnection().execute("select 1");
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
