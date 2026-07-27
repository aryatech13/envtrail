import { describe, expect, it } from "vitest";
import { scanSource } from "../src/scanners/source.js";

describe("scanSource", () => {
  it("finds JavaScript, TypeScript, and runtime-specific access patterns", () => {
    const content = [
      "const url = process.env.DATABASE_URL;",
      "const token = process.env['API_TOKEN'];",
      "const mode = import.meta.env.VITE_MODE;",
      "const region = Deno.env.get('REGION');",
      "const { CACHE_URL, PORT: httpPort } = process.env;",
      "const dynamic = process.env[key];"
    ].join("\n");

    const scan = scanSource(content, "src/config.ts");
    expect(scan.facts.map((fact) => fact.name)).toEqual([
      "DATABASE_URL",
      "API_TOKEN",
      "VITE_MODE",
      "REGION",
      "CACHE_URL",
      "PORT"
    ]);
    expect(scan.dynamicAccesses).toHaveLength(1);
    expect(scan.facts.find((fact) => fact.name === "API_TOKEN")?.sensitive).toBe(
      true
    );
  });

  it.each([
    ["app.py", 'os.getenv("PYTHON_KEY")', "PYTHON_KEY"],
    ["main.go", 'os.LookupEnv("GO_KEY")', "GO_KEY"],
    ["lib.rs", 'std::env::var("RUST_KEY")', "RUST_KEY"],
    ["app.rb", 'ENV.fetch("RUBY_KEY")', "RUBY_KEY"],
    ["index.php", 'getenv("PHP_KEY")', "PHP_KEY"],
    ["Main.java", 'System.getenv("JAVA_KEY")', "JAVA_KEY"],
    [
      "Program.cs",
      'Environment.GetEnvironmentVariable("DOTNET_KEY")',
      "DOTNET_KEY"
    ],
    ["entrypoint.sh", 'echo "${SHELL_KEY:-fallback}"', "SHELL_KEY"]
  ])("finds %s environment access", (filename, source, expected) => {
    const scan = scanSource(source, filename);
    expect(scan.facts.map((fact) => fact.name)).toContain(expected);
  });

  it("does not treat shell assignments as consumers", () => {
    expect(scanSource("PORT=3000", "start.sh").facts).toHaveLength(0);
  });
});
