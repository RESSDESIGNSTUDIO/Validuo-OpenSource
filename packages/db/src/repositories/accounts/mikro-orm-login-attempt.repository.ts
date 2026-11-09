import type { EntityManager } from "@mikro-orm/postgresql";
import type { AttemptKind, LoginAttemptRepository } from "@validuo/core/ports/accounts";

import { LoginAttemptSchema } from "../../entities/accounts/login-attempt.entity";

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
    return rows[0]?.count ?? 0;
  }

  async clear(kind: AttemptKind, keyHash: string): Promise<void> {
    await this.deps.em.nativeDelete(LoginAttemptSchema, { kind, keyHash });
  }
}
