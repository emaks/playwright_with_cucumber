import {ContextKey} from "./ContextKey.js";

export class Context {
  private readonly values = new Map<ContextKey, unknown>();

  set(key: ContextKey, value: unknown): void {
    this.values.set(key, value);
  }

  get<T>(key: ContextKey): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  hasValue(key: ContextKey): boolean {
    return this.values.has(key);
  }
}
