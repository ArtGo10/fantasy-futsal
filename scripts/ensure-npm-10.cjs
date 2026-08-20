const fs = require("node:fs");
const path = require("node:path");

function getNpmMajorFromExecPath(execPath) {
  if (!execPath) return null;

  let currentDir = path.dirname(execPath);
  for (let depth = 0; depth < 4; depth += 1) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        const major = Number(String(packageJson.version || "").split(".")[0]);
        return packageJson.name === "npm" && Number.isFinite(major) ? major : null;
      } catch {
        return null;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

const userAgent = process.env.npm_config_user_agent || "";
const userAgentMatch = userAgent.match(/npm\/(\d+)\./);
const userAgentMajor = userAgentMatch ? Number(userAgentMatch[1]) : null;
const execPathMajor = getNpmMajorFromExecPath(process.env.npm_execpath);
const major = execPathMajor ?? userAgentMajor;
const isVercelInstall = process.env.VERCEL === "1";
const shouldSkipCheck =
  isVercelInstall || process.env.SKIP_NPM_VERSION_CHECK === "1";

if (shouldSkipCheck) {
  process.exit(0);
}

if (major !== 10) {
  console.error(
    "\nThis project keeps package-lock.json in the same npm format used by EAS Build.\n" +
      "Please install dependencies with npm 10, for example:\n" +
      "  npx npm@10.9.3 install\n" +
      "  npx npm@10.9.3 install --package-lock-only --include=dev --ignore-scripts\n"
  );
  process.exit(1);
}
