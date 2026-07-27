import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const username = process.argv[2];
const placeholder = "YOUR_GITHUB_USERNAME";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const excludedDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const textExtensions = new Set([
  ".cff",
  ".json",
  ".md",
  ".ts",
  ".yaml",
  ".yml"
]);
const specialFiles = new Set(["LICENSE", "action.yml"]);

if (
  !username ||
  !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(username)
) {
  process.stderr.write(
    "Usage: npm run personalize -- YOUR_GITHUB_USERNAME\n"
  );
  process.exitCode = 1;
} else {
  const changed = [];
  await walk(root);
  process.stdout.write(
    `Personalized ${changed.length} files for ${username}.\nRun npm run check before publishing.\n`
  );

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (excludedDirectories.has(entry.name)) {
        continue;
      }
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(target);
        continue;
      }
      if (
        target === fileURLToPath(import.meta.url) ||
        (!textExtensions.has(path.extname(entry.name)) &&
          !specialFiles.has(entry.name))
      ) {
        continue;
      }
      const content = await readFile(target, "utf8");
      if (!content.includes(placeholder)) {
        continue;
      }
      await writeFile(target, content.replaceAll(placeholder, username), "utf8");
      changed.push(path.relative(root, target));
    }
  }
}
