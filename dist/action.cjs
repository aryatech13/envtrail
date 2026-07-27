"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/action.ts
var import_promises3 = require("fs/promises");
var import_node_path9 = __toESM(require("path"), 1);
var import_node_process = __toESM(require("process"), 1);

// src/analysis.ts
var import_node_path6 = __toESM(require("path"), 1);

// src/config.ts
var import_promises = require("fs/promises");
var import_node_path = __toESM(require("path"), 1);
var CONFIG_FILENAMES = [".envtrailrc.json", "envtrail.config.json"];
var DEFAULT_CONFIG = {
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
function resolveConfig(input2 = {}) {
  const rules = { ...DEFAULT_CONFIG.rules };
  if (input2.rules) {
    for (const [name, setting] of Object.entries(input2.rules)) {
      if (isRuleName(name) && isRuleSetting(setting)) {
        rules[name] = setting;
      }
    }
  }
  return {
    documentation: input2.documentation ?? [...DEFAULT_CONFIG.documentation],
    exclude: [...DEFAULT_CONFIG.exclude, ...input2.exclude ?? []],
    ignore: [...DEFAULT_CONFIG.ignore, ...input2.ignore ?? []],
    rules,
    maxFileSizeKb: input2.maxFileSizeKb ?? DEFAULT_CONFIG.maxFileSizeKb
  };
}
async function loadConfig(root, explicitPath) {
  const candidates = explicitPath ? [import_node_path.default.resolve(root, explicitPath)] : CONFIG_FILENAMES.map((filename) => import_node_path.default.join(root, filename));
  for (const candidate of candidates) {
    try {
      const raw = await (0, import_promises.readFile)(candidate, "utf8");
      const parsed = JSON.parse(raw);
      return { config: resolveConfig(parsed), path: candidate };
    } catch (error) {
      const code = error.code;
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
function isRuleName(value) {
  return value in DEFAULT_CONFIG.rules;
}
function isRuleSetting(value) {
  return value === "error" || value === "warning" || value === "info" || value === "off";
}

// src/discovery.ts
var import_node_child_process = require("child_process");
var import_promises2 = require("fs/promises");
var import_node_path3 = __toESM(require("path"), 1);
var import_node_util = require("util");

// src/utils.ts
var import_node_path2 = __toESM(require("path"), 1);
var SENSITIVE_NAME = /(?:^|_)(?:API_?KEY|AUTH|CREDENTIALS?|PASSWORD|PRIVATE|SECRET|TOKEN)(?:_|$)/i;
function isSensitiveName(name) {
  return SENSITIVE_NAME.test(name);
}
function toPosixPath(value) {
  return value.split(import_node_path2.default.sep).join("/");
}
function locationForMatch(file, line, index) {
  return { file, line, column: index + 1 };
}
function matchesAnyGlob(value, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(value));
}
function globToRegExp(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const next = pattern[index + 1];
    if (character === "*" && next === "*") {
      const after = pattern[index + 2];
      if (after === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
      continue;
    }
    if (character === "*") {
      expression += "[^/]*";
      continue;
    }
    if (character === "?") {
      expression += "[^/]";
      continue;
    }
    expression += escapeRegExp(character ?? "");
  }
  return new RegExp(`${expression}$`);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm ?? `${singular}s`}`;
}
function stableSort(values, selector) {
  return [...values].sort(
    (left, right) => selector(left).localeCompare(selector(right), "en")
  );
}

// src/discovery.ts
var execFileAsync = (0, import_node_util.promisify)(import_node_child_process.execFile);
var SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([
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
var YAML_EXTENSIONS = /* @__PURE__ */ new Set([".yml", ".yaml"]);
var ENV_DOCUMENT_MARKERS = [".example", ".sample", ".template", ".defaults"];
async function discoverFiles(root, config) {
  const files = [];
  const secretEnvFiles = [];
  let skippedFiles = 0;
  async function walk2(directory) {
    const entries = await (0, import_promises2.readdir)(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = import_node_path3.default.join(directory, entry.name);
      const relativePath = toPosixPath(import_node_path3.default.relative(root, absolutePath));
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
        await walk2(absolutePath);
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
      const metadata = await (0, import_promises2.stat)(absolutePath);
      if (metadata.size > config.maxFileSizeKb * 1024) {
        skippedFiles += 1;
        continue;
      }
      files.push({ absolutePath, relativePath, kind });
    }
  }
  await walk2(root);
  return { files, skippedFiles, secretEnvFiles };
}
async function readDiscoveredFile(file) {
  const content = await (0, import_promises2.readFile)(file.absolutePath, "utf8");
  return content.includes("\0") ? "" : content;
}
async function findTrackedEnvFiles(root, candidates) {
  if (candidates.length === 0) {
    return [];
  }
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", root, "ls-files", "--", ...candidates],
      { encoding: "utf8", maxBuffer: 1024 * 1024 }
    );
    return stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).map(toPosixPath).sort((left, right) => left.localeCompare(right, "en"));
  } catch {
    return [];
  }
}
function isSecretEnvFile(filename) {
  if (!/^\.env(?:$|\.)/u.test(filename)) {
    return false;
  }
  return !ENV_DOCUMENT_MARKERS.some((marker2) => filename.includes(marker2));
}
function classifyFile(relativePath, filename, config) {
  if (matchesAnyGlob(filename, config.documentation) || matchesAnyGlob(relativePath, config.documentation)) {
    return "dotenv-doc";
  }
  const lowerFilename = filename.toLowerCase();
  const extension = import_node_path3.default.extname(filename).toLowerCase();
  if (lowerFilename === "dockerfile" || lowerFilename.startsWith("dockerfile.")) {
    return "dockerfile";
  }
  if (YAML_EXTENSIONS.has(extension) && /(?:^|\/)(?:docker-)?compose(?:\.[^/]+)?\.ya?ml$/iu.test(relativePath)) {
    return "compose";
  }
  if (YAML_EXTENSIONS.has(extension) && (relativePath.startsWith(".github/workflows/") || lowerFilename === ".gitlab-ci.yml")) {
    return relativePath.startsWith(".github/") ? "ci" : "ci";
  }
  if (YAML_EXTENSIONS.has(extension) && /(?:^|\/)(?:k8s|kubernetes|manifests|deploy)(?:\/|$)/iu.test(relativePath)) {
    return "kubernetes";
  }
  if (SOURCE_EXTENSIONS.has(extension)) {
    return "source";
  }
  return void 0;
}

// src/scanners/dotenv.ts
function scanDotenvDocumentation(content, relativePath) {
  const facts = [];
  const lines = content.split(/\r?\n/u);
  let pendingDescription = [];
  for (const [lineIndex, line] of lines.entries()) {
    const comment = /^\s*#\s?(.*)$/u.exec(line);
    if (comment) {
      pendingDescription.push(comment[1]?.trim() ?? "");
      continue;
    }
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u.exec(line);
    if (!match?.[1]) {
      if (line.trim() !== "") {
        pendingDescription = [];
      }
      continue;
    }
    const name = match[1];
    const description = pendingDescription.filter(Boolean).join(" ");
    facts.push({
      name,
      role: "documentation",
      adapter: "dotenv",
      location: locationForMatch(
        relativePath,
        lineIndex + 1,
        line.indexOf(name)
      ),
      ...description ? { description } : {},
      sensitive: isSensitiveName(name)
    });
    pendingDescription = [];
  }
  return facts;
}

// src/scanners/infrastructure.ts
var import_node_path4 = __toESM(require("path"), 1);
var import_yaml = require("yaml");
function scanDockerfile(content, relativePath) {
  const facts = [];
  const lines = content.split(/\r?\n/u);
  for (const [lineIndex, line] of lines.entries()) {
    const instruction = /^\s*(ENV|ARG)\s+(.+)$/iu.exec(line);
    if (!instruction?.[1] || !instruction[2]) {
      continue;
    }
    const body = instruction[2].trim();
    const candidates = [
      ...body.matchAll(/(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)=/gu)
    ];
    if (candidates.length === 0) {
      const legacyName = /^([A-Za-z_][A-Za-z0-9_]*)\b/u.exec(body)?.[1];
      if (legacyName) {
        facts.push(
          providerFact(
            legacyName,
            "dockerfile",
            relativePath,
            lineIndex + 1,
            line.indexOf(legacyName),
            `${instruction[1].toUpperCase()} instruction`
          )
        );
      }
      continue;
    }
    for (const candidate of candidates) {
      const name = candidate[1];
      if (!name) {
        continue;
      }
      facts.push(
        providerFact(
          name,
          "dockerfile",
          relativePath,
          lineIndex + 1,
          line.indexOf(name),
          `${instruction[1].toUpperCase()} instruction`
        )
      );
    }
  }
  return facts;
}
function scanYamlInfrastructure(content, relativePath, kind) {
  const facts = [];
  const documents = (0, import_yaml.parseAllDocuments)(content);
  for (const document of documents) {
    if (document.errors.length > 0) {
      continue;
    }
    const value = document.toJS({ maxAliasCount: 100 });
    if (kind === "compose") {
      collectCompose(value, facts, content, relativePath);
    } else if (kind === "kubernetes") {
      collectKubernetes(value, facts, content, relativePath);
    } else {
      collectCi(value, facts, content, relativePath, ciAdapter(relativePath));
    }
  }
  return deduplicateFacts(facts);
}
function collectCompose(value, facts, content, relativePath) {
  if (!isRecord(value) || !isRecord(value.services)) {
    return;
  }
  for (const service of Object.values(value.services)) {
    if (!isRecord(service)) {
      continue;
    }
    const environment = service.environment;
    if (Array.isArray(environment)) {
      for (const entry of environment) {
        if (typeof entry !== "string") {
          continue;
        }
        const name = /^([A-Za-z_][A-Za-z0-9_]*)/u.exec(entry)?.[1];
        if (name) {
          facts.push(
            yamlProviderFact(
              name,
              "compose",
              relativePath,
              content,
              "service environment"
            )
          );
        }
      }
    } else if (isRecord(environment)) {
      for (const name of Object.keys(environment)) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
          facts.push(
            yamlProviderFact(
              name,
              "compose",
              relativePath,
              content,
              "service environment"
            )
          );
        }
      }
    }
  }
}
function collectCi(value, facts, content, relativePath, adapter) {
  walk(value, (key, child) => {
    const targetKey = adapter === "gitlab-ci" ? "variables" : "env";
    if (key !== targetKey || !isRecord(child)) {
      return;
    }
    for (const name of Object.keys(child)) {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
        facts.push(
          yamlProviderFact(
            name,
            adapter,
            relativePath,
            content,
            adapter === "github-actions" ? "workflow environment" : "CI variable"
          )
        );
      }
    }
  });
}
function collectKubernetes(value, facts, content, relativePath) {
  walk(value, (key, child) => {
    if (key !== "env" || !Array.isArray(child)) {
      return;
    }
    for (const entry of child) {
      if (!isRecord(entry) || typeof entry.name !== "string") {
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(entry.name)) {
        facts.push(
          yamlProviderFact(
            entry.name,
            "kubernetes",
            relativePath,
            content,
            "container environment"
          )
        );
      }
    }
  });
}
function ciAdapter(relativePath) {
  return import_node_path4.default.basename(relativePath).toLowerCase() === ".gitlab-ci.yml" ? "gitlab-ci" : "github-actions";
}
function yamlProviderFact(name, adapter, relativePath, content, detail) {
  const location = findYamlLocation(content, relativePath, name);
  return {
    name,
    role: "provider",
    adapter,
    location,
    detail,
    sensitive: isSensitiveName(name)
  };
}
function providerFact(name, adapter, relativePath, line, index, detail) {
  return {
    name,
    role: "provider",
    adapter,
    location: locationForMatch(relativePath, line, Math.max(0, index)),
    detail,
    sensitive: isSensitiveName(name)
  };
}
function findYamlLocation(content, relativePath, name) {
  const expression = new RegExp(
    `(?:^|[-{,]\\s)\\s*(?:name:\\s*)?${escapeRegExp(name)}(?:\\s*[:=},]|$)`,
    "u"
  );
  const lines = content.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    const match = expression.exec(line);
    if (match) {
      return locationForMatch(relativePath, index + 1, line.indexOf(name));
    }
  }
  return { file: relativePath, line: 1, column: 1 };
}
function walk(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visitor);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    visitor(key, child);
    walk(child, visitor);
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function deduplicateFacts(facts) {
  const seen = /* @__PURE__ */ new Set();
  return facts.filter((fact) => {
    const key = `${fact.name}:${fact.adapter}:${fact.location.file}:${fact.location.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// src/scanners/source.ts
var import_node_path5 = __toESM(require("path"), 1);
var STATIC_PATTERNS = [
  {
    adapter: "javascript",
    expression: /\b(?:process|Bun)\.env\.([A-Za-z_][A-Za-z0-9_]*)/gu,
    label: "property access"
  },
  {
    adapter: "javascript",
    expression: /\b(?:process|Bun)\.env\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\]/gu,
    label: "indexed access"
  },
  {
    adapter: "javascript",
    expression: /\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/gu,
    label: "import.meta access"
  },
  {
    adapter: "javascript",
    expression: /\bDeno\.env\.(?:get|has)\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)/gu,
    label: "Deno env access"
  },
  {
    adapter: "python",
    expression: /\bos\.environ(?:\.get)?\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/gu,
    label: "os.environ call"
  },
  {
    adapter: "python",
    expression: /\bos\.environ\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/gu,
    label: "os.environ access"
  },
  {
    adapter: "python",
    expression: /\bos\.getenv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/gu,
    label: "os.getenv access"
  },
  {
    adapter: "go",
    expression: /\bos\.(?:Getenv|LookupEnv)\(\s*["`]([A-Za-z_][A-Za-z0-9_]*)["`]\s*\)/gu,
    label: "os env access"
  },
  {
    adapter: "rust",
    expression: /(?:std::)?env::var\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "std::env access"
  },
  {
    adapter: "rust",
    expression: /\b(?:option_env|env)!\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "compile-time env access"
  },
  {
    adapter: "ruby",
    expression: /\bENV\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/gu,
    label: "ENV access"
  },
  {
    adapter: "ruby",
    expression: /\bENV\.fetch\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/gu,
    label: "ENV.fetch access"
  },
  {
    adapter: "php",
    expression: /\bgetenv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/gu,
    label: "getenv access"
  },
  {
    adapter: "php",
    expression: /\$_ENV\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/gu,
    label: "$_ENV access"
  },
  {
    adapter: "java",
    expression: /\bSystem\.getenv\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "System.getenv access"
  },
  {
    adapter: "dotnet",
    expression: /\bEnvironment\.GetEnvironmentVariable\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "Environment access"
  }
];
var DYNAMIC_PATTERNS = [
  {
    adapter: "javascript",
    expression: /\b(?:process|Bun)\.env\[\s*(?!["'`])([^\]]+)\]/gu
  },
  {
    adapter: "javascript",
    expression: /\bDeno\.env\.(?:get|has)\(\s*(?!["'`])([^)]+)\)/gu
  },
  {
    adapter: "python",
    expression: /\bos\.(?:getenv|environ\.get)\(\s*(?!["'])([^,)]+)/gu
  },
  {
    adapter: "go",
    expression: /\bos\.(?:Getenv|LookupEnv)\(\s*(?!["`])([^)]+)\)/gu
  }
];
var SOURCE_ADAPTER_BY_EXTENSION = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "javascript",
  ".tsx": "javascript",
  ".mts": "javascript",
  ".cts": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".java": "java",
  ".cs": "dotnet",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell"
};
function scanSource(content, relativePath) {
  const facts = [];
  const dynamicAccesses = [];
  const extension = import_node_path5.default.extname(relativePath).toLowerCase();
  const expectedAdapter = SOURCE_ADAPTER_BY_EXTENSION[extension];
  if (!expectedAdapter) {
    return { facts, dynamicAccesses };
  }
  const lines = content.split(/\r?\n/u);
  for (const [lineIndex, line] of lines.entries()) {
    for (const pattern of STATIC_PATTERNS) {
      if (pattern.adapter !== expectedAdapter) {
        continue;
      }
      pattern.expression.lastIndex = 0;
      for (const match of line.matchAll(pattern.expression)) {
        const name = match[1];
        if (!name) {
          continue;
        }
        facts.push({
          name,
          role: "consumer",
          adapter: pattern.adapter,
          location: locationForMatch(
            relativePath,
            lineIndex + 1,
            match.index ?? 0
          ),
          detail: pattern.label,
          sensitive: isSensitiveName(name)
        });
      }
    }
    if (expectedAdapter === "javascript") {
      facts.push(...scanJavaScriptDestructuring(line, relativePath, lineIndex + 1));
    }
    if (expectedAdapter === "shell") {
      facts.push(...scanShell(line, relativePath, lineIndex + 1));
    }
    for (const pattern of DYNAMIC_PATTERNS) {
      if (pattern.adapter !== expectedAdapter) {
        continue;
      }
      pattern.expression.lastIndex = 0;
      for (const match of line.matchAll(pattern.expression)) {
        dynamicAccesses.push({
          adapter: pattern.adapter,
          location: locationForMatch(
            relativePath,
            lineIndex + 1,
            match.index ?? 0
          ),
          expression: (match[0] ?? "").slice(0, 120)
        });
      }
    }
  }
  return {
    facts: deduplicateFacts2(facts),
    dynamicAccesses: deduplicateDynamicAccesses(dynamicAccesses)
  };
}
function scanJavaScriptDestructuring(line, relativePath, lineNumber) {
  const match = /\{([^}]+)\}\s*=\s*(?:process|Bun)\.env\b/u.exec(line);
  if (!match?.[1]) {
    return [];
  }
  const facts = [];
  for (const part of match[1].split(",")) {
    const candidate = part.trim().split(/[:=]/u)[0]?.trim();
    if (!candidate || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(candidate)) {
      continue;
    }
    const column = Math.max(0, line.indexOf(candidate));
    facts.push({
      name: candidate,
      role: "consumer",
      adapter: "javascript",
      location: locationForMatch(relativePath, lineNumber, column),
      detail: "destructured access",
      sensitive: isSensitiveName(candidate)
    });
  }
  return facts;
}
function scanShell(line, relativePath, lineNumber) {
  if (/^\s*(?:export\s+)?[A-Z_][A-Z0-9_]*=/u.test(line)) {
    return [];
  }
  const expression = /\$(?:\{([A-Z_][A-Z0-9_]*)[^}]*\}|([A-Z_][A-Z0-9_]*))/gu;
  const facts = [];
  for (const match of line.matchAll(expression)) {
    const name = match[1] ?? match[2];
    if (!name) {
      continue;
    }
    facts.push({
      name,
      role: "consumer",
      adapter: "shell",
      location: locationForMatch(relativePath, lineNumber, match.index ?? 0),
      detail: "shell expansion",
      sensitive: isSensitiveName(name)
    });
  }
  return facts;
}
function deduplicateFacts2(facts) {
  const seen = /* @__PURE__ */ new Set();
  return facts.filter((fact) => {
    const key = `${fact.name}:${fact.location.file}:${fact.location.line}:${fact.location.column}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
function deduplicateDynamicAccesses(accesses) {
  const seen = /* @__PURE__ */ new Set();
  return accesses.filter((access) => {
    const key = `${access.location.file}:${access.location.line}:${access.location.column}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// src/scanners/index.ts
async function scanProject(root, config) {
  const discovery = await discoverFiles(root, config);
  const trackedEnvFilesPromise = findTrackedEnvFiles(
    root,
    discovery.secretEnvFiles
  );
  const scans = await Promise.all(
    discovery.files.map(async (file) => {
      const content = await readDiscoveredFile(file);
      if (content === "") {
        return { facts: [], dynamicAccesses: [] };
      }
      if (file.kind === "source") {
        return scanSource(content, file.relativePath);
      }
      if (file.kind === "dotenv-doc") {
        return {
          facts: scanDotenvDocumentation(content, file.relativePath),
          dynamicAccesses: []
        };
      }
      if (file.kind === "dockerfile") {
        return {
          facts: scanDockerfile(content, file.relativePath),
          dynamicAccesses: []
        };
      }
      return {
        facts: scanYamlInfrastructure(content, file.relativePath, file.kind),
        dynamicAccesses: []
      };
    })
  );
  const trackedEnvFiles = await trackedEnvFilesPromise;
  return {
    facts: scans.flatMap((scan) => scan.facts),
    dynamicAccesses: scans.flatMap((scan) => scan.dynamicAccesses),
    filesScanned: discovery.files.length,
    skippedFiles: discovery.skippedFiles,
    trackedEnvFiles
  };
}

// src/types.ts
var RULE_IDS = {
  undocumented: "EVT001",
  staleDocumentation: "EVT002",
  providerOnly: "EVT003",
  trackedEnvFile: "EVT004",
  dynamicAccess: "EVT005",
  duplicateDocumentation: "EVT006"
};

// src/analysis.ts
var DEFAULT_VERSION = "0.1.0";
async function analyze(target = ".", options = {}) {
  const startedAt = performance.now();
  const root = import_node_path6.default.resolve(target);
  const config = options.config ? resolveConfig(options.config) : (await loadConfig(root, options.configPath)).config;
  const scan = await scanProject(root, config);
  const result = analyzeScan(root, scan, config, options.version ?? DEFAULT_VERSION);
  return {
    ...result,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt))
  };
}
function analyzeScan(root, scan, config, version = DEFAULT_VERSION) {
  const facts = scan.facts.filter(
    (fact) => !matchesAnyGlob(fact.name, config.ignore)
  );
  const groups = /* @__PURE__ */ new Map();
  for (const fact of facts) {
    const existing = groups.get(fact.name) ?? [];
    existing.push(fact);
    groups.set(fact.name, existing);
  }
  const variables = stableSort(
    [...groups.entries()].map(
      ([name, variableFacts]) => createVariableNode(name, variableFacts)
    ),
    (variable) => variable.name
  );
  const issues = stableSort(
    createVariableIssues(variables, config).concat(
      createRepositoryIssues(scan, config)
    ),
    (issue) => `${severityOrder(issue.severity)}:${issue.ruleId}:${issue.variable ?? ""}:${issue.locations[0]?.file ?? ""}`
  );
  const summary = createSummary(scan, variables, issues);
  return {
    schemaVersion: 1,
    tool: { name: "envtrail", version },
    root,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    durationMs: 0,
    summary,
    variables,
    issues
  };
}
function createVariableNode(name, facts) {
  const consumers = sortFacts(facts.filter((fact) => fact.role === "consumer"));
  const documentation = sortFacts(
    facts.filter((fact) => fact.role === "documentation")
  );
  const providers = sortFacts(facts.filter((fact) => fact.role === "provider"));
  const status = resolveStatus(consumers, documentation);
  return {
    name,
    sensitive: facts.some((fact) => fact.sensitive),
    status: status ?? "provider-only",
    consumers,
    documentation,
    providers
  };
}
function resolveStatus(consumers, documentation) {
  if (consumers.length > 0 && documentation.length > 0) {
    return "aligned";
  }
  if (consumers.length > 0) {
    return "undocumented";
  }
  if (documentation.length > 0) {
    return "stale";
  }
  return void 0;
}
function createVariableIssues(variables, config) {
  const issues = [];
  for (const variable of variables) {
    if (variable.status === "undocumented") {
      pushIssue(issues, config, "undocumented", {
        variable: variable.name,
        message: `${variable.name} is consumed by code but absent from environment documentation.`,
        hint: `Add ${variable.name}= to .env.example with a safe placeholder and a short comment.`,
        locations: variable.consumers.map((fact) => fact.location)
      });
    }
    if (variable.status === "stale") {
      pushIssue(issues, config, "staleDocumentation", {
        variable: variable.name,
        message: `${variable.name} is documented but no static consumer was found.`,
        hint: `Remove ${variable.name} if obsolete, or add its source pattern to your EnvTrail workflow.`,
        locations: variable.documentation.map((fact) => fact.location)
      });
    }
    if (variable.status === "provider-only") {
      pushIssue(issues, config, "providerOnly", {
        variable: variable.name,
        message: `${variable.name} is supplied by deployment configuration but has no documented consumer.`,
        hint: `Confirm the variable is still needed, then document or remove its deployment wiring.`,
        locations: variable.providers.map((fact) => fact.location)
      });
    }
    const duplicateLocations = duplicateDocumentationLocations(variable);
    if (duplicateLocations.length > 0) {
      pushIssue(issues, config, "duplicateDocumentation", {
        variable: variable.name,
        message: `${variable.name} appears more than once in the same environment template.`,
        hint: `Keep one ${variable.name} entry per template to avoid ambiguous onboarding.`,
        locations: duplicateLocations
      });
    }
  }
  return issues;
}
function createRepositoryIssues(scan, config) {
  const issues = [];
  for (const file of scan.trackedEnvFiles) {
    pushIssue(issues, config, "trackedEnvFile", {
      message: `${file} is tracked by Git even though it may contain live configuration.`,
      hint: `Remove ${file} from Git history if it contains secrets, then add it to .gitignore.`,
      locations: [{ file, line: 1, column: 1 }]
    });
  }
  for (const access of scan.dynamicAccesses) {
    pushIssue(issues, config, "dynamicAccess", {
      message: `A dynamic environment-variable access could not be resolved statically.`,
      hint: `Use a literal variable name or document the dynamic lookup in your project policy.`,
      locations: [access.location]
    });
  }
  return issues;
}
function pushIssue(issues, config, ruleName, details) {
  const setting = config.rules[ruleName];
  if (setting === "off") {
    return;
  }
  issues.push({
    ruleId: RULE_IDS[ruleName],
    ruleName,
    severity: setting,
    ...details
  });
}
function duplicateDocumentationLocations(variable) {
  const byFile = /* @__PURE__ */ new Map();
  for (const fact of variable.documentation) {
    const values = byFile.get(fact.location.file) ?? [];
    values.push(fact);
    byFile.set(fact.location.file, values);
  }
  return [...byFile.values()].filter((facts) => facts.length > 1).flatMap((facts) => facts.map((fact) => fact.location));
}
function createSummary(scan, variables, issues) {
  const countStatus = (status) => variables.filter((variable) => variable.status === status).length;
  const countSeverity = (severity) => issues.filter((issue) => issue.severity === severity).length;
  const consumers = variables.filter(
    (variable) => variable.consumers.length > 0
  );
  const undocumented = countStatus("undocumented");
  const coveragePenalty = consumers.length === 0 ? 0 : Math.round(undocumented / consumers.length * 30);
  const issuePenalty = countSeverity("error") * 12 + countSeverity("warning") * 4 + countSeverity("info");
  return {
    score: Math.max(0, 100 - Math.min(70, issuePenalty) - coveragePenalty),
    filesScanned: scan.filesScanned,
    skippedFiles: scan.skippedFiles,
    variables: variables.length,
    aligned: countStatus("aligned"),
    undocumented,
    stale: countStatus("stale"),
    providerOnly: countStatus("provider-only"),
    errors: countSeverity("error"),
    warnings: countSeverity("warning"),
    info: countSeverity("info")
  };
}
function sortFacts(facts) {
  return [...facts].sort((left, right) => {
    const fileComparison = left.location.file.localeCompare(
      right.location.file,
      "en"
    );
    if (fileComparison !== 0) {
      return fileComparison;
    }
    return left.location.line - right.location.line;
  });
}
function severityOrder(severity) {
  return severity === "error" ? "0" : severity === "warning" ? "1" : "2";
}

// src/reporters/html.ts
var import_node_path7 = __toESM(require("path"), 1);
var STATUS_LABEL = {
  aligned: "Aligned",
  undocumented: "Missing docs",
  stale: "Stale docs",
  "provider-only": "Deploy only"
};
function formatHtml(result) {
  const project = import_node_path7.default.basename(result.root) || result.root;
  const summary = result.summary;
  const generated = new Date(result.generatedAt).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>EnvTrail report \xB7 ${escapeHtml(project)}</title>
  <style>
    :root {
      --ink: #f5f2e8;
      --muted: #9da7a1;
      --panel: #171d1d;
      --panel-2: #202827;
      --line: #323c39;
      --lime: #c9f773;
      --coral: #ff8a5b;
      --sky: #6cc5ff;
      --amber: #f7ca72;
      --bg: #0d1111;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background:
      radial-gradient(circle at 84% 8%, rgba(108,197,255,.10), transparent 26rem),
      radial-gradient(circle at 10% 0%, rgba(201,247,115,.08), transparent 22rem),
      var(--bg); }
    button, input { font: inherit; }
    .shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 30px 0 72px; }
    .nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 760; letter-spacing: -.02em; }
    .brand-mark { display: grid; place-items: center; width: 34px; height: 34px; color: #101412; background: var(--lime); border-radius: 10px 10px 10px 3px; transform: rotate(-4deg); }
    .privacy { color: var(--muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .privacy i { width: 7px; height: 7px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 4px rgba(201,247,115,.10); }
    .hero { display: grid; grid-template-columns: 1.45fr .8fr; gap: 18px; margin-bottom: 18px; }
    .card { background: linear-gradient(145deg, rgba(32,40,39,.96), rgba(20,26,26,.98)); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 24px 70px rgba(0,0,0,.24); }
    .intro { padding: 34px; position: relative; overflow: hidden; }
    .intro::after { content: ""; position: absolute; width: 240px; height: 240px; border-radius: 50%; border: 1px solid rgba(201,247,115,.16); right: -80px; bottom: -150px; box-shadow: 0 0 0 34px rgba(201,247,115,.025), 0 0 0 68px rgba(201,247,115,.018); }
    .eyebrow { color: var(--lime); font-size: 12px; font-weight: 750; letter-spacing: .13em; text-transform: uppercase; }
    h1 { font-size: clamp(34px, 5vw, 58px); line-height: 1; letter-spacing: -.055em; margin: 13px 0 16px; }
    h1 span { color: var(--muted); }
    .lede { color: #bdc6c0; font-size: 16px; line-height: 1.6; max-width: 660px; margin: 0; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; color: var(--muted); font-size: 12px; margin-top: 27px; }
    .score-card { padding: 28px; display: flex; flex-direction: column; justify-content: space-between; }
    .score-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .11em; font-weight: 700; }
    .score { font-size: 70px; letter-spacing: -.08em; line-height: 1; font-weight: 760; margin: 12px 0 5px; color: ${scoreColor(summary.score)}; }
    .score small { font-size: 19px; color: var(--muted); letter-spacing: -.03em; }
    .track { height: 8px; background: #303937; border-radius: 100px; overflow: hidden; }
    .track > span { display: block; width: ${summary.score}%; height: 100%; background: ${scoreColor(summary.score)}; border-radius: inherit; }
    .score-note { color: var(--muted); font-size: 13px; margin: 15px 0 0; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .stat { padding: 20px 22px; }
    .stat strong { display: block; font-size: 27px; letter-spacing: -.04em; margin-bottom: 4px; }
    .stat span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .stat.aligned strong { color: var(--lime); }
    .stat.missing strong { color: var(--coral); }
    .stat.stale strong { color: var(--amber); }
    .stat.deploy strong { color: var(--sky); }
    .workspace { padding: 0; overflow: hidden; }
    .toolbar { padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid var(--line); }
    h2 { font-size: 17px; letter-spacing: -.02em; margin: 0; }
    .controls { display: flex; gap: 9px; align-items: center; }
    .search { width: min(280px, 36vw); border: 1px solid var(--line); border-radius: 10px; background: #111616; color: var(--ink); padding: 9px 12px; outline: none; }
    .search:focus { border-color: var(--lime); box-shadow: 0 0 0 3px rgba(201,247,115,.09); }
    .filter { border: 1px solid var(--line); border-radius: 10px; background: #111616; color: var(--muted); padding: 9px 11px; cursor: pointer; }
    .filter.active { color: #111611; background: var(--lime); border-color: var(--lime); }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; min-width: 720px; }
    th { color: #818d87; text-align: left; font-size: 10px; letter-spacing: .11em; text-transform: uppercase; font-weight: 720; padding: 13px 22px; background: rgba(11,15,15,.46); }
    td { border-top: 1px solid rgba(50,60,57,.7); padding: 16px 22px; font-size: 14px; }
    tr:hover td { background: rgba(255,255,255,.018); }
    .variable { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-weight: 700; letter-spacing: -.02em; }
    .sensitive { margin-left: 7px; color: var(--amber); font-size: 11px; }
    .source { display: flex; align-items: center; gap: 7px; color: var(--muted); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #46514d; }
    .dot.on { background: var(--lime); box-shadow: 0 0 0 3px rgba(201,247,115,.08); }
    .count { font-size: 11px; color: var(--muted); }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 730; }
    .pill.aligned { color: var(--lime); background: rgba(201,247,115,.10); }
    .pill.undocumented { color: var(--coral); background: rgba(255,138,91,.11); }
    .pill.stale { color: var(--amber); background: rgba(247,202,114,.11); }
    .pill.provider-only { color: var(--sky); background: rgba(108,197,255,.11); }
    .findings { margin-top: 18px; padding: 24px; }
    .finding-head { display: flex; align-items: end; justify-content: space-between; margin-bottom: 12px; }
    .finding-head span { color: var(--muted); font-size: 12px; }
    .finding { display: grid; grid-template-columns: auto 1fr; gap: 13px; padding: 17px 0; border-top: 1px solid var(--line); }
    .severity { width: 9px; height: 9px; border-radius: 3px; margin-top: 6px; }
    .severity.error { background: var(--coral); }
    .severity.warning { background: var(--amber); }
    .severity.info { background: var(--sky); }
    .finding-title { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
    .finding-title strong { font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; }
    .finding-title code { color: var(--muted); font-size: 11px; }
    .finding p { color: #c0c8c3; margin: 6px 0; font-size: 13px; line-height: 1.5; }
    .fix { color: var(--muted); font-size: 12px; }
    .fix b { color: var(--lime); font-weight: 650; }
    .empty { color: var(--muted); padding: 34px 0 10px; text-align: center; }
    footer { display: flex; justify-content: space-between; color: #6f7b75; font-size: 11px; margin-top: 18px; padding: 0 4px; }
    @media (max-width: 760px) {
      .shell { width: min(100% - 24px, 1180px); padding-top: 18px; }
      .hero { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr 1fr; }
      .toolbar { align-items: flex-start; flex-direction: column; }
      .controls { width: 100%; overflow-x: auto; padding-bottom: 3px; }
      .search { min-width: 190px; flex: 1; }
      .privacy { display: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <nav class="nav">
      <div class="brand"><span class="brand-mark">\u2197</span> EnvTrail</div>
      <div class="privacy"><i></i> Key names only \xB7 values never read</div>
    </nav>

    <section class="hero">
      <div class="card intro">
        <div class="eyebrow">Configuration provenance report</div>
        <h1>${escapeHtml(project)}<span>.</span></h1>
        <p class="lede">Every environment variable, traced from source code through developer documentation to deployment wiring.</p>
        <div class="meta">
          <span>${summary.filesScanned} files scanned</span>
          <span>${summary.variables} variables mapped</span>
          <span>${result.durationMs}ms analysis</span>
        </div>
      </div>
      <div class="card score-card">
        <div>
          <div class="score-label">Configuration health</div>
          <div class="score">${summary.score}<small>/100</small></div>
        </div>
        <div>
          <div class="track"><span></span></div>
          <p class="score-note">${scoreDescription(summary.score)}</p>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="card stat aligned"><strong>${summary.aligned}</strong><span>Aligned</span></div>
      <div class="card stat missing"><strong>${summary.undocumented}</strong><span>Missing docs</span></div>
      <div class="card stat stale"><strong>${summary.stale}</strong><span>Stale docs</span></div>
      <div class="card stat deploy"><strong>${summary.providerOnly}</strong><span>Deploy only</span></div>
    </section>

    <section class="card workspace">
      <div class="toolbar">
        <h2>Provenance matrix</h2>
        <div class="controls">
          <input id="search" class="search" type="search" placeholder="Search variables\u2026" aria-label="Search variables">
          <button class="filter active" data-status="all">All</button>
          <button class="filter" data-status="undocumented">Drift</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Variable</th><th>Code</th><th>Docs</th><th>Deploy</th><th>Status</th></tr>
          </thead>
          <tbody id="variables">
            ${result.variables.map(variableRow).join("\n")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card findings">
      <div class="finding-head">
        <h2>Findings</h2>
        <span>${summary.errors} errors \xB7 ${summary.warnings} warnings</span>
      </div>
      ${result.issues.length > 0 ? result.issues.map(findingRow).join("\n") : '<div class="empty">No drift found. Your trail is aligned.</div>'}
    </section>

    <footer>
      <span>Generated ${escapeHtml(generated)}</span>
      <span>EnvTrail ${escapeHtml(result.tool.version)}</span>
    </footer>
  </main>
  <script>
    const search = document.querySelector("#search");
    const rows = [...document.querySelectorAll("#variables tr")];
    const filters = [...document.querySelectorAll(".filter")];
    let activeStatus = "all";
    function applyFilters() {
      const query = search.value.trim().toLowerCase();
      for (const row of rows) {
        const nameMatch = row.dataset.name.includes(query);
        const statusMatch = activeStatus === "all" || row.dataset.status === activeStatus;
        row.hidden = !(nameMatch && statusMatch);
      }
    }
    search.addEventListener("input", applyFilters);
    for (const button of filters) {
      button.addEventListener("click", () => {
        activeStatus = button.dataset.status;
        filters.forEach((item) => item.classList.toggle("active", item === button));
        applyFilters();
      });
    }
  </script>
</body>
</html>
`;
}
function variableRow(variable) {
  return `<tr data-name="${escapeHtml(variable.name.toLowerCase())}" data-status="${variable.status}">
  <td><span class="variable">${escapeHtml(variable.name)}</span>${variable.sensitive ? '<span class="sensitive" title="Sensitive-looking name">\u25C6</span>' : ""}</td>
  <td>${sourceCell(variable.consumers.length)}</td>
  <td>${sourceCell(variable.documentation.length)}</td>
  <td>${sourceCell(variable.providers.length)}</td>
  <td><span class="pill ${variable.status}">${STATUS_LABEL[variable.status]}</span></td>
</tr>`;
}
function sourceCell(count) {
  return `<span class="source"><i class="dot ${count > 0 ? "on" : ""}"></i><span class="count">${count || "\u2014"}</span></span>`;
}
function findingRow(issue) {
  const location = issue.locations[0];
  const code = `${issue.ruleId}${issue.variable ? ` \xB7 ${issue.variable}` : ""}`;
  return `<article class="finding">
  <i class="severity ${issue.severity}"></i>
  <div>
    <div class="finding-title"><strong>${escapeHtml(code)}</strong>${location ? `<code>${escapeHtml(location.file)}:${location.line}</code>` : ""}</div>
    <p>${escapeHtml(issue.message)}</p>
    <div class="fix"><b>Fix</b> \xB7 ${escapeHtml(issue.hint)}</div>
  </div>
</article>`;
}
function scoreColor(score) {
  return score >= 90 ? "var(--lime)" : score >= 70 ? "var(--amber)" : "var(--coral)";
}
function scoreDescription(score) {
  if (score >= 90) {
    return "Your configuration trail is in excellent shape.";
  }
  if (score >= 70) {
    return "A few gaps are keeping the trail from being complete.";
  }
  return "Resolve the highlighted drift before the next deployment.";
}

// src/reporters/json.ts
function formatJson(result) {
  return `${JSON.stringify(result, null, 2)}
`;
}

// src/reporters/markdown.ts
var STATUS_ICON = {
  aligned: "\u2705",
  undocumented: "\u274C",
  stale: "\u26A0\uFE0F",
  "provider-only": "\u26A0\uFE0F"
};
function formatMarkdown(result) {
  const lines = [
    "# EnvTrail report",
    "",
    `**Configuration health: ${result.summary.score}/100** \xB7 ${result.summary.variables} variables across ${result.summary.filesScanned} files`,
    "",
    "| Variable | Code | Docs | Deploy | Status |",
    "| --- | :---: | :---: | :---: | --- |"
  ];
  for (const variable of result.variables) {
    lines.push(
      `| \`${escapeMarkdown(variable.name)}\` | ${mark(variable.consumers.length)} | ${mark(variable.documentation.length)} | ${mark(variable.providers.length)} | ${STATUS_ICON[variable.status]} ${variable.status} |`
    );
  }
  lines.push("", "## Findings", "");
  if (result.issues.length === 0) {
    lines.push("No findings. Your environment-variable trail is aligned.");
  } else {
    for (const issue of result.issues) {
      const location = issue.locations[0];
      lines.push(
        `- **${issue.severity.toUpperCase()} ${issue.ruleId}** \u2014 ${issue.message}${location ? ` (\`${location.file}:${location.line}\`)` : ""}`,
        `  - Fix: ${issue.hint}`
      );
    }
  }
  lines.push(
    "",
    `_<sub>Generated by EnvTrail ${result.tool.version}. Values are never included in reports.</sub>_`,
    ""
  );
  return lines.join("\n");
}
function mark(count) {
  return count > 0 ? `\u25CF ${count}` : "\u2014";
}
function escapeMarkdown(value) {
  return value.replaceAll("|", "\\|").replaceAll("`", "\\`");
}

// src/reporters/sarif.ts
var RULES = {
  EVT001: {
    name: "undocumented-variable",
    shortDescription: "A consumed environment variable is undocumented.",
    help: "Add the variable key and a safe placeholder to an environment template."
  },
  EVT002: {
    name: "stale-documentation",
    shortDescription: "A documented environment variable has no static consumer.",
    help: "Remove obsolete documentation or verify that the access is dynamic."
  },
  EVT003: {
    name: "provider-only-variable",
    shortDescription: "Deployment supplies a variable with no documented consumer.",
    help: "Document the variable or remove stale deployment wiring."
  },
  EVT004: {
    name: "tracked-env-file",
    shortDescription: "A potentially secret environment file is tracked by Git.",
    help: "Remove live environment files from version control and rotate exposed secrets."
  },
  EVT005: {
    name: "dynamic-environment-access",
    shortDescription: "A dynamic environment lookup cannot be resolved statically.",
    help: "Prefer literal environment-variable names or document the dynamic lookup."
  },
  EVT006: {
    name: "duplicate-documentation",
    shortDescription: "An environment template defines the same key more than once.",
    help: "Keep a single declaration for each key in a template."
  }
};
function formatSarif(result) {
  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "EnvTrail",
            semanticVersion: result.tool.version,
            informationUri: "https://github.com/aryatech13/envtrail",
            rules: Object.entries(RULES).map(([id, rule]) => ({
              id,
              name: rule.name,
              shortDescription: { text: rule.shortDescription },
              help: { text: rule.help }
            }))
          }
        },
        results: result.issues.map((issue) => ({
          ruleId: issue.ruleId,
          level: sarifLevel(issue.severity),
          message: { text: issue.message },
          locations: issue.locations.slice(0, 10).map((location) => ({
            physicalLocation: {
              artifactLocation: { uri: location.file },
              region: {
                startLine: location.line,
                startColumn: location.column
              }
            }
          })),
          properties: {
            ...issue.variable ? { variable: issue.variable } : {},
            hint: issue.hint
          }
        }))
      }
    ]
  };
  return `${JSON.stringify(sarif, null, 2)}
`;
}
function sarifLevel(severity) {
  return severity === "info" ? "note" : severity;
}

// src/reporters/terminal.ts
var import_node_path8 = __toESM(require("path"), 1);
var import_picocolors = __toESM(require("picocolors"), 1);
var STATUS_LABEL2 = {
  aligned: "aligned",
  undocumented: "missing docs",
  stale: "stale docs",
  "provider-only": "deploy only"
};
function formatTerminal(result, options = {}) {
  const colors = import_picocolors.default.createColors(options.color ?? import_picocolors.default.isColorSupported);
  const lines = [];
  const summary = result.summary;
  const rootLabel = import_node_path8.default.basename(result.root) || result.root;
  lines.push("");
  lines.push(
    `${colors.bold(colors.green("\u25C6 EnvTrail"))}  ${colors.dim("configuration provenance")}`
  );
  lines.push(colors.dim(`  ${rootLabel} \xB7 ${summary.filesScanned} files scanned`));
  lines.push("");
  const scoreLabel = summary.score >= 90 ? colors.green("healthy") : summary.score >= 70 ? colors.yellow("needs attention") : colors.red("drift detected");
  lines.push(
    `  ${colors.bold(scoreColor2(summary.score, `${summary.score}/100`, colors))}  ${scoreLabel}`
  );
  lines.push(
    `  ${colors.green(`${summary.aligned} aligned`)}  ${colors.red(`${summary.undocumented} undocumented`)}  ${colors.yellow(`${summary.stale} stale`)}  ${colors.cyan(`${summary.providerOnly} deploy-only`)}`
  );
  lines.push("");
  if (result.variables.length > 0) {
    lines.push(colors.bold("  Provenance matrix"));
    lines.push(
      colors.dim(
        `  ${"VARIABLE".padEnd(28)} ${"CODE".padStart(4)}  ${"DOCS".padStart(4)}  ${"DEPLOY".padStart(6)}  STATUS`
      )
    );
    for (const variable of result.variables.slice(0, 24)) {
      const rawName = variable.sensitive ? `${variable.name} \u25C8` : variable.name;
      const name = rawName.length > 27 ? `${rawName.slice(0, 26)}\u2026` : rawName.padEnd(28);
      const code = marker(variable.consumers.length, colors);
      const docs = marker(variable.documentation.length, colors);
      const deploy = marker(variable.providers.length, colors);
      lines.push(
        `  ${colors.bold(name)} ${code.padStart(4)}  ${docs.padStart(4)}  ${deploy.padStart(6)}  ${statusColor(variable.status, STATUS_LABEL2[variable.status], colors)}`
      );
    }
    if (result.variables.length > 24) {
      lines.push(
        colors.dim(`  \u2026 ${result.variables.length - 24} more variables`)
      );
    }
    lines.push("");
  }
  if (result.issues.length === 0) {
    lines.push(`  ${colors.green("\u2713")} No configuration drift found.`);
  } else {
    lines.push(
      colors.bold(
        `  Findings \xB7 ${plural(summary.errors, "error")}, ${plural(summary.warnings, "warning")}`
      )
    );
    const visibleIssues = options.details === false ? result.issues.slice(0, 6) : result.issues.slice(0, 16);
    for (const issue of visibleIssues) {
      lines.push(...formatIssue(issue, colors));
    }
    if (result.issues.length > visibleIssues.length) {
      lines.push(
        colors.dim(`    \u2026 ${result.issues.length - visibleIssues.length} more findings`)
      );
    }
  }
  lines.push("");
  lines.push(
    colors.dim(
      `  ${summary.variables} variables \xB7 ${result.durationMs}ms \xB7 \u25C8 sensitive name (values never read)`
    )
  );
  lines.push("");
  return lines.join("\n");
}
function formatIssue(issue, colors) {
  const location = issue.locations[0];
  const prefix = issue.severity === "error" ? colors.red("\u2715") : issue.severity === "warning" ? colors.yellow("\u25B2") : colors.cyan("\u25CF");
  const label = `${issue.ruleId}${issue.variable ? ` ${issue.variable}` : ""}`;
  const locationLabel = location ? colors.dim(` ${location.file}:${location.line}`) : "";
  return [
    "",
    `  ${prefix} ${colors.bold(label)}${locationLabel}`,
    `    ${issue.message}`,
    `    ${colors.dim("fix")} ${issue.hint}`
  ];
}
function marker(count, colors) {
  return count > 0 ? colors.green(`\u25CF${count}`) : colors.dim("\u2014");
}
function statusColor(status, label, colors) {
  if (status === "aligned") {
    return colors.green(label);
  }
  if (status === "undocumented") {
    return colors.red(label);
  }
  if (status === "stale") {
    return colors.yellow(label);
  }
  return colors.cyan(label);
}
function scoreColor2(score, label, colors) {
  if (score >= 90) {
    return colors.green(label);
  }
  if (score >= 70) {
    return colors.yellow(label);
  }
  return colors.red(label);
}
function shouldFail(result, threshold) {
  if (threshold === "never") {
    return false;
  }
  if (threshold === "warning") {
    return result.summary.errors > 0 || result.summary.warnings > 0;
  }
  return result.summary.errors > 0;
}

// src/action.ts
async function main() {
  const target = input("path") || ".";
  const configPath = input("config") || void 0;
  const format = parseFormat(input("format") || "terminal");
  const threshold = parseThreshold(input("fail-on") || "error");
  const reportPath = input("report");
  const result = await analyze(target, configPath ? { configPath } : {});
  if (format === "json") {
    import_node_process.default.stdout.write(formatJson(result));
  } else if (format === "sarif") {
    import_node_process.default.stdout.write(formatSarif(result));
  } else if (format === "markdown") {
    import_node_process.default.stdout.write(formatMarkdown(result));
  } else {
    import_node_process.default.stdout.write(formatTerminal(result, { color: true }));
  }
  for (const issue of result.issues) {
    const location = issue.locations[0];
    const level = issue.severity === "info" ? "notice" : issue.severity;
    emitCommand(
      level,
      {
        ...location ? {
          file: location.file,
          line: String(location.line),
          col: String(location.column)
        } : {},
        title: `${issue.ruleId}${issue.variable ? ` \xB7 ${issue.variable}` : ""}`
      },
      issue.message
    );
  }
  if (reportPath) {
    const resolved = import_node_path9.default.resolve(reportPath);
    await (0, import_promises3.mkdir)(import_node_path9.default.dirname(resolved), { recursive: true });
    await (0, import_promises3.writeFile)(resolved, formatHtml(result), "utf8");
  }
  await setOutput("score", String(result.summary.score));
  await setOutput("issues", String(result.issues.length));
  await setOutput("errors", String(result.summary.errors));
  if (shouldFail(result, threshold)) {
    import_node_process.default.exitCode = 1;
  }
}
function input(name) {
  return import_node_process.default.env[`INPUT_${name.replaceAll("-", "_").toUpperCase()}`]?.trim() ?? "";
}
function parseFormat(value) {
  if (value === "terminal" || value === "json" || value === "sarif" || value === "markdown") {
    return value;
  }
  throw new Error(`Unsupported format: ${value}`);
}
function parseThreshold(value) {
  if (value === "error" || value === "warning" || value === "never") {
    return value;
  }
  throw new Error(`Unsupported fail-on value: ${value}`);
}
function emitCommand(command, properties, message) {
  const serialized = Object.entries(properties).map(([key, value]) => `${key}=${escapeProperty(value)}`).join(",");
  import_node_process.default.stdout.write(
    `::${command}${serialized ? ` ${serialized}` : ""}::${escapeData(message)}
`
  );
}
async function setOutput(name, value) {
  const outputFile = import_node_process.default.env.GITHUB_OUTPUT;
  if (outputFile) {
    await (0, import_promises3.appendFile)(outputFile, `${name}=${value}
`, "utf8");
  } else {
    emitCommand("set-output", { name }, value);
  }
}
function escapeData(value) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}
function escapeProperty(value) {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  emitCommand("error", { title: "EnvTrail failed" }, message);
  import_node_process.default.exitCode = 2;
});
//# sourceMappingURL=action.cjs.map