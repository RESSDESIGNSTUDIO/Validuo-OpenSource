import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { cn } from "../lib/utils";
import { Badge } from "./badge";
import { Button, buttonVariants } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Separator } from "./separator";

const html = (element: ReactElement) => renderToStaticMarkup(element);

describe("Button", () => {
  it("renders a native button with default variant and size", () => {
    const markup = html(<Button type="button">Zapisz</Button>);

    expect(markup).toMatch(/^<button/);
    expect(markup).toContain('data-slot="button"');
    expect(markup).toContain('data-variant="default"');
    expect(markup).toContain('data-size="default"');
    expect(markup).toContain(">Zapisz</button>");
  });

  it("applies variant, size and extra classes", () => {
    const markup = html(
      <Button variant="outline" size="sm" className="w-full">
        Anuluj
      </Button>,
    );

    expect(markup).toContain('data-variant="outline"');
    expect(markup).toContain('data-size="sm"');
    expect(markup).toContain("w-full");
    expect(buttonVariants({ variant: "destructive" })).toContain("text-destructive");
  });

  it("renders its child element when asChild is set", () => {
    const markup = html(
      <Button asChild>
        <a href="/backend">Panel</a>
      </Button>,
    );

    expect(markup).toMatch(/^<a /);
    expect(markup).toContain('href="/backend"');
    expect(markup).toContain('data-slot="button"');
  });
});

describe("Badge", () => {
  it("renders a span with the default variant", () => {
    const markup = html(<Badge>Nowy</Badge>);

    expect(markup).toMatch(/^<span/);
    expect(markup).toContain('data-variant="default"');
  });

  it("supports variants and asChild", () => {
    const markup = html(
      <Badge variant="destructive" asChild>
        <a href="/status">Błąd</a>
      </Badge>,
    );

    expect(markup).toMatch(/^<a /);
    expect(markup).toContain('data-variant="destructive"');
    expect(markup).toContain("text-destructive");
  });
});

describe("Card", () => {
  it("renders every part with its data-slot", () => {
    const markup = html(
      <Card>
        <CardHeader>
          <CardTitle>Baza danych</CardTitle>
          <CardDescription>PostgreSQL</CardDescription>
          <CardAction>Akcja</CardAction>
        </CardHeader>
        <CardContent>Treść</CardContent>
        <CardFooter>Stopka</CardFooter>
      </Card>,
    );

    for (const slot of ["card", "card-header", "card-title", "card-description", "card-action", "card-content", "card-footer"]) {
      expect(markup).toContain(`data-slot="${slot}"`);
    }
    expect(markup).toContain('data-size="default"');
  });

  it("accepts the small size", () => {
    expect(html(<Card size="sm" />)).toContain('data-size="sm"');
  });
});

describe("Separator", () => {
  it("is decorative and horizontal by default", () => {
    const markup = html(<Separator />);

    expect(markup).toContain('data-slot="separator"');
    expect(markup).toContain('role="none"');
    expect(markup).toContain('data-orientation="horizontal"');
  });

  it("can be vertical and semantic", () => {
    const markup = html(<Separator orientation="vertical" decorative={false} className="h-5" />);

    expect(markup).toContain('role="separator"');
    expect(markup).toContain('aria-orientation="vertical"');
    expect(markup).toContain("h-5");
  });
});

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toContain("a");
  });
});
