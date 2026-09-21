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
const { fitSquadPitch, fitRosterPitch } = loaded.exports;

for (const aspectRatio of [755 / 459, 631 / 755]) {
  for (const [availableWidth, availableHeight] of [
    [1408, 644],
    [1334, 440],
    [992, 280],
    [1888, 740],
    [1000, 1300],
    [900, 150],
    [2880, 1400],
    [350, 800],
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
      assert.ok(Number.isFinite(result.scale) && result.scale >= 0);
    });
  }
}

test("grows cards with the pitch while fitting the complete bench and reserve", () => {
  const fitted = fitSquadPitch({
    availableWidth: 1408,
    availableHeight: 640,
    aspectRatio: 755 / 459,
    sideWidth: 62,
    bottomHeight: 85,
    minimumFieldHeight: 298,
  });
  assert.equal(fitted.height * fitted.scale, 640);
  assert.ok(fitted.scale > 1.5);
});

for (const aspectRatio of [755 / 459, 631 / 755]) {
  test(`cards grow proportionally to their container, ratio ${aspectRatio}`, () => {
    const options = { aspectRatio, sideWidth: 62, bottomHeight: 95, minimumFieldHeight: 330 };
    const small = fitSquadPitch({ ...options, availableWidth: 600, availableHeight: 500 });
    const large = fitSquadPitch({ ...options, availableWidth: 1200, availableHeight: 1000 });
    assert.equal(large.width, small.width);
    assert.equal(large.height, small.height);
    assert.equal(large.scale, small.scale * 2);
    assert.equal(62 * large.scale, 2 * 62 * small.scale);
  });

  for (const availableWidth of [0, 280, 350, 390, 768, 1024]) {
    test(`width-only pitch fits ${availableWidth}px without a height feedback loop, ratio ${aspectRatio}`, () => {
      const fitted = fitSquadPitch({ availableWidth, aspectRatio, sideWidth: 62, bottomHeight: 95, minimumFieldHeight: 330 });
      assert.ok(Math.abs(fitted.width * fitted.scale - availableWidth) < 0.001);
      assert.ok(Number.isFinite(fitted.height * fitted.scale));
    });
  }

  for (const [availableWidth, availableHeight] of [[350, undefined], [768, undefined], [600, 400], [1400, 800], [2880, 1400], [900, 150], [0, 0]]) {
    test(`roster scales all twelve cards within ${availableWidth}x${availableHeight}, ratio ${aspectRatio}`, () => {
      const fitted = fitRosterPitch({ availableWidth, availableHeight, aspectRatio });
      assert.ok(fitted.width * fitted.scale <= availableWidth + 0.001);
      if (availableHeight !== undefined) assert.ok(fitted.height * fitted.scale <= availableHeight + 0.001);
      assert.ok(fitted.height >= 300);
      assert.ok(fitted.width >= 360);
      assert.ok(Math.abs(fitted.width / fitted.height - aspectRatio) < 0.001);
      // Each of the five 52px cards keeps its share of the row when scaled.
      const rowWidth = aspectRatio > 1 ? fitted.width * 0.88 : fitted.width - 48;
      assert.ok((rowWidth - 5 * 52) / 4 >= 8);
      assert.ok((aspectRatio > 1 ? 0.72 : 0.58) * fitted.height + 66 < fitted.height);
    });
  }
}

test("a narrow transfer column does not inherit the full desktop width", () => {
  const column = fitRosterPitch({ availableWidth: 500, availableHeight: 900, aspectRatio: 755 / 459 });
  const full = fitRosterPitch({ availableWidth: 1600, availableHeight: 900, aspectRatio: 755 / 459 });
  assert.ok(column.scale < full.scale);
  assert.equal(column.width * column.scale, 500);
});
