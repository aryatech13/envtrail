import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { analyze } from "./analysis.js";
import { formatHtml } from "./reporters/html.js";
import { formatJson } from "./reporters/json.js";
import { formatMarkdown } from "./reporters/markdown.js";
import { formatSarif } from "./reporters/sarif.js";
import { formatTerminal, shouldFail } from "./reporters/terminal.js";
import type { FailureThreshold, OutputFormat } from "./types.js";

async function main(): Promise<void> {
  const target = input("path") || ".";
  const configPath = input("config") || undefined;
  const format = parseFormat(input("format") || "terminal");
  const threshold = parseThreshold(input("fail-on") || "error");
  const reportPath = input("report");
  const result = await analyze(target, configPath ? { configPath } : {});

  if (format === "json") {
    process.stdout.write(formatJson(result));
  } else if (format === "sarif") {
    process.stdout.write(formatSarif(result));
  } else if (format === "markdown") {
    process.stdout.write(formatMarkdown(result));
  } else {
    process.stdout.write(formatTerminal(result, { color: true }));
  }

  for (const issue of result.issues) {
    const location = issue.locations[0];
    const level = issue.severity === "info" ? "notice" : issue.severity;
    emitCommand(
      level,
      {
        ...(location
          ? {
              file: location.file,
              line: String(location.line),
              col: String(location.column)
            }
          : {}),
        title: `${issue.ruleId}${issue.variable ? ` · ${issue.variable}` : ""}`
      },
      issue.message
    );
  }

  if (reportPath) {
    const resolved = path.resolve(reportPath);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, formatHtml(result), "utf8");
  }

  await setOutput("score", String(result.summary.score));
  await setOutput("issues", String(result.issues.length));
  await setOutput("errors", String(result.summary.errors));

  if (shouldFail(result, threshold)) {
    process.exitCode = 1;
  }
}

function input(name: string): string {
  return process.env[`INPUT_${name.replaceAll("-", "_").toUpperCase()}`]?.trim() ?? "";
}

function parseFormat(value: string): OutputFormat {
  if (
    value === "terminal" ||
    value === "json" ||
    value === "sarif" ||
    value === "markdown"
  ) {
    return value;
  }
  throw new Error(`Unsupported format: ${value}`);
}

function parseThreshold(value: string): FailureThreshold {
  if (value === "error" || value === "warning" || value === "never") {
    return value;
  }
  throw new Error(`Unsupported fail-on value: ${value}`);
}

function emitCommand(
  command: string,
  properties: Record<string, string>,
  message: string
): void {
  const serialized = Object.entries(properties)
    .map(([key, value]) => `${key}=${escapeProperty(value)}`)
    .join(",");
  process.stdout.write(
    `::${command}${serialized ? ` ${serialized}` : ""}::${escapeData(message)}\n`
  );
}

async function setOutput(name: string, value: string): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    await appendFile(outputFile, `${name}=${value}\n`, "utf8");
  } else {
    emitCommand("set-output", { name }, value);
  }
}

function escapeData(value: string): string {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  emitCommand("error", { title: "EnvTrail failed" }, message);
  process.exitCode = 2;
});
