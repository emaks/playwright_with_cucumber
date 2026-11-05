import tseslint from "typescript-eslint";

const frameworkPlugin = {
  rules: {
    "no-readonly-findby-fields": {
      meta: {
        type: "problem",
        docs: { description: "@FindBy fields must be assignable by PageFactory" },
        schema: [],
        messages: {
          readonlyField: "@FindBy fields cannot be readonly; PageFactory assigns them after construction."
        }
      },
      create(context) {
        return {
          PropertyDefinition(node) {
            const isFindBy = node.decorators?.some((decorator) => {
              const expression = decorator.expression;
              const callee =
                expression.type === "CallExpression" ? expression.callee : expression;
              return callee.type === "Identifier" && callee.name === "FindBy";
            });
            if (node.readonly && isFindBy) {
              context.report({ node, messageId: "readonlyField" });
            }
          }
        };
      }
    }
  }
};

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: { framework: frameworkPlugin },
    rules: {
      "framework/no-readonly-findby-fields": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
);
