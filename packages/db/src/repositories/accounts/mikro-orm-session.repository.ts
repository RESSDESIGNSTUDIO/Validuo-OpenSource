import type { EntityManager } from "@mikro-orm/postgresql";
import type { ActiveSession, SessionRepository } from "@validuo/core/ports/accounts";

import { SessionSchema } from "../../entities/accounts/session.entity";

export class MikroOrmSessionRepository implements SessionRepository {
  constructor(private readonly deps: { em: EntityManager }) {}

  async create(input: {
    personId: string;
    accountId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void> {
    const { now, ...session } = input;
    await this.deps.em.insert(SessionSchema, { ...session, createdAt: now, lastSeenAt: now });
  }

  async findActive(tokenHash: string, now: Date): Promise<ActiveSession | null> {
    const session = await this.deps.em.findOne(SessionSchema, {
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    });
    if (session === null) {
      return null;
    }
    const { id, personId, accountId, lastSeenAt, expiresAt } = session;
    return { id, personId, accountId, lastSeenAt, expiresAt };
  }

  async touch(sessionId: string, now: Date): Promise<void> {
    await this.deps.em.nativeUpdate(SessionSchema, { id: sessionId }, { lastSeenAt: now });
  }

  async revoke(tokenHash: string, now: Date): Promise<void> {
    await this.deps.em.nativeUpdate(SessionSchema, { tokenHash, revokedAt: null }, { revokedAt: now });
  }
}
