module.exports = {
  forbidden: [
    {
      name: "framework-no-salesanalytics-or-testsupport",
      comment:
        "Reusable framework infrastructure must not depend on the application or Cucumber integration.",
      severity: "error",
      from: { path: "^src/framework/" },
      to: { path: "^src/(salesanalytics|testsupport)/" }
    },
    {
      name: "salesanalytics-no-testsupport",
      comment:
        "Application API and UI code must not depend on Cucumber test support.",
      severity: "error",
      from: { path: "^src/salesanalytics/(api|ui)/" },
      to: { path: "^src/testsupport/" }
    },
    {
      name: "architecture-fixture-framework-no-salesanalytics",
      comment:
        "The negative architecture fixture deliberately violates the framework boundary.",
      severity: "error",
      from: { path: "^tests/architecture/fixtures/framework/" },
      to: { path: "^src/salesanalytics/" }
    }
  ],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    tsConfig: {
      fileName: "tsconfig.json"
    },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".mjs", ".json"]
    }
  }
};
