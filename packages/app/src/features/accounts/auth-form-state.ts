/** Result of a sign-in / registration Server Action as the form renders it; `null` = not submitted. */
export type AuthFormState = { message: string; fieldErrors: Record<string, string[]> } | null;
