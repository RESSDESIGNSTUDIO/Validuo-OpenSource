import { describe, expect, it } from "vitest";

import { HttpError } from "./http-error";
import { readJsonBody } from "./read-json";

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://x", { method: "POST", body, headers });

describe("readJsonBody", () => {
  it("parses a JSON body", async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("rejects malformed JSON with 400", async () => {
    const error = await readJsonBody(post("{nope")).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
  });

  it("rejects an oversized declared length without reading the body", async () => {
    const error = await readJsonBody(post("{}", { "content-length": "99999" }), 100).catch((e: unknown) => e);

    expect((error as HttpError).status).toBe(413);
  });

  it("rejects an oversized body whatever its declared length", async () => {
    const error = await readJsonBody(post(JSON.stringify({ a: "x".repeat(200) })), 100).catch((e: unknown) => e);

    expect((error as HttpError).status).toBe(413);
  });
});
