const parallel = Number(process.env.PARALLEL ?? 1);
const retry = Number(process.env.RETRY ?? 1);
const browser = process.env.BROWSER ?? "chromium";

function cliOption(name) {
  const index = process.argv.findIndex((argument) => argument === name);
  if (index >= 0) return process.argv[index + 1];
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
}

function runtimeEnvironment(defaultTag) {
  return {
    ENV: process.env.ENV ?? process.env.env ?? "local",
    BROWSER: browser,
    HEADLESS: process.env.HEADLESS ?? process.env.headless ?? "false",
    PARALLEL: cliOption("--parallel") ?? String(parallel),
    RETRY: cliOption("--retry") ?? String(retry),
    TAG: cliOption("--tags") ?? process.env.TAG ?? defaultTag
  };
}

const common = {
  import: [
    "dist/src/testsupport/**/*.js",
    "dist/src/salesanalytics/definitions/**/*.js"
  ],
  format: [
    "summary",
    "json:target/site/cucumber-report.json",
    "allure-cucumberjs/reporter:target/site/allure-reporter.log",
    "rerun:target/@rerun.txt"
  ],
  formatOptions: {
    resultsDir: "target/allure-results"
  },
  parallel,
  retry,
  publish: false,
  failFast: false
};

const defaultProfile = {
  ...common,
  paths: ["features/**/*.feature"],
  formatOptions: {
    ...common.formatOptions,
    environmentInfo: runtimeEnvironment("")
  },
  worldParameters: { browser }
};

export { defaultProfile as default };

export const api = {
  ...common,
  paths: ["features/be/**/*.feature"],
  tags: process.env.TAG ?? "@api",
  formatOptions: {
    ...common.formatOptions,
    environmentInfo: runtimeEnvironment("@api")
  },
  worldParameters: { browser }
};

export const ui = {
  ...common,
  paths: ["features/fe/**/*.feature"],
  tags: process.env.TAG ?? "@ui",
  formatOptions: {
    ...common.formatOptions,
    environmentInfo: runtimeEnvironment("@ui")
  },
  worldParameters: { browser }
};

export const rerun = {
  ...common,
  import: [
    ...common.import,
    "dist/tests/acceptance/steps/**/*.js"
  ],
  paths: ["target/@rerun.txt"],
  retry: 0,
  formatOptions: {
    ...common.formatOptions,
    environmentInfo: runtimeEnvironment("")
  },
  worldParameters: { browser }
};

export const acceptance = {
  ...common,
  import: [
    "dist/src/testsupport/**/*.js",
    "dist/tests/acceptance/steps/**/*.js"
  ],
  paths: ["tests/acceptance/features/**/*.feature"],
  tags: process.env.TAG ?? "@acceptance",
  formatOptions: {
    ...common.formatOptions,
    environmentInfo: runtimeEnvironment("@acceptance")
  },
  worldParameters: { browser }
};
