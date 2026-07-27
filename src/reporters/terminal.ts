import path from "node:path";
import pc from "picocolors";
import type {
  AnalysisResult,
  Issue,
  Severity,
  TerminalOptions,
  VariableStatus
} from "../types.js";
import { plural } from "../utils.js";

const STATUS_LABEL: Record<VariableStatus, string> = {
  aligned: "aligned",
  undocumented: "missing docs",
  stale: "stale docs",
  "provider-only": "deploy only"
};

export function formatTerminal(
  result: AnalysisResult,
  options: TerminalOptions = {}
): string {
  const colors = pc.createColors(options.color ?? pc.isColorSupported);
  const lines: string[] = [];
  const summary = result.summary;
  const rootLabel = path.basename(result.root) || result.root;

  lines.push("");
  lines.push(
    `${colors.bold(colors.green("◆ EnvTrail"))}  ${colors.dim("configuration provenance")}`
  );
  lines.push(colors.dim(`  ${rootLabel} · ${summary.filesScanned} files scanned`));
  lines.push("");

  const scoreLabel =
    summary.score >= 90
      ? colors.green("healthy")
      : summary.score >= 70
        ? colors.yellow("needs attention")
        : colors.red("drift detected");
  lines.push(
    `  ${colors.bold(scoreColor(summary.score, `${summary.score}/100`, colors))}  ${scoreLabel}`
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
      const rawName = variable.sensitive ? `${variable.name} ◈` : variable.name;
      const name =
        rawName.length > 27 ? `${rawName.slice(0, 26)}…` : rawName.padEnd(28);
      const code = marker(variable.consumers.length, colors);
      const docs = marker(variable.documentation.length, colors);
      const deploy = marker(variable.providers.length, colors);
      lines.push(
        `  ${colors.bold(name)} ${code.padStart(4)}  ${docs.padStart(4)}  ${deploy.padStart(6)}  ${statusColor(variable.status, STATUS_LABEL[variable.status], colors)}`
      );
    }
    if (result.variables.length > 24) {
      lines.push(
        colors.dim(`  … ${result.variables.length - 24} more variables`)
      );
    }
    lines.push("");
  }

  if (result.issues.length === 0) {
    lines.push(`  ${colors.green("✓")} No configuration drift found.`);
  } else {
    lines.push(
      colors.bold(
        `  Findings · ${plural(summary.errors, "error")}, ${plural(summary.warnings, "warning")}`
      )
    );
    const visibleIssues =
      options.details === false ? result.issues.slice(0, 6) : result.issues.slice(0, 16);
    for (const issue of visibleIssues) {
      lines.push(...formatIssue(issue, colors));
    }
    if (result.issues.length > visibleIssues.length) {
      lines.push(
        colors.dim(`    … ${result.issues.length - visibleIssues.length} more findings`)
      );
    }
  }

  lines.push("");
  lines.push(
    colors.dim(
      `  ${summary.variables} variables · ${result.durationMs}ms · ◈ sensitive name (values never read)`
    )
  );
  lines.push("");
  return lines.join("\n");
}

function formatIssue(
  issue: Issue,
  colors: ReturnType<typeof pc.createColors>
): string[] {
  const location = issue.locations[0];
  const prefix =
    issue.severity === "error"
      ? colors.red("✕")
      : issue.severity === "warning"
        ? colors.yellow("▲")
        : colors.cyan("●");
  const label = `${issue.ruleId}${issue.variable ? ` ${issue.variable}` : ""}`;
  const locationLabel = location
    ? colors.dim(` ${location.file}:${location.line}`)
    : "";

  return [
    "",
    `  ${prefix} ${colors.bold(label)}${locationLabel}`,
    `    ${issue.message}`,
    `    ${colors.dim("fix")} ${issue.hint}`
  ];
}

function marker(
  count: number,
  colors: ReturnType<typeof pc.createColors>
): string {
  return count > 0 ? colors.green(`●${count}`) : colors.dim("—");
}

function statusColor(
  status: VariableStatus,
  label: string,
  colors: ReturnType<typeof pc.createColors>
): string {
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

function scoreColor(
  score: number,
  label: string,
  colors: ReturnType<typeof pc.createColors>
): string {
  if (score >= 90) {
    return colors.green(label);
  }
  if (score >= 70) {
    return colors.yellow(label);
  }
  return colors.red(label);
}

export function shouldFail(
  result: AnalysisResult,
  threshold: "error" | "warning" | "never"
): boolean {
  if (threshold === "never") {
    return false;
  }
  if (threshold === "warning") {
    return result.summary.errors > 0 || result.summary.warnings > 0;
  }
  return result.summary.errors > 0;
}

export function severityRank(severity: Severity): number {
  return severity === "error" ? 2 : severity === "warning" ? 1 : 0;
}
