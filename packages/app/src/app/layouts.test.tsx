import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BackendLayout, { metadata as backendMetadata } from "./(backend)/backend/layout";
import FrontendLayout from "./(frontend)/layout";
import HomePage from "./(frontend)/page";
import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("renders the Polish html document around the page", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>treść</p>
      </RootLayout>,
    );

    expect(markup).toMatch(/^<html lang="pl"/);
    expect(markup).toContain("<body");
    expect(markup).toContain("<p>treść</p>");
    expect(metadata.title).toEqual({ default: "Validuo", template: "%s · Validuo" });
  });
});

describe("public pages", () => {
  it("wraps pages in the frontend layout and links to the panel and health check", () => {
    const markup = renderToStaticMarkup(
      <FrontendLayout>
        <HomePage />
      </FrontendLayout>,
    );

    expect(markup).toContain("Fundament aplikacji jest gotowy.");
    expect(markup).toContain('href="/backend"');
    expect(markup).toContain('href="/api/health"');
  });
});

describe("BackendLayout", () => {
  it("renders the panel header around the page", () => {
    const markup = renderToStaticMarkup(
      <BackendLayout>
        <p>pulpit</p>
      </BackendLayout>,
    );

    expect(markup).toContain("Panel");
    expect(markup).toContain('data-slot="separator"');
    expect(markup).toContain("<main");
    expect(markup).toContain("<p>pulpit</p>");
    expect(backendMetadata.title).toBe("Panel");
  });
});
