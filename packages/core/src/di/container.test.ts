import { describe, expect, it } from "vitest";

import { asFunction, asValue, createAppContainer } from ".";

type TestCradle = {
  greeting: string;
  greeter: { greet(name: string): string };
  requestId: { value: number };
};

let nextRequestId = 0;

const registrations = () => ({
  greeting: asValue("Cześć"),
  // PROXY mode: dependencies arrive as one destructured object.
  greeter: asFunction(({ greeting }: Pick<TestCradle, "greeting">) => ({
    greet: (name: string) => `${greeting}, ${name}`,
  })).singleton(),
  requestId: asFunction(() => ({ value: ++nextRequestId })).scoped(),
});

describe("createAppContainer", () => {
  it("registers every resolver and injects dependencies in PROXY mode", () => {
    const container = createAppContainer<TestCradle>(registrations());

    expect(container.resolve("greeter").greet("Ala")).toBe("Cześć, Ala");
    expect(container.resolve("greeter")).toBe(container.resolve("greeter"));
  });

  it("creates scoped registrations once per scope", () => {
    const container = createAppContainer<TestCradle>(registrations());
    const first = container.createScope();
    const second = container.createScope();

    expect(first.resolve("requestId")).toBe(first.resolve("requestId"));
    expect(first.resolve("requestId")).not.toBe(second.resolve("requestId"));
  });

  it("runs in strict mode: a singleton may not depend on a scoped registration", () => {
    const container = createAppContainer<{ requestId: { value: number }; holder: { id: number } }>({
      requestId: asFunction(() => ({ value: 1 })).scoped(),
      holder: asFunction(({ requestId }: { requestId: { value: number } }) => ({ id: requestId.value })).singleton(),
    });

    expect(() => container.resolve("holder")).toThrow(/lifetime/i);
  });
});
