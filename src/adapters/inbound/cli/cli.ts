#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import type { DocumentationDiagnosticSeverity, DocumentationDiagnostic } from '../../../domain/documentation-diagnostic.js';
import { validateDocumentationDirectory } from '../../../application/use-cases/validate-documentation.js';
import { generateDocumentationManual } from '../../../application/use-cases/generate-documentation-manual.js';
import { generateDocumentationManifest } from '../../../application/use-cases/generate-documentation-manifest.js';
import { fileSystemDocumentationSourceReader } from '../../outbound/filesystem/scan-document-directory.js';
import { fileSystemDocumentationManifestPublisher } from '../../outbound/filesystem/file-system-documentation-manifest-publisher.js';

type CliOptions =
| {
  command: "validate";
  directory: string;
  missingParentSeverity: DocumentationDiagnosticSeverity;
}
| {
  command: "manifest";
  directory: string;
  outputFile: string;
  missingParentSeverity: DocumentationDiagnosticSeverity;
}
| {
  command: "pdf";
  directory: string;
  outputFile: string;
  title: string;
  stylesheet?: string;
  missingParentSeverity: DocumentationDiagnosticSeverity;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));

  if (options.command === "manifest") {
    const rootDirectory = path.resolve(
      options.directory,
    );

    const outputFile = path.resolve(
      options.outputFile,
    );

    await generateDocumentationManifest(
      fileSystemDocumentationSourceReader,
      fileSystemDocumentationManifestPublisher,
      rootDirectory,
      {
        outputFile,
        missingParentSeverity:
          options.missingParentSeverity,
      },
    );

    console.log(
      `Documentation manifest written to:\n${outputFile}`,
    );

    return;
  }

  if (options.command === "pdf") {
    const rootDirectory = path.resolve(
      options.directory,
    );

    const outputFile = path.resolve(
      options.outputFile,
    );

    await generateDocumentationManual(
      fileSystemDocumentationSourceReader,
      rootDirectory,
      {
        outputFile,
        title: options.title,
        stylesheet: options.stylesheet,
        missingParentSeverity:
          options.missingParentSeverity,
      },
    );

    console.log(
      `Documentation PDF written to:\n${outputFile}`,
    );

    return;
  }

  const rootDirectory = path.resolve(options.directory);

  console.log(`Validating documentation in:\n${rootDirectory}\n`);

  try {
    const result = await validateDocumentationDirectory(
      fileSystemDocumentationSourceReader,
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

  if (!directory) {
    throw new Error(
      "Missing documentation directory.",
    );
  }

  const strictMissingParents = flags.includes(
    "--strict-missing-parents",
  );

  const missingParentSeverity =
    strictMissingParents ? "error" : "warning";

  if (command === "validate") {
    const unknownFlags = flags.filter(
      (flag) =>
        flag !== "--strict-missing-parents",
    );

    if (unknownFlags.length > 0) {
      throw new Error(
        `Unknown option: "${unknownFlags[0]}".`,
      );
    }

    return {
      command: "validate",
      directory,
      missingParentSeverity,
    };
  }

  if (command === "manifest") {
    const outputFlagIndex =
      flags.indexOf("--output");

    const outputFile =
      outputFlagIndex >= 0
        ? flags[outputFlagIndex + 1]
        : "output/docs-manifest.json";

    if (!outputFile) {
      throw new Error(
        'Option "--output" requires a file path.',
      );
    }

    const knownFlags = new Set([
      "--strict-missing-parents",
      "--output",
      outputFile,
    ]);

    const unknownFlags = flags.filter(
      (flag) => !knownFlags.has(flag),
    );

    if (unknownFlags.length > 0) {
      throw new Error(
        `Unknown option: "${unknownFlags[0]}".`,
      );
    }

    return {
      command: "manifest",
      directory,
      outputFile,
      missingParentSeverity,
    };
  }

  if (command === "pdf") {
    const outputFlagIndex =
      flags.indexOf("--output");

    const titleFlagIndex =
      flags.indexOf("--title");

    const outputFile =
      outputFlagIndex >= 0
        ? flags[outputFlagIndex + 1]
        : "output/manual/documentation.pdf";

    const title =
      titleFlagIndex >= 0
        ? flags[titleFlagIndex + 1]
        : "Documentation Manual";

    const stylesheetFlagIndex = flags.indexOf("--stylesheet");
    const stylesheet =
      stylesheetFlagIndex >= 0
        ? flags[stylesheetFlagIndex + 1]
        : undefined;

    if (!outputFile) {
      throw new Error(
        'Option "--output" requires a file path.',
      );
    }

    if (!title) {
      throw new Error(
        'Option "--title" requires a value.',
      );
    }

    if (
      stylesheetFlagIndex >= 0 &&
      !stylesheet
    ) {
      throw new Error(
        'Option "--stylesheet" requires a filepath.',
      );
    }

    const consumedValues = new Set([
      "--strict-missing-parents",
      "--output",
      outputFile,
      "--title",
      title,
      "--stylesheet",
      ...(stylesheet ? [stylesheet] : []),
    ]);

    const unknownFlags = flags.filter(
      (flag) => !consumedValues.has(flag),
    );

    if (unknownFlags.length > 0) {
      throw new Error(
        `Unknown option: "${unknownFlags[0]}".`,
      );
    }

    return {
      command: "pdf",
      directory,
      outputFile,
      title,
      stylesheet,
      missingParentSeverity,
    };
  }

  throw new Error(`Unknown command: "${command}".`);
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
Markdown Doc Tree

Usage:
  markdown-doc-tree validate <directory> [options]
  markdown-doc-tree manifest <directory> [options]
  markdown-doc-tree pdf <directory> [options]

Options:
  --strict-missing-parents
      Treat missing parent documents as errors.

  --output <path>
      Output file.

  --title <title>
      Manual title used for PDF generation.

  --stylesheet <path>
      Additional stylesheet used to customize PDF output.

Examples:
  markdown-doc-tree validate ./docs

  markdown-doc-tree manifest ./docs
  markdown-doc-tree manifest ./docs --output ./public/docs-manifest.json

  markdown-doc-tree pdf ./docs
  markdown-doc-tree pdf ./docs --output ./manual.pdf --title "Customer Manual"
  markdown-doc-tree pdf ./docs --stylesheet ./company-manual.css
`);
}

await main();
