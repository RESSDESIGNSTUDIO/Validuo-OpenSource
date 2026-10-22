import { checkDatabase } from "@validuo/db";

import { getContainer } from "@/server/container";

export async function GET() {
  const db = await checkDatabase(getContainer().resolve("orm"));
  if (!db.ok) {
    // Szczegóły błędu tylko w logach serwera — endpoint jest publiczny.
    console.error("[health] database unavailable:", db.reason);
  }

  return Response.json(
    { status: db.ok ? "ok" : "degraded", db: db.ok ? "ok" : "unavailable" },
    { status: db.ok ? 200 : 503 },
  );
}
