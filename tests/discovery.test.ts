import { describe, expect, it } from "vitest";
import { isSecretEnvFile } from "../src/discovery.js";
import { globToRegExp, matchesAnyGlob } from "../src/utils.js";

describe("discovery safeguards", () => {
  it("recognizes live env files but not templates or EnvTrail config", () => {
    expect(isSecretEnvFile(".env")).toBe(true);
    expect(isSecretEnvFile(".env.production")).toBe(true);
    expect(isSecretEnvFile(".env.local")).toBe(true);
    expect(isSecretEnvFile(".env.example")).toBe(false);
    expect(isSecretEnvFile(".env.test.template")).toBe(false);
    expect(isSecretEnvFile(".envtrailrc.json")).toBe(false);
  });

  it("matches path and variable glob patterns", () => {
    expect(matchesAnyGlob("node_modules/pkg/index.js", ["**/node_modules/**"])).toBe(
      true
    );
    expect(matchesAnyGlob("GITHUB_TOKEN", ["GITHUB_*"])).toBe(true);
    expect(globToRegExp(".env.*.example").test(".env.test.example")).toBe(true);
  });
});
