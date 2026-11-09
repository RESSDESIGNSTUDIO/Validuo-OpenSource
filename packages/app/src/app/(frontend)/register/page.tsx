import type { Metadata } from "next";

import { RegisterForm } from "@/features/accounts/components/register-form";

export const metadata: Metadata = { title: "Rejestracja" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Utwórz konto</h1>
      <RegisterForm />
      <p className="text-sm text-muted-foreground">
        Masz już konto?{" "}
        <a href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          Zaloguj się
        </a>
      </p>
    </main>
  );
}
