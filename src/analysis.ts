import path from "node:path";
import { loadConfig, resolveConfig } from "./config.js";
import { scanProject } from "./scanners/index.js";
import {
  RULE_IDS,
  type AnalysisResult,
  type AnalyzeOptions,
  type EnvTrailConfig,
  type Issue,
  type RuleName,
  type ScanResult,
  type Severity,
  type VariableFact,
  type VariableNode,
  type VariableStatus
} from "./types.js";
import { matchesAnyGlob, stableSort } from "./utils.js";

const DEFAULT_VERSION = "0.1.0";

export async function analyze(
  target = ".",
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> {
  const startedAt = performance.now();
  const root = path.resolve(target);
  const config = options.config
    ? resolveConfig(options.config)
    : (await loadConfig(root, options.configPath)).config;
  const scan = await scanProject(root, config);
  const result = analyzeScan(root, scan, config, options.version ?? DEFAULT_VERSION);

  return {
    ...result,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt))
  };
}

export function analyzeScan(
  root: string,
  scan: ScanResult,
  config: EnvTrailConfig,
  version = DEFAULT_VERSION
): AnalysisResult {
  const facts = scan.facts.filter(
    (fact) => !matchesAnyGlob(fact.name, config.ignore)
  );
  const groups = new Map<string, VariableFact[]>();

  for (const fact of facts) {
    const existing = groups.get(fact.name) ?? [];
    existing.push(fact);
    groups.set(fact.name, existing);
  }

  const variables = stableSort(
    [...groups.entries()].map(([name, variableFacts]) =>
      createVariableNode(name, variableFacts)
    ),
    (variable) => variable.name
  );
  const issues = stableSort(
    createVariableIssues(variables, config).concat(
      createRepositoryIssues(scan, config)
    ),
    (issue) =>
      `${severityOrder(issue.severity)}:${issue.ruleId}:${issue.variable ?? ""}:${issue.locations[0]?.file ?? ""}`
  );
  const summary = createSummary(scan, variables, issues);

  return {
    schemaVersion: 1,
    tool: { name: "envtrail", version },
    root,
    generatedAt: new Date().toISOString(),
    durationMs: 0,
    summary,
    variables,
    issues
  };
}

function createVariableNode(
  name: string,
  facts: VariableFact[]
): VariableNode {
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

function resolveStatus(
  consumers: VariableFact[],
  documentation: VariableFact[]
): VariableStatus | undefined {
  if (consumers.length > 0 && documentation.length > 0) {
    return "aligned";
  }
  if (consumers.length > 0) {
    return "undocumented";
  }
  if (documentation.length > 0) {
    return "stale";
  }
  return undefined;
}

function createVariableIssues(
  variables: VariableNode[],
  config: EnvTrailConfig
): Issue[] {
  const issues: Issue[] = [];

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

function createRepositoryIssues(
  scan: ScanResult,
  config: EnvTrailConfig
): Issue[] {
  const issues: Issue[] = [];

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

function pushIssue(
  issues: Issue[],
  config: EnvTrailConfig,
  ruleName: RuleName,
  details: Omit<Issue, "ruleId" | "ruleName" | "severity">
): void {
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

function duplicateDocumentationLocations(
  variable: VariableNode
): VariableFact["location"][] {
  const byFile = new Map<string, VariableFact[]>();
  for (const fact of variable.documentation) {
    const values = byFile.get(fact.location.file) ?? [];
    values.push(fact);
    byFile.set(fact.location.file, values);
  }
  return [...byFile.values()]
    .filter((facts) => facts.length > 1)
    .flatMap((facts) => facts.map((fact) => fact.location));
}

function createSummary(
  scan: ScanResult,
  variables: VariableNode[],
  issues: Issue[]
): AnalysisResult["summary"] {
  const countStatus = (status: VariableStatus): number =>
    variables.filter((variable) => variable.status === status).length;
  const countSeverity = (severity: Severity): number =>
    issues.filter((issue) => issue.severity === severity).length;
  const consumers = variables.filter(
    (variable) => variable.consumers.length > 0
  );
  const undocumented = countStatus("undocumented");
  const coveragePenalty =
    consumers.length === 0
      ? 0
      : Math.round((undocumented / consumers.length) * 30);
  const issuePenalty =
    countSeverity("error") * 12 +
    countSeverity("warning") * 4 +
    countSeverity("info");

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

function sortFacts(facts: VariableFact[]): VariableFact[] {
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

function severityOrder(severity: Severity): string {
  return severity === "error" ? "0" : severity === "warning" ? "1" : "2";
}
