import path from "node:path";
import type { SourceLocation } from "./types.js";

const SENSITIVE_NAME =
  /(?:^|_)(?:API_?KEY|AUTH|CREDENTIALS?|PASSWORD|PRIVATE|SECRET|TOKEN)(?:_|$)/i;

export function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME.test(name);
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function locationForMatch(
  file: string,
  line: number,
  index: number
): SourceLocation {
  return { file, line, column: index + 1 };
}

export function matchesAnyGlob(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(value));
}

export function globToRegExp(pattern: string): RegExp {
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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function stableSort<T>(values: T[], selector: (item: T) => string): T[] {
  return [...values].sort((left, right) =>
    selector(left).localeCompare(selector(right), "en")
  );
}
