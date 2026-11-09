import type { EntityManager } from "@mikro-orm/postgresql";
import type { AttemptKind, LoginAttemptRepository } from "@validuo/core/ports/accounts";

import { LoginAttemptSchema } from "../../entities/accounts/login-attempt.entity";

/** Most expired counters removed by one `hit`. */
const EXPIRED_BATCH = 100;

export class MikroOrmLoginAttemptRepository implements LoginAttemptRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async count(kind: AttemptKind, keyHash: string, windowStart: Date): Promise<number> {
    const attempt = await this.deps.em.findOne(LoginAttemptSchema, { kind, keyHash, windowStart });
    return attempt?.count ?? 0;
  }

  async hit(kind: AttemptKind, keyHash: string, windowStart: Date): Promise<number> {
    // One atomic statement: concurrent attempts cannot lose an increment.
    const rows = await this.deps.em.execute<{ count: number }[]>(
      `insert into login_attempts (kind, key_hash, window_start, count) values (?, ?, ?, 1)
       on conflict (kind, key_hash, window_start) do update set count = login_attempts.count + 1
       returning count`,
      [kind, keyHash, windowStart],
    );
    // Expired windows are dead weight: drop a bounded batch each time so the table stays small
    // without one request paying for a large cleanup.
    await this.deps.em.execute(
      `delete from login_attempts where ctid in (
         select ctid from login_attempts where window_start < ? limit ${EXPIRED_BATCH}
       )`,
      [windowStart],
    );
    return rows[0]?.count ?? 0;
  }

  async clear(kind: AttemptKind, keyHash: string): Promise<void> {
    await this.deps.em.nativeDelete(LoginAttemptSchema, { kind, keyHash });
  }
}
