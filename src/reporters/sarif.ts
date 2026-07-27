import type { AnalysisResult, RuleId, Severity } from "../types.js";

const RULES: Record<
  RuleId,
  { name: string; shortDescription: string; help: string }
> = {
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

export function formatSarif(result: AnalysisResult): string {
  const sarif = {
    $schema:
      "https://json.schemastore.org/sarif-2.1.0.json",
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
            ...(issue.variable ? { variable: issue.variable } : {}),
            hint: issue.hint
          }
        }))
      }
    ]
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}

function sarifLevel(severity: Severity): "error" | "warning" | "note" {
  return severity === "info" ? "note" : severity;
}
