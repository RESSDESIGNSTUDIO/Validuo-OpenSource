import { connection } from "next/server";

import { checkDatabase } from "@validuo/db";
import { Badge } from "@validuo/ui/components/badge";
import { Button } from "@validuo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@validuo/ui/components/card";

import { getContainer } from "@/server/container";

export default async function BackendDashboardPage() {
  // Stan bazy sprawdzamy przy każdym żądaniu, nie podczas prerenderingu.
  await connection();
  const db = await checkDatabase(getContainer().resolve("orm"));

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
          <CardContent className="flex flex-col items-start gap-2">
            <Badge variant={db.ok ? "default" : "destructive"}>{db.ok ? "Połączono" : "Niedostępna"}</Badge>
            {!db.ok && <p className="text-sm text-muted-foreground">{db.reason}</p>}
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
