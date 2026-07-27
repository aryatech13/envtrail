import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { analyze } from "../src/analysis.js";
import { formatHtml } from "../src/reporters/html.js";
import { formatJson } from "../src/reporters/json.js";
import { formatMarkdown } from "../src/reporters/markdown.js";
import { formatSarif } from "../src/reporters/sarif.js";
import {
  formatTerminal,
  shouldFail
} from "../src/reporters/terminal.js";
import type { AnalysisResult } from "../src/types.js";

const fixture = fileURLToPath(new URL("./fixtures/demo", import.meta.url));
let result: AnalysisResult;

beforeAll(async () => {
  result = await analyze(fixture);
});

describe("reporters", () => {
  it("renders a readable terminal matrix", () => {
    const output = formatTerminal(result, { color: false });
    expect(output).toContain("Provenance matrix");
    expect(output).toContain("STRIPE_SECRET_KEY");
    expect(output).toContain("values never read");
  });

  it("renders a standalone interactive HTML report", () => {
    const output = formatHtml(result);
    expect(output).toContain("<!doctype html>");
    expect(output).toContain('id="variables"');
    expect(output).toContain("Configuration health");
    expect(output).not.toContain("postgresql://localhost");
  });

  it("renders JSON, Markdown, and valid SARIF", () => {
    expect(JSON.parse(formatJson(result)).schemaVersion).toBe(1);
    expect(formatMarkdown(result)).toContain("| Variable | Code | Docs |");
    const sarif = JSON.parse(formatSarif(result)) as {
      version: string;
      runs: unknown[];
    };
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
  });

  it("honors failure thresholds", () => {
    expect(shouldFail(result, "error")).toBe(true);
    expect(shouldFail(result, "warning")).toBe(true);
    expect(shouldFail(result, "never")).toBe(false);
  });
});
