import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Validuo",
    template: "%s · Validuo",
  },
  description: "Validuo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pl" className="antialiased">
      <body className="min-h-svh">{children}</body>
    </html>
  );
}
