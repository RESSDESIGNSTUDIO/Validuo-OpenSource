/**
 * Result of a sign-in / registration Server Action as the form renders it; `null` = not submitted.
 * `values` echoes the non-secret fields, because React clears an uncontrolled form after an action
 * and the user should not have to retype them. Passwords are never echoed.
 */
export type AuthFormState = {
  message: string;
  fieldErrors: Record<string, string[]>;
  values: Record<string, string>;
} | null;
