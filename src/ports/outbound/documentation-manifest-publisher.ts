import type { DocumentationManifest } from '../../domain/documentation-manifest.js';

export interface PublishDocumentationManifestInput {
  rootDirectory: string;
  outputFile: string;
  contentDirectory: string;
  manifest: DocumentationManifest;
}

export interface DocumentationManifestPublisher {
  publish(
    input: PublishDocumentationManifestInput,
  ): Promise<void>;
}