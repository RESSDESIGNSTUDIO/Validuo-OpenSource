import { afterAll, describe, expect, it } from "vitest";

import { createAgentBrowser } from "../testing/agent-browser";
import { appUrl } from "../testing/vitest";

const browser = createAgentBrowser();

afterAll(async () => {
  await browser.close();
});

describe("application smoke test (agent-browser)", () => {
  it("serves the public home page", async () => {
    await browser.open(appUrl());

    expect(JSON.stringify(await browser.run("get", "title"))).toContain("Validuo");
    expect(await browser.snapshot()).toContain("Fundament aplikacji jest gotowy.");
  });

  it("shows a connected database in the panel", async () => {
    await browser.open(`${appUrl()}/backend`);

    const snapshot = await browser.snapshot();
    expect(snapshot).toContain("Pulpit");
    expect(snapshot).toContain("Połączono");
  });

  it("answers the health check with ApiResult", async () => {
    const response = await fetch(`${appUrl()}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });
});
