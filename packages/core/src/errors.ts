/** Bazowy błąd aplikacji z kodem do rozróżniania przypadków bez porównywania komunikatów. */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

/** Błędna lub niekompletna konfiguracja (np. brak zmiennej środowiskowej). */
export class ConfigurationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super("CONFIGURATION_ERROR", message, options);
  }
}
