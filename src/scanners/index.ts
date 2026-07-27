import type { EnvTrailConfig, ScanResult, VariableFact } from "../types.js";
import {
  discoverFiles,
  findTrackedEnvFiles,
  readDiscoveredFile
} from "../discovery.js";
import { scanDotenvDocumentation } from "./dotenv.js";
import {
  scanDockerfile,
  scanYamlInfrastructure
} from "./infrastructure.js";
import { scanSource } from "./source.js";

export async function scanProject(
  root: string,
  config: EnvTrailConfig
): Promise<ScanResult> {
  const discovery = await discoverFiles(root, config);
  const trackedEnvFilesPromise = findTrackedEnvFiles(
    root,
    discovery.secretEnvFiles
  );

  const scans = await Promise.all(
    discovery.files.map(async (file) => {
      const content = await readDiscoveredFile(file);
      if (content === "") {
        return { facts: [] as VariableFact[], dynamicAccesses: [] };
      }

      if (file.kind === "source") {
        return scanSource(content, file.relativePath);
      }
      if (file.kind === "dotenv-doc") {
        return {
          facts: scanDotenvDocumentation(content, file.relativePath),
          dynamicAccesses: []
        };
      }
      if (file.kind === "dockerfile") {
        return {
          facts: scanDockerfile(content, file.relativePath),
          dynamicAccesses: []
        };
      }
      return {
        facts: scanYamlInfrastructure(content, file.relativePath, file.kind),
        dynamicAccesses: []
      };
    })
  );

  const trackedEnvFiles = await trackedEnvFilesPromise;
  return {
    facts: scans.flatMap((scan) => scan.facts),
    dynamicAccesses: scans.flatMap((scan) => scan.dynamicAccesses),
    filesScanned: discovery.files.length,
    skippedFiles: discovery.skippedFiles,
    trackedEnvFiles
  };
}
