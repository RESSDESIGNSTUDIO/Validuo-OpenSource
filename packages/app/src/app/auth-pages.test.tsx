import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import RegisterPage, { metadata as registerMetadata } from "./(frontend)/register/page";
import SignInPage, { metadata as signInMetadata } from "./(frontend)/sign-in/page";

vi.mock("@/features/accounts/actions/auth-actions", () => ({ signInAction: vi.fn(), registerAction: vi.fn() }));

describe("public authentication pages", () => {
  it("renders the sign-in page with a link to registration", () => {
    const markup = renderToStaticMarkup(<SignInPage />);

    expect(markup).toContain("Zaloguj się");
    expect(markup).toContain('name="password"');
    expect(markup).toContain('href="/register"');
    expect(signInMetadata.title).toBe("Logowanie");
  });

  it("renders the registration page with a link to sign-in", () => {
    const markup = renderToStaticMarkup(<RegisterPage />);

    expect(markup).toContain("Utwórz konto");
    expect(markup).toContain('name="accountName"');
    expect(markup).toContain('href="/sign-in"');
    expect(registerMetadata.title).toBe("Rejestracja");
  });
});
