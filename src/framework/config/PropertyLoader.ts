import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";

export type RuntimeOverrides = Readonly<Record<string, string | undefined>>;

export interface PropertyLoaderOptions {
  readonly configDirectory?: string;
  readonly env?: string;
  readonly overrides?: RuntimeOverrides;
}

const RUNTIME_KEYS = ["headless", "parallel", "retry", "tag"] as const;
const ENVIRONMENT_NAMES: Readonly<Record<string, string>> = {
  "ui.base.url": "UI_BASE_URL",
  "api.base.url": "API_BASE_URL"
};

export class PropertyLoader {
  static get(name: string, options: PropertyLoaderOptions = {}): string | undefined {
    return this.getAll(options)[name];
  }

  static getRequired(name: string, options: PropertyLoaderOptions = {}): string {
    const value = this.get(name, options);
    if (value === undefined) {
      throw new Error(`Required configuration value '${name}' is not defined`);
    }
    return value;
  }

  static getAll(options: PropertyLoaderOptions = {}): Record<string, string> {
    const overrides = options.overrides ?? process.env;
    const environment = options.env ?? overrides.ENV ?? overrides.env ?? "local";
    const directory =
      options.configDirectory ?? resolve(process.cwd(), "resources", "configs");
    const configPath = resolve(directory, `${environment}.json`);
    if (!existsSync(configPath)) {
      throw new Error(
        `Cannot find '${environment}.json' configuration in '${directory}'`
      );
    }

    const parsed: unknown = JSON.parse(readFileSync(configPath, "utf8"));
    if (!isStringRecord(parsed)) {
      throw new Error(`Configuration '${configPath}' must contain a JSON object of strings`);
    }

    const values: Record<string, string> = {
      ...parsed,
      env: environment,
      browser: overrides.BROWSER ?? overrides.browser ?? "chromium",
      headless: overrides.HEADLESS ?? overrides.headless ?? "false",
      parallel:
        overrides.PARALLEL ?? overrides.THREADS ?? overrides.parallel ?? overrides.threads ?? "1",
      retry: overrides.RETRY ?? overrides.retry ?? "1"
    };

    for (const [key, fileValue] of Object.entries(parsed)) {
      const environmentName = ENVIRONMENT_NAMES[key] ?? key.toUpperCase().replaceAll(".", "_");
      values[key] =
        overrides[key] ??
        overrides[environmentName] ??
        process.env[key] ??
        process.env[environmentName] ??
        fileValue;
    }

    for (const key of RUNTIME_KEYS) {
      const upperName = key.toUpperCase();
      const value = overrides[upperName] ?? overrides[key];
      if (value !== undefined) values[key] = value;
    }
    if (overrides.THREADS !== undefined && overrides.PARALLEL === undefined) {
      values.parallel = overrides.THREADS;
    }
    if (overrides.TAG !== undefined) values.tag = overrides.TAG;
    return Object.fromEntries(
      Object.entries(values).sort(([left], [right]) => left.localeCompare(right))
    );
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}
