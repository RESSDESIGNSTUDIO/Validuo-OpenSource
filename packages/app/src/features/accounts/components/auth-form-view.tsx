import type { ReactNode } from "react";

import type { AuthFormState } from "../auth-form-state";

type AuthFormViewProps = {
  action: (formData: FormData) => void;
  state: AuthFormState;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
};

/** Shared frame of the authentication forms: error summary, fields and a submit button. */
export function AuthFormView({ action, state, pending, submitLabel, pendingLabel, children }: AuthFormViewProps) {
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : null}
      {children}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
