import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { EnvTrailConfig } from "./types.js";
import { matchesAnyGlob, toPosixPath } from "./utils.js";

const execFileAsync = promisify(execFile);

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".py",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".java",
  ".cs",
  ".sh",
  ".bash",
  ".zsh"
]);

const YAML_EXTENSIONS = new Set([".yml", ".yaml"]);
const ENV_DOCUMENT_MARKERS = [".example", ".sample", ".template", ".defaults"];

export interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  kind: "source" | "dotenv-doc" | "dockerfile" | "compose" | "ci" | "kubernetes";
}

export interface DiscoveryResult {
  files: DiscoveredFile[];
  skippedFiles: number;
  secretEnvFiles: string[];
}

export async function discoverFiles(
  root: string,
  config: EnvTrailConfig
): Promise<DiscoveryResult> {
  const files: DiscoveredFile[] = [];
  const secretEnvFiles: string[] = [];
  let skippedFiles = 0;

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosixPath(path.relative(root, absolutePath));

      if (matchesAnyGlob(relativePath, config.exclude)) {
        if (entry.isDirectory()) {
          skippedFiles += 1;
        }
        continue;
      }

      if (entry.isSymbolicLink()) {
        skippedFiles += 1;
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      if (isSecretEnvFile(entry.name)) {
        secretEnvFiles.push(relativePath);
        continue;
      }

      const kind = classifyFile(relativePath, entry.name, config);
      if (!kind) {
        continue;
      }

      const metadata = await stat(absolutePath);
      if (metadata.size > config.maxFileSizeKb * 1024) {
        skippedFiles += 1;
        continue;
      }

      files.push({ absolutePath, relativePath, kind });
    }
  }

  await walk(root);
  return { files, skippedFiles, secretEnvFiles };
}

export async function readDiscoveredFile(file: DiscoveredFile): Promise<string> {
  const content = await readFile(file.absolutePath, "utf8");
  return content.includes("\0") ? "" : content;
}

export async function findTrackedEnvFiles(
  root: string,
  candidates: string[]
): Promise<string[]> {
  if (candidates.length === 0) {
    return [];
  }
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", root, "ls-files", "--", ...candidates],
      { encoding: "utf8", maxBuffer: 1024 * 1024 }
    );
    return stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(toPosixPath)
      .sort((left, right) => left.localeCompare(right, "en"));
  } catch {
    return [];
  }
}

export function isSecretEnvFile(filename: string): boolean {
  if (!/^\.env(?:$|\.)/u.test(filename)) {
    return false;
  }
  return !ENV_DOCUMENT_MARKERS.some((marker) => filename.includes(marker));
}

function classifyFile(
  relativePath: string,
  filename: string,
  config: EnvTrailConfig
): DiscoveredFile["kind"] | undefined {
  if (
    matchesAnyGlob(filename, config.documentation) ||
    matchesAnyGlob(relativePath, config.documentation)
  ) {
    return "dotenv-doc";
  }

  const lowerFilename = filename.toLowerCase();
  const extension = path.extname(filename).toLowerCase();

  if (lowerFilename === "dockerfile" || lowerFilename.startsWith("dockerfile.")) {
    return "dockerfile";
  }
  if (
    YAML_EXTENSIONS.has(extension) &&
    /(?:^|\/)(?:docker-)?compose(?:\.[^/]+)?\.ya?ml$/iu.test(relativePath)
  ) {
    return "compose";
  }
  if (
    YAML_EXTENSIONS.has(extension) &&
    (relativePath.startsWith(".github/workflows/") ||
      lowerFilename === ".gitlab-ci.yml")
  ) {
    return relativePath.startsWith(".github/") ? "ci" : "ci";
  }
  if (
    YAML_EXTENSIONS.has(extension) &&
    /(?:^|\/)(?:k8s|kubernetes|manifests|deploy)(?:\/|$)/iu.test(relativePath)
  ) {
    return "kubernetes";
  }
  if (SOURCE_EXTENSIONS.has(extension)) {
    return "source";
  }
  return undefined;
}
