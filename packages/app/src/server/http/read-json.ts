import "server-only";

import { HttpError } from "./http-error";

const DEFAULT_MAX_BYTES = 16 * 1024;

/** Reads a small JSON body. Oversized or malformed input is a transport error (413 / 400). */
export async function readJsonBody(request: Request, maxBytes = DEFAULT_MAX_BYTES): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) {
    throw new HttpError(413, "PayloadTooLarge", "Żądanie jest zbyt duże.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "PayloadTooLarge", "Żądanie jest zbyt duże.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new HttpError(400, "InvalidJson", "Treść żądania nie jest poprawnym JSON-em.", { cause: error });
  }
}
