import { createContainer, InjectionMode, type AwilixContainer, type Resolver } from "awilix";

/** Container typed with the full cradle assembled in the composition root. */
export type AppContainer<TCradle extends object> = AwilixContainer<TCradle>;

/**
 * Registrations for a cradle: one resolver per key, with the matching type. Packages export
 * registrations for their own fragment (e.g. `Registrations<DbCradle>`); the composition root
 * spreads them into `Registrations<AppCradle>`, so a missing or mistyped dependency fails to compile.
 */
export type Registrations<TCradle extends object> = { readonly [K in keyof TCradle]-?: Resolver<TCradle[K]> };

/**
 * Creates the container in PROXY mode (dependencies injected as one object, safe under
 * minification) and `strict` mode (Awilix rejects e.g. singletons depending on scoped registrations).
 */
export function createAppContainer<TCradle extends Record<string, unknown>>(
  registrations: Registrations<TCradle>,
): AppContainer<TCradle> {
  const container = createContainer<TCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });
  container.register(registrations);
  return container;
}
