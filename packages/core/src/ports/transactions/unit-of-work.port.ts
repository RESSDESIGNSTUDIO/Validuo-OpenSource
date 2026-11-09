/**
 * Transaction contract. Repositories used inside `work` take part in the same transaction;
 * a thrown error rolls everything back. Implemented in `@validuo/db`.
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
