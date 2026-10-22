import "server-only";

export type LogContext = Readonly<Record<string, unknown>>;

export type Logger = {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Logger that adds `context` (e.g. `requestId`, `operation`) to every entry. */
  child(context: LogContext): Logger;
};

type Level = "info" | "warn" | "error";

/**
 * Structured JSON logger on top of `console` (one line per entry). Never pass tokens, signed URLs,
 * passwords or document contents in the context; errors are reduced to name/code/message/stack.
 */
export function createJsonLogger(baseContext: LogContext = {}): Logger {
  const write = (level: Level, message: string, context: LogContext = {}) => {
    const entry = { level, time: new Date().toISOString(), message, ...baseContext, ...serializeErrors(context) };
    console[level](JSON.stringify(entry));
  };

  return {
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
    child: (context) => createJsonLogger({ ...baseContext, ...context }),
  };
}

function serializeErrors(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, value instanceof Error ? serializeError(value) : value]),
  );
}

function serializeError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    ...("code" in error && { code: error.code }),
    message: error.message,
    stack: error.stack,
    ...(error.cause instanceof Error && { cause: serializeError(error.cause) }),
  };
}
