import { createAppContainer } from "@validuo/core/di";
import { describe, expect, it, vi } from "vitest";

import { dbRegistrations, type DbCradle } from "./di";
import { MikroOrmAccountRepository } from "./repositories/accounts/mikro-orm-account.repository";
import { MikroOrmLoginAttemptRepository } from "./repositories/accounts/mikro-orm-login-attempt.repository";
import { MikroOrmPermissionRepository } from "./repositories/accounts/mikro-orm-permission.repository";
import { MikroOrmPersonRepository } from "./repositories/accounts/mikro-orm-person.repository";
import { MikroOrmSessionRepository } from "./repositories/accounts/mikro-orm-session.repository";
import { MikroOrmUserRepository } from "./repositories/accounts/mikro-orm-user.repository";
import { MikroOrmUnitOfWork } from "./transactions/mikro-orm-unit-of-work";

// Nothing listens on port 1: the ORM connects lazily, so no test here opens a connection.
const database = { url: "postgres://postgres@127.0.0.1:1/validuo_unit", poolMin: 0, poolMax: 1, debug: false };

describe("dbRegistrations", () => {
  it("shares one ORM per container and forks an EntityManager per scope", () => {
    const container = createAppContainer<DbCradle>(dbRegistrations(database));
    const orm = container.resolve("orm");
    const first = container.createScope();
    const second = container.createScope();

    expect(first.resolve("orm")).toBe(orm);
    expect(first.resolve("em")).toBe(first.resolve("em"));
    expect(first.resolve("em")).not.toBe(second.resolve("em"));
    expect(first.resolve("em")).not.toBe(orm.em);
    expect(orm.config.get("clientUrl")).toBe(database.url);
  });

  it("builds the account repositories and the unit of work per scope on the scope's EntityManager", () => {
    const container = createAppContainer<DbCradle>(dbRegistrations(database));
    const first = container.createScope();
    const second = container.createScope();

    expect(first.resolve("accountRepository")).toBeInstanceOf(MikroOrmAccountRepository);
    expect(first.resolve("userRepository")).toBeInstanceOf(MikroOrmUserRepository);
    expect(first.resolve("personRepository")).toBeInstanceOf(MikroOrmPersonRepository);
    expect(first.resolve("permissionRepository")).toBeInstanceOf(MikroOrmPermissionRepository);
    expect(first.resolve("sessionRepository")).toBeInstanceOf(MikroOrmSessionRepository);
    expect(first.resolve("loginAttemptRepository")).toBeInstanceOf(MikroOrmLoginAttemptRepository);
    expect(first.resolve("unitOfWork")).toBeInstanceOf(MikroOrmUnitOfWork);
    // Compared as booleans: printing a repository would walk its injected container proxy.
    expect(first.resolve("userRepository") === first.resolve("userRepository")).toBe(true);
    expect(first.resolve("userRepository") === second.resolve("userRepository")).toBe(false);
  });

  it("closes the ORM when the container is disposed", async () => {
    const container = createAppContainer<DbCradle>(dbRegistrations(database));
    const close = vi.spyOn(container.resolve("orm"), "close");

    await container.dispose();

    expect(close).toHaveBeenCalledOnce();
  });
});
