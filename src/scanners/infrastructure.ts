import path from "node:path";
import { parseAllDocuments } from "yaml";
import type { Adapter, VariableFact } from "../types.js";
import { escapeRegExp, isSensitiveName, locationForMatch } from "../utils.js";

export function scanDockerfile(
  content: string,
  relativePath: string
): VariableFact[] {
  const facts: VariableFact[] = [];
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

export function scanYamlInfrastructure(
  content: string,
  relativePath: string,
  kind: "compose" | "ci" | "kubernetes"
): VariableFact[] {
  const facts: VariableFact[] = [];
  const documents = parseAllDocuments(content);

  for (const document of documents) {
    if (document.errors.length > 0) {
      continue;
    }
    const value = document.toJS({ maxAliasCount: 100 }) as unknown;
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

function collectCompose(
  value: unknown,
  facts: VariableFact[],
  content: string,
  relativePath: string
): void {
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

function collectCi(
  value: unknown,
  facts: VariableFact[],
  content: string,
  relativePath: string,
  adapter: "github-actions" | "gitlab-ci"
): void {
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

function collectKubernetes(
  value: unknown,
  facts: VariableFact[],
  content: string,
  relativePath: string
): void {
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

function ciAdapter(
  relativePath: string
): "github-actions" | "gitlab-ci" {
  return path.basename(relativePath).toLowerCase() === ".gitlab-ci.yml"
    ? "gitlab-ci"
    : "github-actions";
}

function yamlProviderFact(
  name: string,
  adapter: Adapter,
  relativePath: string,
  content: string,
  detail: string
): VariableFact {
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

function providerFact(
  name: string,
  adapter: Adapter,
  relativePath: string,
  line: number,
  index: number,
  detail: string
): VariableFact {
  return {
    name,
    role: "provider",
    adapter,
    location: locationForMatch(relativePath, line, Math.max(0, index)),
    detail,
    sensitive: isSensitiveName(name)
  };
}

function findYamlLocation(
  content: string,
  relativePath: string,
  name: string
): VariableFact["location"] {
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

function walk(
  value: unknown,
  visitor: (key: string, child: unknown) => void
): void {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deduplicateFacts(facts: VariableFact[]): VariableFact[] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.name}:${fact.adapter}:${fact.location.file}:${fact.location.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
