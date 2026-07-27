import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import pc from "picocolors";
import { analyze } from "./analysis.js";
import { formatHtml } from "./reporters/html.js";
import { formatJson } from "./reporters/json.js";
import { formatMarkdown } from "./reporters/markdown.js";
import { formatSarif } from "./reporters/sarif.js";
import { formatTerminal, shouldFail } from "./reporters/terminal.js";
import type {
  AnalysisResult,
  FailureThreshold,
  OutputFormat,
  VariableFact
} from "./types.js";

const VERSION = "0.1.0";
const COMMANDS = new Set(["check", "report", "explain", "init"]);

interface CommonOptions {
  config?: string;
  color: boolean;
  quiet: boolean;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  try {
    if (argv.includes("--version") || argv.includes("-v")) {
      process.stdout.write(`${VERSION}\n`);
      return 0;
    }
    if (argv.includes("--help") || argv.includes("-h")) {
      process.stdout.write(helpText());
      return 0;
    }

    const first = argv[0];
    const command = first && COMMANDS.has(first) ? first : "check";
    const commandArgs = command === first ? argv.slice(1) : argv;

    if (command === "init") {
      return runInit(commandArgs);
    }
    if (command === "explain") {
      return runExplain(commandArgs);
    }
    if (command === "report") {
      return runReport(commandArgs);
    }
    return runCheck(commandArgs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${pc.red("EnvTrail error:")} ${message}\n`);
    return 2;
  }
}

async function runCheck(args: string[]): Promise<number> {
  const parsed = parseArgs({
    args,
    options: {
      format: { type: "string", short: "f", default: "terminal" },
      output: { type: "string", short: "o" },
      config: { type: "string", short: "c" },
      "fail-on": { type: "string", default: "error" },
      "no-color": { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false }
    },
    allowPositionals: true,
    strict: true
  });
  const root = parsed.positionals[0] ?? ".";
  assertNoExtraPositionals(parsed.positionals, 1);
  const common = commonOptions(parsed.values);
  const format = parseFormat(parsed.values.format);
  const threshold = parseThreshold(parsed.values["fail-on"]);
  const result = await analyze(
    root,
    common.config ? { configPath: common.config } : {}
  );
  const output = renderFormat(result, format, common.color);

  if (parsed.values.output) {
    await writeOutput(parsed.values.output, output);
    if (!common.quiet) {
      process.stdout.write(
        `${pc.green("✓")} Wrote ${format} report to ${parsed.values.output}\n`
      );
    }
  } else if (!common.quiet) {
    process.stdout.write(output);
  }
  return shouldFail(result, threshold) ? 1 : 0;
}

async function runReport(args: string[]): Promise<number> {
  const parsed = parseArgs({
    args,
    options: {
      output: {
        type: "string",
        short: "o",
        default: "envtrail-report.html"
      },
      config: { type: "string", short: "c" },
      "no-color": { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false }
    },
    allowPositionals: true,
    strict: true
  });
  const root = parsed.positionals[0] ?? ".";
  assertNoExtraPositionals(parsed.positionals, 1);
  const common = commonOptions(parsed.values);
  const result = await analyze(
    root,
    common.config ? { configPath: common.config } : {}
  );
  const outputPath = parsed.values.output ?? "envtrail-report.html";
  await writeOutput(outputPath, formatHtml(result));

  if (!common.quiet) {
    process.stdout.write(
      `${pc.green("✓")} Interactive report written to ${outputPath}\n`
    );
    process.stdout.write(
      `  ${result.summary.score}/100 · ${result.summary.variables} variables · ${result.issues.length} findings\n`
    );
  }
  return 0;
}

async function runExplain(args: string[]): Promise<number> {
  const parsed = parseArgs({
    args,
    options: {
      config: { type: "string", short: "c" },
      json: { type: "boolean", default: false },
      "no-color": { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false }
    },
    allowPositionals: true,
    strict: true
  });
  const name = parsed.positionals[0];
  const root = parsed.positionals[1] ?? ".";
  if (!name) {
    throw new Error("Usage: envtrail explain VARIABLE [path]");
  }
  assertNoExtraPositionals(parsed.positionals, 2);
  const common = commonOptions(parsed.values);
  const result = await analyze(
    root,
    common.config ? { configPath: common.config } : {}
  );
  const variable = result.variables.find((item) => item.name === name);
  if (!variable) {
    process.stderr.write(`No static trail found for ${name}.\n`);
    return 1;
  }

  if (!common.quiet) {
    if (parsed.values.json) {
      process.stdout.write(`${JSON.stringify(variable, null, 2)}\n`);
    } else {
      process.stdout.write(formatExplanation(variable, common.color));
    }
  }
  return 0;
}

async function runInit(args: string[]): Promise<number> {
  const parsed = parseArgs({
    args,
    options: {
      force: { type: "boolean", default: false }
    },
    allowPositionals: true,
    strict: true
  });
  const root = path.resolve(parsed.positionals[0] ?? ".");
  assertNoExtraPositionals(parsed.positionals, 1);
  const destination = path.join(root, ".envtrailrc.json");
  if (existsSync(destination) && !parsed.values.force) {
    throw new Error(
      `.envtrailrc.json already exists. Use --force to replace it.`
    );
  }
  const template = {
    $schema:
      "https://raw.githubusercontent.com/aryatech13/envtrail/main/envtrail.schema.json",
    exclude: ["**/generated/**"],
    ignore: ["INTERNAL_*"],
    rules: {
      undocumented: "error",
      staleDocumentation: "warning",
      providerOnly: "warning"
    }
  };
  await mkdir(root, { recursive: true });
  await writeFile(destination, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  process.stdout.write(`${pc.green("✓")} Created ${destination}\n`);
  return 0;
}

function renderFormat(
  result: AnalysisResult,
  format: OutputFormat,
  color: boolean
): string {
  if (format === "json") {
    return formatJson(result);
  }
  if (format === "sarif") {
    return formatSarif(result);
  }
  if (format === "markdown") {
    return formatMarkdown(result);
  }
  return formatTerminal(result, { color });
}

function formatExplanation(
  variable: AnalysisResult["variables"][number],
  color: boolean
): string {
  const colors = pc.createColors(color);
  const lines = [
    "",
    `${colors.bold(colors.green("◆ EnvTrail"))}  ${colors.bold(variable.name)}${variable.sensitive ? colors.yellow(" ◈") : ""}`,
    `  status  ${variable.status}`,
    ""
  ];
  lines.push(...factGroup("Consumed in code", variable.consumers, colors.dim));
  lines.push(
    ...factGroup("Documented in", variable.documentation, colors.dim)
  );
  lines.push(...factGroup("Supplied by", variable.providers, colors.dim));
  lines.push("");
  return lines.join("\n");
}

function factGroup(
  label: string,
  facts: VariableFact[],
  dim: (value: string) => string
): string[] {
  if (facts.length === 0) {
    return [`  ${label.padEnd(16)} ${dim("—")}`];
  }
  return facts.map(
    (fact, index) =>
      `  ${(index === 0 ? label : "").padEnd(16)} ${fact.location.file}:${fact.location.line} ${dim(`(${fact.adapter})`)}`
  );
}

async function writeOutput(destination: string, content: string): Promise<void> {
  const resolved = path.resolve(destination);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, content, "utf8");
}

function commonOptions(values: {
  config?: string;
  "no-color"?: boolean;
  quiet?: boolean;
}): CommonOptions {
  return {
    ...(values.config ? { config: values.config } : {}),
    color:
      values["no-color"] !== true &&
      process.env.NO_COLOR === undefined &&
      process.stdout.isTTY === true,
    quiet: values.quiet === true
  };
}

function parseFormat(value: string | undefined): OutputFormat {
  if (
    value === "terminal" ||
    value === "json" ||
    value === "sarif" ||
    value === "markdown"
  ) {
    return value;
  }
  throw new Error(`Unknown format "${value}". Use terminal, json, sarif, or markdown.`);
}

function parseThreshold(value: string | undefined): FailureThreshold {
  if (value === "error" || value === "warning" || value === "never") {
    return value;
  }
  throw new Error(`Unknown failure threshold "${value}". Use error, warning, or never.`);
}

function assertNoExtraPositionals(
  positionals: string[],
  allowed: number
): void {
  if (positionals.length > allowed) {
    throw new Error(`Unexpected argument: ${positionals[allowed]}`);
  }
}

function helpText(): string {
  return `
EnvTrail ${VERSION} — trace environment variables from code to deployment

Usage
  envtrail check [path] [options]       Analyze configuration drift
  envtrail report [path] [options]      Write a standalone HTML dashboard
  envtrail explain VARIABLE [path]      Show one variable's complete trail
  envtrail init [path]                  Create .envtrailrc.json

Check options
  -f, --format <type>    terminal | json | sarif | markdown
  -o, --output <file>    Write output to a file
  -c, --config <file>    Use a specific JSON config
      --fail-on <level>  error | warning | never (default: error)
      --no-color         Disable ANSI colors
  -q, --quiet            Suppress normal output

Report options
  -o, --output <file>    Destination (default: envtrail-report.html)

Global
  -h, --help             Show help
  -v, --version          Show version

Examples
  npx envtrail check .
  npx envtrail check . --format sarif --output envtrail.sarif
  npx envtrail report . --output configuration.html
  npx envtrail explain DATABASE_URL
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
