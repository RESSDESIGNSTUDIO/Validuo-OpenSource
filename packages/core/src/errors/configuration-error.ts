/**
 * Invalid process configuration (e.g. environment variables). Deliberately not an `AppError`:
 * for a user this is always an unexpected server error, never a 4xx response.
 */
export class ConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ConfigurationError";
  }
}
