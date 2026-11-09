import type { Metadata } from "next";

import { SignInForm } from "@/features/accounts/components/sign-in-form";

export const metadata: Metadata = { title: "Logowanie" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Zaloguj się</h1>
      <SignInForm />
      <p className="text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <a href="/register" className="font-medium text-foreground underline underline-offset-4">
          Utwórz konto
        </a>
      </p>
    </main>
  );
}
