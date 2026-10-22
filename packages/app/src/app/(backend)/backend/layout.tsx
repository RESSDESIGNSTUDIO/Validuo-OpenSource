import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Separator } from "@validuo/ui/components/separator";

export const metadata: Metadata = {
  title: "Panel",
};

// Panel zaplecza: interfejs składany z komponentów shadcn/ui z @validuo/ui.
export default function BackendLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-6">
          <span className="font-semibold">Validuo</span>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-muted-foreground">Panel</span>
        </div>
        <Separator />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
