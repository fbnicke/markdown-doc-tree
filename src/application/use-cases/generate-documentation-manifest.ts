
import { buildDocumentationManifest } from "./build-documentation-manifest.js";
import {
  validateDocumentationDirectory,
  type ValidateDocumentationOptions,
} from "./validate-documentation.js";
import type { DocumentationManifest } from '../../domain/documentation-manifest.js';
import { DocumentationSourceReader } from '../../ports/outbound/documentation-source-reader.js';
import { DocumentationManifestPublisher } from '../../ports/outbound/documentation-manifest-publisher.js';

export type GenerateDocumentationManifestOptions =
  ValidateDocumentationOptions & {
    outputFile: string;
    contentDirectory?: string;
  };

export async function generateDocumentationManifest(
  sourceReader: DocumentationSourceReader,
  manifestPublisher: DocumentationManifestPublisher,
  rootDirectory: string,
  options: GenerateDocumentationManifestOptions,
): Promise<DocumentationManifest> {
  const validation =
    await validateDocumentationDirectory(
      sourceReader,
      rootDirectory,
      {
        missingParentSeverity: options.missingParentSeverity,
      },
    );

  if (!validation.valid) {
    throw new Error(
      "Cannot generate manifest from invalid documentation.",
    );
  }

  const contentDirectory =
    options.contentDirectory ?? "content";

  const manifest = buildDocumentationManifest(
    validation.documents,
    validation.tree,
    {
      contentDirectory,
    },
  );

  await manifestPublisher.publish({
    rootDirectory,
    outputFile: options.outputFile,
    contentDirectory,
    manifest,
  });

  return manifest;
}
