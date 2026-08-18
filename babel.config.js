module.exports = function (api) {
  api.cache(true);

  const stripClerkImportMeta = ({ types: t }) => ({
    name: "strip-clerk-import-meta",
    visitor: {
      MetaProperty(path, state) {
        const filename = state.filename || "";
        const isClerkShared =
          filename.includes("@clerk/shared") &&
          filename.endsWith("getEnvVariable.mjs");

        if (
          isClerkShared &&
          path.node.meta.name === "import" &&
          path.node.property.name === "meta"
        ) {
          path.replaceWith(
            t.objectExpression([
              t.objectProperty(
                t.identifier("env"),
                t.objectExpression([]),
              ),
            ]),
          );
        }
      },
    },
  });

  return {
    presets: ["babel-preset-expo"],
    plugins: [stripClerkImportMeta],
  };
};
