import { connection } from "next/server";

import { checkDatabase } from "@validuo/db";
import { Badge } from "@validuo/ui/components/badge";
import { Button } from "@validuo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@validuo/ui/components/card";

import { getContainer } from "@/server/container";

export default async function BackendDashboardPage() {
  // Checked on every request, never while prerendering.
  await connection();
  const container = getContainer();
  const db = await checkDatabase(container.resolve("orm"));
  if (!db.ok) {
    // Raw driver errors stay in the server log; the panel only shows the status.
    container.resolve("logger").warn("Database unavailable", { operation: "backend.dashboard", reason: db.reason });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pulpit</h1>
        <p className="text-sm text-muted-foreground">Stan usług aplikacji.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Baza danych</CardTitle>
            <CardDescription>PostgreSQL przez MikroORM</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={db.ok ? "default" : "destructive"}>{db.ok ? "Połączono" : "Niedostępna"}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API</CardTitle>
            <CardDescription>Endpoint sprawdzania zdrowia</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <a href="/api/health">GET /api/health</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
