"use client";

import { useActionState } from "react";

import { registerAction } from "../actions/auth-actions";
import type { AuthFormState } from "../auth-form-state";
import { AuthField } from "./auth-field";
import { AuthFormView } from "./auth-form-view";

export function RegisterForm({ initialState = null }: { initialState?: AuthFormState }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  return (
    <AuthFormView
      action={formAction}
      state={state}
      pending={pending}
      submitLabel="Utwórz konto"
      pendingLabel="Tworzenie konta…"
    >
      <AuthField
        name="accountName"
        label="Nazwa konta (firmy)"
        autoComplete="organization"
        errors={state?.fieldErrors.accountName}
        defaultValue={state?.values.accountName}
      />
      <AuthField
        name="displayName"
        label="Imię i nazwisko"
        autoComplete="name"
        errors={state?.fieldErrors.displayName}
        defaultValue={state?.values.displayName}
      />
      <AuthField
        name="email"
        label="Adres e-mail"
        type="email"
        autoComplete="username"
        errors={state?.fieldErrors.email}
        defaultValue={state?.values.email}
      />
      <AuthField
        name="password"
        label="Hasło"
        type="password"
        autoComplete="new-password"
        hint="Co najmniej 12 znaków."
        errors={state?.fieldErrors.password}
      />
    </AuthFormView>
  );
}
