import "allure-cucumberjs";
import {type IWorldOptions, World} from "@cucumber/cucumber";
import type {ApiClient} from "../../framework/api/ApiClient.js";
import {PlaywrightSession} from "../../framework/playwright/PlaywrightSession.js";
import {PageWrapper} from "../../framework/ui/PageWrapper.js";
import {TransactionsService} from "../../salesanalytics/api/TransactionsService.js";
import {
    SalesTransactionsSteps as ApiTransactionsSteps
} from "../../salesanalytics/steps/api/SalesTransactionsSteps.js";
import {
    SalesTransactionsSteps as UiTransactionsSteps
} from "../../salesanalytics/steps/ui/SalesTransactionsSteps.js";
import type {TransactionsPage} from "../../salesanalytics/ui/TransactionsPage.js";
import {Context} from "../context/Context.js";
import {ApiClientProvider} from "./api/ApiClientProvider.js";
import {UiPageProvider} from "./ui/UiPageProvider.js";

export interface WorldParameters {
  readonly browser?: string;
}

export class TestWorld extends World<WorldParameters> {
  readonly context = new Context();
  apiSession: PlaywrightSession | undefined;
  uiSession: PlaywrightSession | undefined;
  apiClient: ApiClient | undefined;
  page: PageWrapper | undefined;
  transactionsPage: TransactionsPage | undefined;
  apiSteps: ApiTransactionsSteps | undefined;
  uiSteps: UiTransactionsSteps | undefined;

  constructor(options: IWorldOptions<WorldParameters>) {
    super(options);
  }

  async initializeApi(): Promise<void> {
    this.apiSession = new PlaywrightSession();
    this.apiClient = await new ApiClientProvider().provide(this.apiSession);
    this.apiSteps = new ApiTransactionsSteps(
      new TransactionsService(this.apiClient)
    );
  }

  async initializeUi(): Promise<void> {
    this.uiSession = new PlaywrightSession();
    const initialized = await new UiPageProvider().provide(
      this.uiSession,
      this.parameters.browser ?? "chromium"
    );
    this.page = initialized.page;
    this.transactionsPage = initialized.transactionsPage;
    this.uiSteps = new UiTransactionsSteps(initialized.transactionsPage);
  }

  requireApiSteps(): ApiTransactionsSteps {
    if (this.apiSteps === undefined) throw new Error("API scenario resources are not initialized");
    return this.apiSteps;
  }

  requireUiSteps(): UiTransactionsSteps {
    if (this.uiSteps === undefined) throw new Error("UI scenario resources are not initialized");
    return this.uiSteps;
  }
}
