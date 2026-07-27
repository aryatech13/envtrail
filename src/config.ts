import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  EnvTrailConfig,
  EnvTrailConfigInput,
  RuleName,
  RuleSetting
} from "./types.js";

const CONFIG_FILENAMES = [".envtrailrc.json", "envtrail.config.json"] as const;

const DEFAULT_CONFIG: EnvTrailConfig = {
  documentation: [
    ".env.example",
    ".env.sample",
    ".env.template",
    ".env.defaults",
    ".env.*.example",
    ".env.*.sample",
    ".env.*.template"
  ],
  exclude: [
    "**/.git/**",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/vendor/**",
    "**/.venv/**",
    "**/__pycache__/**",
    "**/target/**",
    "**/.next/**",
    "**/.nuxt/**"
  ],
  ignore: [
    "CI",
    "NODE_ENV",
    "PATH",
    "HOME",
    "PWD",
    "SHELL",
    "USER",
    "TERM",
    "TMPDIR",
    "GITHUB_*",
    "RUNNER_*",
    "npm_*"
  ],
  rules: {
    undocumented: "error",
    staleDocumentation: "warning",
    providerOnly: "warning",
    trackedEnvFile: "error",
    dynamicAccess: "warning",
    duplicateDocumentation: "warning"
  },
  maxFileSizeKb: 512
};

export function defineConfig(config: EnvTrailConfigInput): EnvTrailConfigInput {
  return config;
}

export function resolveConfig(input: EnvTrailConfigInput = {}): EnvTrailConfig {
  const rules = { ...DEFAULT_CONFIG.rules };
  if (input.rules) {
    for (const [name, setting] of Object.entries(input.rules)) {
      if (isRuleName(name) && isRuleSetting(setting)) {
        rules[name] = setting;
      }
    }
  }

  return {
    documentation: input.documentation ?? [...DEFAULT_CONFIG.documentation],
    exclude: [...DEFAULT_CONFIG.exclude, ...(input.exclude ?? [])],
    ignore: [...DEFAULT_CONFIG.ignore, ...(input.ignore ?? [])],
    rules,
    maxFileSizeKb: input.maxFileSizeKb ?? DEFAULT_CONFIG.maxFileSizeKb
  };
}

export async function loadConfig(
  root: string,
  explicitPath?: string
): Promise<{ config: EnvTrailConfig; path?: string }> {
  const candidates = explicitPath
    ? [path.resolve(root, explicitPath)]
    : CONFIG_FILENAMES.map((filename) => path.join(root, filename));

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, "utf8");
      const parsed = JSON.parse(raw) as EnvTrailConfigInput;
      return { config: resolveConfig(parsed), path: candidate };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" && !explicitPath) {
        continue;
      }
      if (code === "ENOENT") {
        throw new Error(`Config file not found: ${candidate}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${candidate}: ${error.message}`);
      }
      throw error;
    }
  }

  return { config: resolveConfig() };
}

function isRuleName(value: string): value is RuleName {
  return value in DEFAULT_CONFIG.rules;
}

function isRuleSetting(value: unknown): value is RuleSetting {
  return (
    value === "error" ||
    value === "warning" ||
    value === "info" ||
    value === "off"
  );
}
