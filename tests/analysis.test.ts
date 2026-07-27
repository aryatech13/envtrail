import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/analysis.js";

const fixture = fileURLToPath(new URL("./fixtures/demo", import.meta.url));

describe("analyze", () => {
  it("builds a deterministic provenance graph for a mixed stack", async () => {
    const result = await analyze(fixture);

    expect(result.summary.filesScanned).toBe(6);
    expect(result.summary.variables).toBe(7);
    expect(result.summary.aligned).toBe(4);
    expect(result.summary.undocumented).toBe(1);
    expect(result.summary.stale).toBe(1);
    expect(result.summary.providerOnly).toBe(1);
    expect(result.summary.score).toBe(74);
    expect(result.issues.map((issue) => issue.ruleId)).toEqual([
      "EVT001",
      "EVT002",
      "EVT003"
    ]);
  });

  it("applies ignore patterns and rule overrides", async () => {
    const result = await analyze(fixture, {
      config: {
        ignore: ["STRIPE_*"],
        rules: {
          providerOnly: "off",
          staleDocumentation: "info"
        }
      }
    });

    expect(result.variables.some((item) => item.name === "STRIPE_SECRET_KEY")).toBe(
      false
    );
    expect(result.issues.some((issue) => issue.ruleId === "EVT003")).toBe(false);
    expect(result.issues.find((issue) => issue.ruleId === "EVT002")?.severity).toBe(
      "info"
    );
  });

  it("normalizes the target path", async () => {
    const result = await analyze(fixture);
    expect(result.root).toBe(path.resolve(fixture));
  });
});
