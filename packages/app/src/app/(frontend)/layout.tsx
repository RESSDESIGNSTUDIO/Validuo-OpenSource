import type { ReactNode } from "react";

// Public pages: Tailwind classes only, no shadcn components from @validuo/ui.
export default function FrontendLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className="flex min-h-svh flex-col bg-background text-foreground">{children}</div>;
}
