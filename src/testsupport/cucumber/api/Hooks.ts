import {After, Before} from "@cucumber/cucumber";
import {runCleanup} from "../../../framework/lifecycle/Cleanup.js";
import {TestWorld} from "../World.js";

Before({ tags: "@api" }, async function (this: TestWorld) {
  await this.initializeApi();
});

After({ tags: "@api" }, async function (this: TestWorld) {
  await runCleanup(
    async () => {
      if (this.apiClient !== undefined) await this.apiClient.close();
    },
    async () => {
      if (this.apiSession !== undefined) await this.apiSession.closeSession();
    }
  );
});
