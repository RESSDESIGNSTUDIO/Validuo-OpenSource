import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AuthField } from "./auth-field";
import { AuthFormView } from "./auth-form-view";
import { RegisterForm } from "./register-form";
import { SignInForm } from "./sign-in-form";

// The actions are server-only; the forms only need a function reference to render.
vi.mock("../actions/auth-actions", () => ({ signInAction: vi.fn(), registerAction: vi.fn() }));

describe("AuthField", () => {
  it("labels the input and keeps it valid without errors", () => {
    const markup = renderToStaticMarkup(<AuthField name="email" label="Adres e-mail" autoComplete="username" />);

    expect(markup).toContain('<label for="email"');
    expect(markup).toContain('aria-invalid="false"');
    expect(markup).not.toContain("aria-describedby");
  });

  it("links the hint and the errors to the input", () => {
    const markup = renderToStaticMarkup(
      <AuthField
        name="password"
        label="Hasło"
        type="password"
        autoComplete="new-password"
        hint="Min. 12."
        errors={["Za krótkie.", "Spróbuj jeszcze raz."]}
      />,
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="password-hint password-error"');
    expect(markup).toContain("Za krótkie. Spróbuj jeszcze raz.");
    expect(markup).toContain('type="password"');
  });

  it("treats an empty error list as valid", () => {
    expect(renderToStaticMarkup(<AuthField name="a" label="A" autoComplete="off" errors={[]} />)).toContain(
      'aria-invalid="false"',
    );
  });
});

describe("SignInForm", () => {
  it("renders the credentials form with a submit button", () => {
    const markup = renderToStaticMarkup(<SignInForm />);

    expect(markup).toContain('name="email"');
    expect(markup).toContain('autoComplete="current-password"');
    expect(markup).toContain("Zaloguj się");
    expect(markup).not.toContain('role="alert"');
  });

  it("announces a failed attempt and field errors", () => {
    const markup = renderToStaticMarkup(
      <SignInForm
        initialState={{
          message: "Nieprawidłowy adres e-mail lub hasło.",
          fieldErrors: { email: ["Podaj poprawny adres e-mail."] },
          values: { email: "ala@example.pl" },
        }}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Nieprawidłowy adres e-mail lub hasło.");
    expect(markup).toContain("Podaj poprawny adres e-mail.");
    expect(markup).toContain('value="ala@example.pl"');
  });
});

describe("RegisterForm", () => {
  it("asks for account, name, e-mail and a password with its length hint", () => {
    const markup = renderToStaticMarkup(<RegisterForm />);

    for (const name of ["accountName", "displayName", "email", "password"]) {
      expect(markup).toContain(`name="${name}"`);
    }
    expect(markup).toContain("Co najmniej 12 znaków.");
    expect(markup).toContain("Utwórz konto");
  });

  it("shows the message and field errors from a failed submission", () => {
    const markup = renderToStaticMarkup(
      <RegisterForm
        initialState={{
          message: "Popraw pola.",
          fieldErrors: { password: ["Za krótkie."] },
          values: { accountName: "Firma", displayName: "Ala", email: "ala@example.pl" },
        }}
      />,
    );

    expect(markup).toContain("Popraw pola.");
    expect(markup).toContain("Za krótkie.");
    expect(markup).toContain('value="Firma"');
    expect(markup).toContain('value="Ala"');
  });
});

describe("AuthFormView", () => {
  const view = (pending: boolean) =>
    renderToStaticMarkup(
      <AuthFormView
        action={() => undefined}
        state={null}
        pending={pending}
        submitLabel="Wyślij"
        pendingLabel="Wysyłanie…"
      >
        <input name="x" />
      </AuthFormView>,
    );

  it("enables the submit button while idle", () => {
    const markup = view(false);

    expect(markup).toContain(">Wyślij<");
    expect(markup).not.toContain(' disabled=""');
  });

  it("disables the submit button and says so while a submission is pending", () => {
    const markup = view(true);

    expect(markup).toContain(">Wysyłanie…<");
    expect(markup).toContain(' disabled=""');
  });
});
