import { describe, expect, it } from "vitest";
import { scanDotenvDocumentation } from "../src/scanners/dotenv.js";

describe("scanDotenvDocumentation", () => {
  it("captures keys, locations, and comments without retaining values", () => {
    const content = [
      "# Primary database",
      "DATABASE_URL=should-never-appear-in-a-report",
      "",
      "export API_TOKEN=also-private"
    ].join("\n");

    const facts = scanDotenvDocumentation(content, ".env.example");
    expect(facts.map((fact) => fact.name)).toEqual([
      "DATABASE_URL",
      "API_TOKEN"
    ]);
    expect(facts[0]?.description).toBe("Primary database");
    expect(facts[0]?.location.line).toBe(2);
    expect(JSON.stringify(facts)).not.toContain("should-never-appear");
    expect(JSON.stringify(facts)).not.toContain("also-private");
  });

  it("retains duplicate keys for the rule engine", () => {
    const facts = scanDotenvDocumentation(
      "PORT=3000\nPORT=4000\n",
      ".env.example"
    );
    expect(facts).toHaveLength(2);
  });
});
