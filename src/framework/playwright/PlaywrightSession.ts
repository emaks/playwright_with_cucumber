import {mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {randomUUID} from "node:crypto";
import {
    type APIRequestContext,
    type Browser,
    type BrowserContext,
    type BrowserType,
    chromium,
    firefox,
    type Page,
    request
} from "playwright";
import {PropertyLoader} from "../config/PropertyLoader.js";
import {runCleanup} from "../lifecycle/Cleanup.js";
import {logger} from "../logging/Logger.js";

const UI_TIMEOUT_MS = 10_000;

export class PlaywrightSession {
  private browser: Browser | undefined;
  private browserContext: BrowserContext | undefined;

  async getNewPage(browserName = PropertyLoader.get("browser") ?? "chromium"): Promise<Page> {
    try {
      const headless = PropertyLoader.get("headless") === "true";
      logger.info({ browser: browserName, headless }, "Creating browser session");
      const browserType = this.getBrowserType(browserName);
      this.browser = await browserType.launch({ headless });
      await mkdir(resolve("target", "har-recordings"), { recursive: true });
      this.browserContext = await this.browser.newContext({
        viewport: { width: 1790, height: 1120 },
        recordHar: { path: this.getHarRecordingPath() }
      });
      this.browserContext.setDefaultTimeout(UI_TIMEOUT_MS);
      return await this.browserContext.newPage();
    } catch (error) {
      logger.error({ err: error, browser: browserName }, "Unable to create browser page");
      throw error;
    }
  }

  async getNewAPIContext(): Promise<APIRequestContext> {
    const configuredBaseUrl = PropertyLoader.getRequired("api.base.url");
    const baseURL = configuredBaseUrl.endsWith("/")
      ? configuredBaseUrl
      : `${configuredBaseUrl}/`;
    return request.newContext({ baseURL });
  }

  async closeSession(): Promise<void> {
    await runCleanup(
      async () => {
        if (this.browserContext !== undefined) await this.browserContext.close();
      },
      async () => {
        if (this.browser !== undefined) await this.browser.close();
      }
    );
  }

  private getBrowserType(browserName: string): BrowserType {
    switch (browserName) {
      case "chromium":
        return chromium;
      case "firefox":
        return firefox;
      default:
        throw new RangeError(`Browser not supported: ${browserName}`);
    }
  }

  private getHarRecordingPath(): string {
    const timestamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "-");
    return resolve(
      "target",
      "har-recordings",
      `${timestamp}-${randomUUID()}-har-recording.har`
    );
  }
}
