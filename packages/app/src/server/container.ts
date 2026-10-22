import "server-only";

import { createAppContainer, type AppContainer } from "@validuo/core/di";
import { dbModule } from "@validuo/db";

/**
 * Composition root: jedyne miejsce, w którym składamy moduły DI aplikacji.
 * Nowe moduły (np. serwisy domenowe) dopisuj do listy poniżej.
 */
function buildContainer(): AppContainer {
  return createAppContainer([dbModule]);
}

// W trybie dev HMR przeładowuje moduły — trzymamy kontener w globalThis,
// żeby nie tworzyć nowej puli połączeń przy każdej zmianie pliku.
const globalForContainer = globalThis as typeof globalThis & {
  __validuoContainer?: AppContainer;
};

/** Kontener główny (singletony współdzielone przez cały proces). */
export function getContainer(): AppContainer {
  globalForContainer.__validuoContainer ??= buildContainer();
  return globalForContainer.__validuoContainer;
}

/**
 * Uruchamia `fn` w świeżym scope kontenera (np. jeden request, jedna server action).
 * Zależności `scoped` — w tym `em` — są tworzone raz na scope i zwalniane po zakończeniu.
 */
export async function withRequestScope<T>(fn: (scope: AppContainer) => Promise<T>): Promise<T> {
  const scope = getContainer().createScope();
  try {
    return await fn(scope);
  } finally {
    await scope.dispose();
  }
}
