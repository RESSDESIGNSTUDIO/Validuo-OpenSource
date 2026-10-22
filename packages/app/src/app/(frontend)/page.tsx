export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">Validuo</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Fundament aplikacji jest gotowy.
      </h1>
      <p className="max-w-xl text-lg text-pretty text-muted-foreground">
        Strony publiczne powstają w <code className="font-mono text-foreground">(frontend)</code> i są
        stylowane Tailwindem. Panel zaplecza w <code className="font-mono text-foreground">(backend)</code>{" "}
        korzysta z komponentów shadcn/ui.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href="/backend"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          Przejdź do panelu
        </a>
        <a
          href="/api/health"
          className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Status API
        </a>
      </div>
    </main>
  );
}
