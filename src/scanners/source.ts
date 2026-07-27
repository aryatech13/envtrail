import path from "node:path";
import type {
  Adapter,
  DynamicAccess,
  VariableFact
} from "../types.js";
import { isSensitiveName, locationForMatch } from "../utils.js";

interface StaticPattern {
  adapter: Adapter;
  expression: RegExp;
  label: string;
}

interface DynamicPattern {
  adapter: Adapter;
  expression: RegExp;
}

const STATIC_PATTERNS: StaticPattern[] = [
  {
    adapter: "javascript",
    expression: /\b(?:process|Bun)\.env\.([A-Za-z_][A-Za-z0-9_]*)/gu,
    label: "property access"
  },
  {
    adapter: "javascript",
    expression:
      /\b(?:process|Bun)\.env\[\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\]/gu,
    label: "indexed access"
  },
  {
    adapter: "javascript",
    expression: /\bimport\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/gu,
    label: "import.meta access"
  },
  {
    adapter: "javascript",
    expression:
      /\bDeno\.env\.(?:get|has)\(\s*["'`]([A-Za-z_][A-Za-z0-9_]*)["'`]\s*\)/gu,
    label: "Deno env access"
  },
  {
    adapter: "python",
    expression:
      /\bos\.environ(?:\.get)?\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/gu,
    label: "os.environ call"
  },
  {
    adapter: "python",
    expression:
      /\bos\.environ\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/gu,
    label: "os.environ access"
  },
  {
    adapter: "python",
    expression: /\bos\.getenv\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/gu,
    label: "os.getenv access"
  },
  {
    adapter: "go",
    expression:
      /\bos\.(?:Getenv|LookupEnv)\(\s*["`]([A-Za-z_][A-Za-z0-9_]*)["`]\s*\)/gu,
    label: "os env access"
  },
  {
    adapter: "rust",
    expression:
      /(?:std::)?env::var\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "std::env access"
  },
  {
    adapter: "rust",
    expression:
      /\b(?:option_env|env)!\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
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
    expression:
      /\$_ENV\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\]/gu,
    label: "$_ENV access"
  },
  {
    adapter: "java",
    expression:
      /\bSystem\.getenv\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "System.getenv access"
  },
  {
    adapter: "dotnet",
    expression:
      /\bEnvironment\.GetEnvironmentVariable\(\s*"([A-Za-z_][A-Za-z0-9_]*)"\s*\)/gu,
    label: "Environment access"
  }
];

const DYNAMIC_PATTERNS: DynamicPattern[] = [
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

const SOURCE_ADAPTER_BY_EXTENSION: Record<string, Adapter> = {
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

export function scanSource(
  content: string,
  relativePath: string
): { facts: VariableFact[]; dynamicAccesses: DynamicAccess[] } {
  const facts: VariableFact[] = [];
  const dynamicAccesses: DynamicAccess[] = [];
  const extension = path.extname(relativePath).toLowerCase();
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
    facts: deduplicateFacts(facts),
    dynamicAccesses: deduplicateDynamicAccesses(dynamicAccesses)
  };
}

function scanJavaScriptDestructuring(
  line: string,
  relativePath: string,
  lineNumber: number
): VariableFact[] {
  const match = /\{([^}]+)\}\s*=\s*(?:process|Bun)\.env\b/u.exec(line);
  if (!match?.[1]) {
    return [];
  }

  const facts: VariableFact[] = [];
  for (const part of match[1].split(",")) {
    const candidate = part
      .trim()
      .split(/[:=]/u)[0]
      ?.trim();
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

function scanShell(
  line: string,
  relativePath: string,
  lineNumber: number
): VariableFact[] {
  if (/^\s*(?:export\s+)?[A-Z_][A-Z0-9_]*=/u.test(line)) {
    return [];
  }

  const expression = /\$(?:\{([A-Z_][A-Z0-9_]*)[^}]*\}|([A-Z_][A-Z0-9_]*))/gu;
  const facts: VariableFact[] = [];
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

function deduplicateFacts(facts: VariableFact[]): VariableFact[] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.name}:${fact.location.file}:${fact.location.line}:${fact.location.column}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function deduplicateDynamicAccesses(
  accesses: DynamicAccess[]
): DynamicAccess[] {
  const seen = new Set<string>();
  return accesses.filter((access) => {
    const key = `${access.location.file}:${access.location.line}:${access.location.column}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
