import type { ReactNode } from "react";

// Strony publiczne: wyłącznie klasy Tailwind, bez komponentów shadcn z @validuo/ui.
export default function FrontendLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className="flex min-h-svh flex-col bg-background text-foreground">{children}</div>;
}
