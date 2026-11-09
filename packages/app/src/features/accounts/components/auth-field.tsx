type AuthFieldProps = {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  errors?: readonly string[] | undefined;
  hint?: string;
  /** Value to restore after a failed submission. */
  defaultValue?: string | undefined;
};

/** Labelled input with its validation messages announced to assistive technology. */
export function AuthField({ name, label, type = "text", autoComplete, errors, hint, defaultValue }: AuthFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const hasErrors = errors !== undefined && errors.length > 0;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        defaultValue={defaultValue}
        aria-invalid={hasErrors}
        aria-describedby={[hint ? hintId : null, hasErrors ? errorId : null].filter(Boolean).join(" ") || undefined}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {hasErrors ? (
        <p id={errorId} className="text-xs text-destructive">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
