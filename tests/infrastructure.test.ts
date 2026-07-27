import { describe, expect, it } from "vitest";
import {
  scanDockerfile,
  scanYamlInfrastructure
} from "../src/scanners/infrastructure.js";

describe("infrastructure scanners", () => {
  it("maps Compose object and list environments", () => {
    const content = `
services:
  api:
    environment:
      DATABASE_URL: \${DATABASE_URL}
      PORT: 3000
`;
    const names = scanYamlInfrastructure(
      content,
      "compose.yaml",
      "compose"
    ).map((fact) => fact.name);
    expect(names).toContain("DATABASE_URL");
    expect(names).toContain("PORT");
  });

  it("maps GitHub Actions env blocks but never their values", () => {
    const content = `
jobs:
  test:
    env:
      API_TOKEN: \${{ secrets.API_TOKEN }}
      LOG_LEVEL: test
`;
    const facts = scanYamlInfrastructure(
      content,
      ".github/workflows/test.yml",
      "ci"
    );
    expect(facts.map((fact) => fact.name)).toEqual(["API_TOKEN", "LOG_LEVEL"]);
    expect(JSON.stringify(facts)).not.toContain("secrets.API_TOKEN");
  });

  it("maps Kubernetes container env entries", () => {
    const content = `
spec:
  containers:
    - name: api
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app
              key: database
`;
    const facts = scanYamlInfrastructure(
      content,
      "k8s/deployment.yaml",
      "kubernetes"
    );
    expect(facts.map((fact) => fact.name)).toEqual(["DATABASE_URL"]);
  });

  it("maps Dockerfile ENV and ARG keys", () => {
    const facts = scanDockerfile(
      "ARG NODE_VERSION=24\nENV PORT=3000 LOG_LEVEL=info\n",
      "Dockerfile"
    );
    expect(facts.map((fact) => fact.name)).toEqual([
      "NODE_VERSION",
      "PORT",
      "LOG_LEVEL"
    ]);
  });
});
