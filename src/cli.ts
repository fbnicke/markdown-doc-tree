#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  validateDocumentationDirectory,
  type DocumentationDiagnostic,
  type DocumentationDiagnosticSeverity,
} from "./index.js";

type CliOptions = {
  directory: string;
  missingParentSeverity: DocumentationDiagnosticSeverity;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));

  const rootDirectory = path.resolve(options.directory);

  console.log(`Validating documentation in:\n${rootDirectory}\n`);

  try {
    const result = await validateDocumentationDirectory(
      rootDirectory,
      {
        missingParentSeverity:
          options.missingParentSeverity,
      },
    );

    printDiagnostics(result.diagnostics);

    console.log();
    console.log(
      `${result.documents.length} document(s) discovered.`,
    );

    if (!result.valid) {
      console.error("Documentation validation failed.");
      process.exitCode = 1;
      return;
    }

    if (result.diagnostics.length > 0) {
      console.log(
        "Documentation is valid with warnings.",
      );
      return;
    }

    console.log("Documentation is valid.");
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(`Documentation validation failed:\n${message}`);
    process.exitCode = 1;
  }
}

function parseArguments(args: string[]): CliOptions {
  const [command, directory, ...flags] = args;

  if (
    command === "--help" ||
    command === "-h" ||
    command === undefined
  ) {
    printHelp();
    process.exit(0);
  }

  if (command !== "validate") {
    throw new Error(`Unknown command: "${command}".`);
  }

  if (!directory) {
    throw new Error(
      "Missing documentation directory.",
    );
  }

  const strictMissingParents = flags.includes(
    "--strict-missing-parents",
  );

  const unknownFlags = flags.filter(
    (flag) => flag !== "--strict-missing-parents",
  );

  if (unknownFlags.length > 0) {
    throw new Error(
      `Unknown option: "${unknownFlags[0]}".`,
    );
  }

  return {
    directory,
    missingParentSeverity: strictMissingParents
      ? "error"
      : "warning",
  };
}

function printDiagnostics(
  diagnostics: DocumentationDiagnostic[],
): void {
  if (diagnostics.length === 0) {
    return;
  }

  const sortedDiagnostics = [...diagnostics].sort(
    (left, right) =>
      severityRank(left.severity) -
        severityRank(right.severity) ||
      left.documentId.localeCompare(right.documentId),
  );

  for (const diagnostic of sortedDiagnostics) {
    const label = diagnostic.severity.toUpperCase();

    console.log(
      `${label} [${diagnostic.code}] ${diagnostic.message}`,
    );

    for (const sourcePath of diagnostic.sourcePaths) {
      console.log(`  ${sourcePath}`);
    }

    console.log();
  }
}

function severityRank(
  severity: DocumentationDiagnosticSeverity,
): number {
  return severity === "error" ? 0 : 1;
}

function printHelp(): void {
  console.log(`
OpenSource Doc Tree

Usage:
  opensource-doc-tree validate <directory> [options]

Options:
  --strict-missing-parents
      Treat missing parent documents as errors.

Examples:
  opensource-doc-tree validate ./docs
  opensource-doc-tree validate ./docs --strict-missing-parents
`);
}

await main();