const userAgent = process.env.npm_config_user_agent || "";
const match = userAgent.match(/npm\/(\d+)\./);
const major = match ? Number(match[1]) : null;

if (major !== 10) {
  console.error(
    "\nThis project keeps package-lock.json in the same npm format used by EAS Build.\n" +
      "Please install dependencies with npm 10, for example:\n" +
      "  npx npm@10.9.3 install\n" +
      "  npx npm@10.9.3 install --package-lock-only --include=dev --ignore-scripts\n"
  );
  process.exit(1);
}
