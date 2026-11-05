import type {ApiClient} from "../../../framework/api/ApiClient.js";
import {PlaywrightApiClient} from "../../../framework/api/clients/PlaywrightApiClient.js";
import type {PlaywrightSession} from "../../../framework/playwright/PlaywrightSession.js";
import {AllureApiClient} from "../../../framework/reporting/allure/AllureApiClient.js";

export class ApiClientProvider {
  async provide(session: PlaywrightSession): Promise<ApiClient> {
    return new AllureApiClient(
      new PlaywrightApiClient(await session.getNewAPIContext())
    );
  }
}
