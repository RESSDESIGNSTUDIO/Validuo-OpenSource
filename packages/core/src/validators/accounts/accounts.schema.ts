import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 254;

// Stored and compared in one canonical form so "Ala@X.pl" and "ala@x.pl" are the same account.
const email = z
  .string({ error: "Podaj adres e-mail." })
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, "Adres e-mail jest za długi.")
  .pipe(z.email("Podaj poprawny adres e-mail."));

const name = (label: string) =>
  z
    .string({ error: `Podaj ${label}.` })
    .trim()
    .min(1, `Podaj ${label}.`)
    .max(NAME_MAX_LENGTH, `Pole „${label}” jest za długie.`);

export const registerSchema = z.strictObject({
  email,
  // The upper bound is checked before hashing so a huge body cannot burn CPU in Argon2.
  password: z
    .string({ error: "Podaj hasło." })
    .min(PASSWORD_MIN_LENGTH, `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`)
    .max(PASSWORD_MAX_LENGTH, `Hasło może mieć najwyżej ${PASSWORD_MAX_LENGTH} znaków.`),
  accountName: name("nazwę konta"),
  displayName: name("imię i nazwisko"),
});
export type RegisterInput = z.output<typeof registerSchema>;

// Sign-in does not enforce the minimum: it must accept whatever was valid at registration.
export const signInSchema = z.strictObject({
  email,
  password: z
    .string({ error: "Podaj hasło." })
    .min(1, "Podaj hasło.")
    .max(PASSWORD_MAX_LENGTH, `Hasło może mieć najwyżej ${PASSWORD_MAX_LENGTH} znaków.`),
});
export type SignInInput = z.output<typeof signInSchema>;
