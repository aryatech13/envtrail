import type { VariableFact } from "../types.js";
import { isSensitiveName, locationForMatch } from "../utils.js";

export function scanDotenvDocumentation(
  content: string,
  relativePath: string
): VariableFact[] {
  const facts: VariableFact[] = [];
  const lines = content.split(/\r?\n/u);
  let pendingDescription: string[] = [];

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
      ...(description ? { description } : {}),
      sensitive: isSensitiveName(name)
    });
    pendingDescription = [];
  }

  return facts;
}
