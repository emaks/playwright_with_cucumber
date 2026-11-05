export type CleanupAction = () => void | Promise<void>;

export class CleanupError extends Error {
  readonly suppressed: readonly unknown[];

  constructor(primary: unknown, suppressed: readonly unknown[]) {
    super("Cleanup failed", { cause: primary });
    this.name = "CleanupError";
    this.suppressed = suppressed;
  }
}

export async function runCleanup(...actions: readonly CleanupAction[]): Promise<void> {
  let firstFailure: unknown;
  let hasFailure = false;
  const laterFailures: unknown[] = [];

  for (const action of actions) {
    try {
      await action();
    } catch (error) {
      if (!hasFailure) {
        firstFailure = error;
        hasFailure = true;
      } else if (error !== firstFailure) {
        laterFailures.push(error);
      }
    }
  }

  if (!hasFailure) return;
  if (!(firstFailure instanceof Error)) {
    throw new CleanupError(firstFailure, laterFailures);
  }

  const existing = (firstFailure as Error & { suppressed?: unknown[] }).suppressed ?? [];
  Object.defineProperty(firstFailure, "suppressed", {
    configurable: true,
    value: [...existing, ...laterFailures]
  });
  throw firstFailure;
}
