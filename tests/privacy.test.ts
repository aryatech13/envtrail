import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { analyze } from "../src/analysis.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("privacy boundary", () => {
  it("flags a tracked live env file without reading its value", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "envtrail-privacy-"));
    temporaryDirectories.push(root);
    await Promise.all([
      writeFile(
        path.join(root, "app.ts"),
        "export const key = process.env.PUBLIC_KEY;\n",
        "utf8"
      ),
      writeFile(path.join(root, ".env.example"), "PUBLIC_KEY=placeholder\n", "utf8"),
      writeFile(
        path.join(root, ".env"),
        "PRIVATE_TOKEN=this-value-must-never-enter-analysis\n",
        "utf8"
      )
    ]);
    await execFileAsync("git", ["-C", root, "init"]);
    await execFileAsync("git", ["-C", root, "add", ".env"]);

    const result = await analyze(root);
    const serialized = JSON.stringify(result);

    expect(result.issues.some((issue) => issue.ruleId === "EVT004")).toBe(true);
    expect(serialized).not.toContain("this-value-must-never-enter-analysis");
    expect(serialized).not.toContain("PRIVATE_TOKEN");
  });
});
