import {After, Before, type ITestCaseHookParameter} from "@cucumber/cucumber";
import {Readable} from "node:stream";
import {runCleanup} from "../../../framework/lifecycle/Cleanup.js";
import {TestWorld} from "../World.js";

Before({ tags: "@ui" }, async function (this: TestWorld) {
  await this.initializeUi();
});

After({ tags: "@ui" }, async function (
  this: TestWorld,
  scenario: ITestCaseHookParameter
) {
  await runCleanup(
    async () => {
      if (
        scenario.result?.status === "FAILED" &&
        this.page !== undefined &&
        this.page.isAvailable()
      ) {
        await this.attach(
          Readable.from([await this.page.screenshot()]),
          { mediaType: "image/png", fileName: "Failure screenshot" }
        );
      }
    },
    async () => {
      if (this.uiSession !== undefined) await this.uiSession.closeSession();
    }
  );
});
