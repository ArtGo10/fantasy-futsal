const { createRunOncePlugin, withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'with-ios-build-fixes';
const MARKER = '[with-ios-build-fixes]';

function setExplicitModulesOff(buildSettings) {
  buildSettings.SWIFT_ENABLE_EXPLICIT_MODULES = 'NO';
}

function withAppTargetBuildSettings(config) {
  return withXcodeProject(config, (modConfig) => {
    const xcodeProject = modConfig.modResults;
    const buildConfigs = xcodeProject.hash.project.objects.XCBuildConfiguration || {};

    for (const buildConfig of Object.values(buildConfigs)) {
      if (buildConfig && buildConfig.buildSettings) {
        setExplicitModulesOff(buildConfig.buildSettings);
      }
    }

    return modConfig;
  });
}

function buildPostInstallSnippet() {
  return `
  # ${MARKER} Xcode's Swift explicit module scanner can ask for pod modulemaps
  # before CocoaPods targets have produced them during EAS Debug archives.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end
  end

  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.xcconfigs.each do |_, xcconfig|
      if xcconfig.respond_to?(:attributes)
        xcconfig.attributes['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
      end
    end
  end
`;
}

function injectPostInstallSnippet(podfile) {
  if (podfile.includes(MARKER)) {
    return podfile;
  }

  const snippet = buildPostInstallSnippet();
  const lines = podfile.split('\n');
  const postInstallLineIndex = lines.findIndex((line) => /\bpost_install do \|installer\|/.test(line));

  if (postInstallLineIndex === -1) {
    return `${podfile.trimEnd()}

post_install do |installer|
${snippet}end
`;
  }

  let depth = 1;
  for (let index = postInstallLineIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*end\s*$/.test(line) && depth === 1) {
      lines.splice(index, 0, snippet.trimEnd());
      return lines.join('\n');
    }

    const openedBlocks = (line.match(/\bdo\b/g) || []).length;
    const closedBlocks = (line.match(/\bend\b/g) || []).length;
    depth += openedBlocks - closedBlocks;
  }

  return podfile;
}

function withPodfileBuildSettings(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');
      const nextPodfile = injectPostInstallSnippet(podfile);

      if (nextPodfile !== podfile) {
        fs.writeFileSync(podfilePath, nextPodfile);
      }

      return modConfig;
    },
  ]);
}

function withIosBuildFixes(config) {
  config = withAppTargetBuildSettings(config);
  config = withPodfileBuildSettings(config);
  return config;
}

module.exports = createRunOncePlugin(withIosBuildFixes, PLUGIN_NAME, '1.0.0');
