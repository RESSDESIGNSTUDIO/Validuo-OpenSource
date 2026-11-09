import { afterAll, describe, expect, it } from "vitest";

import { createAgentBrowser } from "../testing/agent-browser";
import { appUrl } from "../testing/vitest";

const browser = createAgentBrowser();

afterAll(async () => {
  await browser.close();
});

async function waitFor(condition: () => Promise<boolean>, attempts = 20): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Condition was not met in time.");
}

const currentUrl = async () => JSON.stringify(await browser.run("get", "url"));

// The accessibility snapshot may leave out the text of a live region; read the alert element itself.
const alertText = async () => {
  try {
    return JSON.stringify(await browser.run("get", "text", "[role=alert]"));
  } catch {
    return "";
  }
};

describe("registration and sign-in in the browser (agent-browser)", () => {
  const email = `e2e-browser-${Date.now()}@example.pl`;
  const password = "correct horse battery";

  it("registers an account and lands in the panel", async () => {
    await browser.open(`${appUrl()}/register`);
    await browser.run("fill", "#accountName", "Firma przeglądarkowa");
    await browser.run("fill", "#displayName", "Ala Kowalska");
    await browser.run("fill", "#email", email);
    await browser.run("fill", "#password", password);
    await browser.run("click", "button[type=submit]");

    await waitFor(async () => (await currentUrl()).includes("/backend"));
    expect(await browser.snapshot()).toContain("Pulpit");
  });

  it("shows a neutral error for a wrong password and signs in with the right one", async () => {
    await browser.open(`${appUrl()}/sign-in`);
    await browser.run("fill", "#email", email);
    await browser.run("fill", "#password", "definitely wrong");
    await browser.run("click", "button[type=submit]");

    await waitFor(async () => (await alertText()).includes("Nieprawidłowy adres e-mail lub hasło."));

    // React clears an uncontrolled form after an action; fill every field again to stay deterministic.
    await browser.run("fill", "#email", email);
    await browser.run("fill", "#password", password);
    await browser.run("click", "button[type=submit]");

    await waitFor(async () => (await currentUrl()).includes("/backend"));
  });
});
