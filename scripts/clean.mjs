import {rmSync} from "node:fs";

for (const path of ["dist", "target", "allure-report", "allure-report-single"]) {
  rmSync(path, { recursive: true, force: true });
}
