const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function load(path, mocks = {}) {
  const filename = require.resolve(path);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  const result = {};
  new Function("require", "exports", source)(
    (id) => mocks[id] ?? require(id),
    result,
  );
  return result;
}
const chips = load("../convex/fantasyChips.ts");
const { getTransferSummary } = load(
  "../src/features/fantasy/utils/transferSummary.ts",
  {
    "../../../../convex/fantasyChips": chips,
  },
);
const baseline = {
  activeChip: null,
  hasParticipated: true,
  freeTransfers: 1,
  pendingTransfers: 0,
  savedPenaltyPoints: 0,
  penaltyPerTransfer: 4,
};

test("cost starts at zero, counts only paid pending replacements, and includes already confirmed costs", () => {
  assert.equal(getTransferSummary(baseline).totalPenaltyPoints, 0);
  assert.equal(
    getTransferSummary({ ...baseline, pendingTransfers: 1 }).totalPenaltyPoints,
    0,
  );
  const result = getTransferSummary({
    ...baseline,
    pendingTransfers: 3,
    savedPenaltyPoints: 4,
  });
  assert.equal(result.freeTransfersValue, "1");
  assert.equal(result.freeTransfersUsed, 1);
  assert.equal(result.additionalTransfersUsed, 2);
  assert.equal(result.pendingPenaltyPoints, 8);
  assert.equal(result.totalPenaltyPoints, 12);
  assert.equal(
    getTransferSummary({ ...baseline, savedPenaltyPoints: 12 })
      .totalPenaltyPoints,
    12,
  );
});

for (const activeChip of ["wildcard", "freeHit"]) {
  test(`${activeChip}: displays unlimited transfers and zero cost without consuming saved free transfers`, () => {
    assert.deepEqual(
      getTransferSummary({
        ...baseline,
        activeChip,
        pendingTransfers: 12,
        savedPenaltyPoints: 8,
      }),
      {
        freeTransfersValue: "∞",
        freeTransfersUsed: 0,
        additionalTransfersUsed: 0,
        pendingPenaltyPoints: 0,
        totalPenaltyPoints: 0,
      },
    );
  });
}

test("scoring chips retain transfer costs, and new teams still have unlimited free transfers", () => {
  for (const activeChip of ["benchBoost", "tripleCaptain"]) {
    assert.equal(
      getTransferSummary({ ...baseline, activeChip, pendingTransfers: 3 })
        .totalPenaltyPoints,
      8,
    );
  }
  const initial = getTransferSummary({
    ...baseline,
    hasParticipated: false,
    pendingTransfers: 12,
  });
  assert.equal(initial.freeTransfersValue, "∞");
  assert.equal(initial.totalPenaltyPoints, 0);
});

const { colors } = load("../src/theme/tokens.ts");
const { getTranslation } = load("../src/i18n/translations.ts");
for (const language of ["en", "uk", "pl"]) {
  test(`${language}: summary has three metrics with points instead of squad value and an accessible unlimited label`, () => {
    const { TransferSummaryMetrics } = load(
      "../src/features/fantasy/components/TransferSummaryMetrics.tsx",
      {
        "react-native": {
          StyleSheet: { create: (value) => value },
          View: "View",
          Text: "Text",
        },
        "../../../i18n/I18nProvider": {
          useI18n: () => ({ t: (key) => getTranslation(language, key) }),
        },
        "../../../theme/tokens": { colors },
        "../utils/seasonThemeContext": {
          useFantasySeasonTheme: () => ({ primaryColor: "blue" }),
        },
      },
    );
    const metrics = TransferSummaryMetrics({
      compact: true,
      summary: {
        bankValue: "-1M",
        costPoints: 8,
        freeTransfersValue: "∞",
        isBankNegative: true,
      },
    }).props.children;
    assert.equal(metrics.length, 3);
    assert.equal(
      metrics[1].props.accessibilityLabel,
      `${getTranslation(language, "team.transfers.costLabel")}: 8`,
    );
    assert.ok(
      metrics[0].props.accessibilityLabel.includes(
        getTranslation(language, "team.freeTransfersUnlimited"),
      ),
    );
    assert.equal(
      Object.assign({}, ...metrics[2].props.style.filter(Boolean))
        .backgroundColor,
      colors.state.dangerSoft,
    );
  });
}
