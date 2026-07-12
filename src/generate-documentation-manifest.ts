import {
  cp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { buildDocumentationManifest } from "./build-documentation-manifest.js";
import type { DocumentationManifest } from "./documentation-manifest.js";
import {
  validateDocumentationDirectory,
  type ValidateDocumentationOptions,
} from "./validate-documentation.js";

export type GenerateDocumentationManifestOptions =
  ValidateDocumentationOptions & {
    outputFile: string;
    contentDirectory?: string;
  };

export async function generateDocumentationManifest(
  rootDirectory: string,
  options: GenerateDocumentationManifestOptions,
): Promise<DocumentationManifest> {
  const validation =
    await validateDocumentationDirectory(
      rootDirectory,
      {
        missingParentSeverity:
          options.missingParentSeverity,
      },
    );

  if (!validation.valid) {
    throw new Error(
      "Cannot generate manifest from invalid documentation.",
    );
  }

  const outputFile = path.resolve(options.outputFile);
  const outputDirectory = path.dirname(outputFile);

  assertOutputIsOutsideDocumentationRoot(rootDirectory, outputDirectory);

  const contentDirectory =
    options.contentDirectory ?? "content";

  const manifest = buildDocumentationManifest(
    validation.documents,
    validation.tree,
    {
      contentDirectory,
    },
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  await writeFile(
    outputFile,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  await copyDocumentationContent(
    rootDirectory,
    outputDirectory,
    contentDirectory,
  );

  return manifest;
}

async function copyDocumentationContent(
  rootDirectory: string,
  outputDirectory: string,
  contentDirectory: string,
): Promise<void> {
  const targetDirectory = path.join(
    outputDirectory,
    contentDirectory,
  );

  await cp(rootDirectory, targetDirectory, {
    recursive: true,
    force: true,
  });
}

function assertOutputIsOutsideDocumentationRoot(
  rootDirectory: string,
  outputDirectory: string,
): void {
  const relativePath = path.relative(
    path.resolve(rootDirectory),
    path.resolve(outputDirectory),
  );

  const isInsideRoot =
    relativePath === "" ||
    (!relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath));

  if (isInsideRoot) {
    throw new Error(
      "The output directory must not be inside the documentation directory.",
    );
  }
}
