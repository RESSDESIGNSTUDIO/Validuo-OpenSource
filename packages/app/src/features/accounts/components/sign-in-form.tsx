"use client";

import { useActionState } from "react";

import { signInAction } from "../actions/auth-actions";
import type { AuthFormState } from "../auth-form-state";
import { AuthField } from "./auth-field";
import { AuthFormView } from "./auth-form-view";

export function SignInForm({ initialState = null }: { initialState?: AuthFormState }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  return (
    <AuthFormView
      action={formAction}
      state={state}
      pending={pending}
      submitLabel="Zaloguj się"
      pendingLabel="Logowanie…"
    >
      <AuthField
        name="email"
        label="Adres e-mail"
        type="email"
        autoComplete="username"
        errors={state?.fieldErrors.email}
      />
      <AuthField
        name="password"
        label="Hasło"
        type="password"
        autoComplete="current-password"
        errors={state?.fieldErrors.password}
      />
    </AuthFormView>
  );
}
