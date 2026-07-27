export const RULE_IDS = {
  undocumented: "EVT001",
  staleDocumentation: "EVT002",
  providerOnly: "EVT003",
  trackedEnvFile: "EVT004",
  dynamicAccess: "EVT005",
  duplicateDocumentation: "EVT006"
} as const;

export type RuleName = keyof typeof RULE_IDS;
export type RuleId = (typeof RULE_IDS)[RuleName];
export type Severity = "error" | "warning" | "info";
export type RuleSetting = Severity | "off";
export type FactRole = "consumer" | "documentation" | "provider";
export type Adapter =
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "ruby"
  | "php"
  | "java"
  | "dotnet"
  | "shell"
  | "dotenv"
  | "dockerfile"
  | "compose"
  | "github-actions"
  | "gitlab-ci"
  | "kubernetes";

export type VariableStatus =
  | "aligned"
  | "undocumented"
  | "stale"
  | "provider-only";

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface VariableFact {
  name: string;
  role: FactRole;
  adapter: Adapter;
  location: SourceLocation;
  detail?: string;
  description?: string;
  sensitive: boolean;
}

export interface DynamicAccess {
  adapter: Adapter;
  location: SourceLocation;
  expression: string;
}

export interface ScanResult {
  facts: VariableFact[];
  dynamicAccesses: DynamicAccess[];
  filesScanned: number;
  skippedFiles: number;
  trackedEnvFiles: string[];
}

export interface VariableNode {
  name: string;
  sensitive: boolean;
  status: VariableStatus;
  consumers: VariableFact[];
  documentation: VariableFact[];
  providers: VariableFact[];
}

export interface Issue {
  ruleId: RuleId;
  ruleName: RuleName;
  severity: Severity;
  variable?: string;
  message: string;
  hint: string;
  locations: SourceLocation[];
}

export interface AnalysisSummary {
  score: number;
  filesScanned: number;
  skippedFiles: number;
  variables: number;
  aligned: number;
  undocumented: number;
  stale: number;
  providerOnly: number;
  errors: number;
  warnings: number;
  info: number;
}

export interface AnalysisResult {
  schemaVersion: 1;
  tool: {
    name: "envtrail";
    version: string;
  };
  root: string;
  generatedAt: string;
  durationMs: number;
  summary: AnalysisSummary;
  variables: VariableNode[];
  issues: Issue[];
}

export interface EnvTrailConfigInput {
  documentation?: string[];
  exclude?: string[];
  ignore?: string[];
  rules?: Partial<Record<RuleName, RuleSetting>>;
  maxFileSizeKb?: number;
}

export interface EnvTrailConfig {
  documentation: string[];
  exclude: string[];
  ignore: string[];
  rules: Record<RuleName, RuleSetting>;
  maxFileSizeKb: number;
}

export interface AnalyzeOptions {
  config?: EnvTrailConfigInput;
  configPath?: string;
  version?: string;
}

export interface TerminalOptions {
  color?: boolean;
  details?: boolean;
}

export type OutputFormat = "terminal" | "json" | "sarif" | "markdown";
export type FailureThreshold = "error" | "warning" | "never";
