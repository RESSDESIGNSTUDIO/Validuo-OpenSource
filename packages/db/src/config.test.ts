import { describe, expect, it } from "vitest";

import { createOrmConfig } from "./config";
import { entities } from "./entities";

describe("createOrmConfig", () => {
  it("maps the validated database configuration onto MikroORM options", () => {
    const config = createOrmConfig({ url: "postgres://app@db:5432/validuo", poolMin: 1, poolMax: 7, debug: true });

    expect(config).toMatchObject({
      clientUrl: "postgres://app@db:5432/validuo",
      pool: { min: 1, max: 7 },
      debug: true,
      discovery: { warnWhenNoEntities: false },
    });
    expect(config.entities).toBe(entities);
  });
});
