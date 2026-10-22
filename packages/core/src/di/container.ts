import { createContainer, InjectionMode, type AwilixContainer } from "awilix";

/**
 * Rejestr zależności dostępnych w kontenerze DI.
 *
 * Każdy pakiet dopisuje swoje rejestracje przez declaration merging:
 *
 * ```ts
 * declare module "@validuo/core/di" {
 *   interface Cradle {
 *     orm: MikroORM;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- rozszerzany przez declaration merging
export interface Cradle {}

export type AppContainer = AwilixContainer<Cradle>;

/** Moduł DI: funkcja rejestrująca zależności jednego pakietu lub obszaru aplikacji. */
export type DiModule = (container: AppContainer) => void;

/**
 * Tworzy kontener w trybie PROXY (zależności wstrzykiwane jako obiekt `cradle`,
 * odporne na minifikację) i w trybie `strict` (wykrywa m.in. singletony zależne
 * od zależności o krótszym cyklu życia).
 */
export function createAppContainer(modules: readonly DiModule[] = []): AppContainer {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
  for (const register of modules) {
    register(container);
  }
  return container;
}
