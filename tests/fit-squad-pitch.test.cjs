const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const filename =
  require.resolve("../src/features/fantasy/utils/fitSquadPitch.ts");
const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
  fileName: filename,
});
const loaded = { exports: {} };
new Function("exports", "module", outputText)(loaded.exports, loaded);
const { fitSquadPitch } = loaded.exports;

for (const aspectRatio of [755 / 459, 631 / 755]) {
  for (const [availableWidth, availableHeight] of [
    [1408, 644],
    [1334, 440],
    [992, 280],
    [1888, 740],
    [1000, 1300],
    [900, 150],
    [0, 0],
  ]) {
    test(`fits field, bench and reserve in ${availableWidth}x${availableHeight}, ratio ${aspectRatio}`, () => {
      const result = fitSquadPitch({
        availableWidth,
        availableHeight,
        aspectRatio,
        sideWidth: 62,
        bottomHeight: 95,
        minimumFieldHeight: 330,
      });
      assert.ok(result.width * result.scale <= availableWidth + 0.001);
      assert.ok(result.height * result.scale <= availableHeight + 0.001);
      assert.ok(result.height - 95 >= 330);
      assert.ok(
        Math.abs((result.width - 62) / (result.height - 95) - aspectRatio) <
          0.001,
      );
      assert.ok(result.scale >= 0 && result.scale <= 1);
    });
  }
}

test("uses full available height without scaling cards when the bench fits", () => {
  const fitted = fitSquadPitch({
    availableWidth: 1408,
    availableHeight: 640,
    aspectRatio: 755 / 459,
    sideWidth: 62,
    bottomHeight: 85,
    minimumFieldHeight: 298,
  });
  assert.equal(fitted.height, 640);
  assert.equal(fitted.scale, 1);
});
