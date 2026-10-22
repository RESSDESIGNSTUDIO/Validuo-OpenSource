import { checkDatabase } from "@validuo/db";

import { apiHandler } from "@/server/http/api-handler";
import { HttpError } from "@/server/http/http-error";

export type HealthStatus = { status: "ok"; db: "ok" };

export const GET = apiHandler<HealthStatus>("health.check", async ({ scope }) => {
  const db = await checkDatabase(scope.resolve("orm"));
  if (!db.ok) {
    // The endpoint is public: the reason goes to the server log only.
    throw new HttpError(503, "ServiceUnavailable", "Usługa jest chwilowo niedostępna.", {
      cause: new Error(db.reason),
    });
  }
  return { data: { status: "ok", db: "ok" } };
});
