const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

function harness(theme) {
  let failed = false;
  let previousUrl;
  const effects = [];
  const styles = {
    playerAvatarBase: { alignItems: "center", justifyContent: "center" },
    playerAvatarMd: { width: 44, height: 44 },
    playerAvatarXl: { width: 96, height: 96 },
    playerAvatarMuted: { opacity: 0.5 },
    playerAvatarImage: { position: "absolute", width: "100%", height: "100%" },
  };
  const mocks = {
    react: {
      memo: (component) => component,
      useState: () => [failed, (next) => { failed = next; }],
      useEffect: (effect, [url]) => {
        if (previousUrl !== url) effects.push(effect);
        previousUrl = url;
      },
    },
    "expo-image": { Image: "Image" },
    "lucide-react-native": { UserRound: "UserRound" },
    "react-native": { View: "View" },
    "../../../styles": { styles },
    "../../../theme/tokens": { colors: { text: { muted: "#6B7280" } } },
    "../utils/seasonThemeContext": { useFantasySeasonTheme: () => theme },
  };
  const filename = require.resolve("../src/features/fantasy/components/PlayerAvatar.tsx");
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  const exports = {};
  new Function("require", "exports", outputText)((id) => mocks[id] ?? require(id), exports);
  return (props) => {
    const tree = exports.PlayerAvatar({ displayName: "Player", ...props });
    effects.splice(0).forEach((effect) => effect());
    return { tree, style: Object.assign({}, ...tree.props.style.flat().filter(Boolean)), child: tree.props.children };
  };
}

for (const theme of [
  { primaryColor: "#004494", softColor: "#EAF2FF", borderColor: "#CFDDF1" },
  { primaryColor: "#D42D3C", softColor: "#FDECEF", borderColor: "#F4CBD0" },
]) {
  for (const [width, iconSize] of [[112, 72], [190, 112]]) {
    test(`${theme.primaryColor}/${width}: missing photos show a contrasting placeholder without changing hero dimensions`, () => {
      const render = harness(theme);
      for (const photoUrl of [undefined, null, ""]) {
        const { tree, style, child } = render({ photoUrl, iconSize, size: "xl",
          style: { width, height: "auto", alignSelf: "stretch", backgroundColor: "transparent" } });
        assert.equal(tree.props.accessibilityLabel, "Player");
        assert.equal(style.width, width);
        assert.equal(style.height, "auto");
        assert.equal(style.alignSelf, "stretch");
        assert.equal(style.backgroundColor, theme.softColor);
        assert.equal(child.type, "UserRound");
        assert.equal(child.props.color, theme.primaryColor);
        assert.equal(child.props.size, iconSize);
        assert.notEqual(child.props.color, style.backgroundColor);
      }
    });
  }
}

test("failed images switch to the placeholder and a changed photo URL can load again", () => {
  const theme = { primaryColor: "#004494", softColor: "#EAF2FF" };
  const render = harness(theme);
  const props = { photoUrl: "first.png", style: { backgroundColor: "transparent" } };
  const loaded = render(props);
  assert.equal(loaded.child.type, "Image");
  assert.equal(loaded.style.backgroundColor, "transparent");
  loaded.child.props.onError();
  const failed = render(props);
  assert.equal(failed.child.type, "UserRound");
  assert.equal(failed.style.backgroundColor, theme.softColor);
  render({ ...props, photoUrl: "next.png" });
  const next = render({ ...props, photoUrl: "next.png" });
  assert.equal(next.child.type, "Image");
  assert.equal(next.child.props.source.uri, "next.png");
});

test("compact and muted avatars preserve their existing icon size and opacity", () => {
  const render = harness({ primaryColor: "#004494", softColor: "#EAF2FF" });
  const { style, child } = render({ isMuted: true });
  assert.equal(style.width, 44);
  assert.equal(style.height, 44);
  assert.equal(style.opacity, 0.5);
  assert.equal(child.props.size, 21);
  assert.equal(child.props.color, "#6B7280");
});
