declare const RULE_IDS: {
    readonly undocumented: "EVT001";
    readonly staleDocumentation: "EVT002";
    readonly providerOnly: "EVT003";
    readonly trackedEnvFile: "EVT004";
    readonly dynamicAccess: "EVT005";
    readonly duplicateDocumentation: "EVT006";
};
type RuleName = keyof typeof RULE_IDS;
type RuleId = (typeof RULE_IDS)[RuleName];
type Severity = "error" | "warning" | "info";
type RuleSetting = Severity | "off";
type FactRole = "consumer" | "documentation" | "provider";
type Adapter = "javascript" | "python" | "go" | "rust" | "ruby" | "php" | "java" | "dotnet" | "shell" | "dotenv" | "dockerfile" | "compose" | "github-actions" | "gitlab-ci" | "kubernetes";
type VariableStatus = "aligned" | "undocumented" | "stale" | "provider-only";
interface SourceLocation {
    file: string;
    line: number;
    column: number;
}
interface VariableFact {
    name: string;
    role: FactRole;
    adapter: Adapter;
    location: SourceLocation;
    detail?: string;
    description?: string;
    sensitive: boolean;
}
interface DynamicAccess {
    adapter: Adapter;
    location: SourceLocation;
    expression: string;
}
interface ScanResult {
    facts: VariableFact[];
    dynamicAccesses: DynamicAccess[];
    filesScanned: number;
    skippedFiles: number;
    trackedEnvFiles: string[];
}
interface VariableNode {
    name: string;
    sensitive: boolean;
    status: VariableStatus;
    consumers: VariableFact[];
    documentation: VariableFact[];
    providers: VariableFact[];
}
interface Issue {
    ruleId: RuleId;
    ruleName: RuleName;
    severity: Severity;
    variable?: string;
    message: string;
    hint: string;
    locations: SourceLocation[];
}
interface AnalysisSummary {
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
interface AnalysisResult {
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
interface EnvTrailConfigInput {
    documentation?: string[];
    exclude?: string[];
    ignore?: string[];
    rules?: Partial<Record<RuleName, RuleSetting>>;
    maxFileSizeKb?: number;
}
interface EnvTrailConfig {
    documentation: string[];
    exclude: string[];
    ignore: string[];
    rules: Record<RuleName, RuleSetting>;
    maxFileSizeKb: number;
}
interface AnalyzeOptions {
    config?: EnvTrailConfigInput;
    configPath?: string;
    version?: string;
}
interface TerminalOptions {
    color?: boolean;
    details?: boolean;
}
type OutputFormat = "terminal" | "json" | "sarif" | "markdown";
type FailureThreshold = "error" | "warning" | "never";

declare function analyze(target?: string, options?: AnalyzeOptions): Promise<AnalysisResult>;
declare function analyzeScan(root: string, scan: ScanResult, config: EnvTrailConfig, version?: string): AnalysisResult;

declare function defineConfig(config: EnvTrailConfigInput): EnvTrailConfigInput;
declare function resolveConfig(input?: EnvTrailConfigInput): EnvTrailConfig;
declare function loadConfig(root: string, explicitPath?: string): Promise<{
    config: EnvTrailConfig;
    path?: string;
}>;

declare function scanProject(root: string, config: EnvTrailConfig): Promise<ScanResult>;

declare function scanDotenvDocumentation(content: string, relativePath: string): VariableFact[];

declare function scanDockerfile(content: string, relativePath: string): VariableFact[];
declare function scanYamlInfrastructure(content: string, relativePath: string, kind: "compose" | "ci" | "kubernetes"): VariableFact[];

declare function scanSource(content: string, relativePath: string): {
    facts: VariableFact[];
    dynamicAccesses: DynamicAccess[];
};

declare function formatHtml(result: AnalysisResult): string;

declare function formatJson(result: AnalysisResult): string;

declare function formatMarkdown(result: AnalysisResult): string;

declare function formatSarif(result: AnalysisResult): string;

declare function formatTerminal(result: AnalysisResult, options?: TerminalOptions): string;
declare function shouldFail(result: AnalysisResult, threshold: "error" | "warning" | "never"): boolean;

export { type Adapter, type AnalysisResult, type AnalysisSummary, type AnalyzeOptions, type DynamicAccess, type EnvTrailConfig, type EnvTrailConfigInput, type FactRole, type FailureThreshold, type Issue, type OutputFormat, RULE_IDS, type RuleId, type RuleName, type RuleSetting, type ScanResult, type Severity, type SourceLocation, type TerminalOptions, type VariableFact, type VariableNode, type VariableStatus, analyze, analyzeScan, defineConfig, formatHtml, formatJson, formatMarkdown, formatSarif, formatTerminal, loadConfig, resolveConfig, scanDockerfile, scanDotenvDocumentation, scanProject, scanSource, scanYamlInfrastructure, shouldFail };
