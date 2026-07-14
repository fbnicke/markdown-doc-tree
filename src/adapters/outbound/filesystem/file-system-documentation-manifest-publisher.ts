import {
  cp,
  mkdir,
  writeFile,
} from 'node:fs/promises';

import path from 'node:path';

import type {
  DocumentationManifestPublisher,
  PublishDocumentationManifestInput,
} from '../../../ports/outbound/documentation-manifest-publisher.js';

export const fileSystemDocumentationManifestPublisher:
  DocumentationManifestPublisher = {
    async publish(
      input: PublishDocumentationManifestInput,
    ): Promise<void> {
      const outputFile = path.resolve(input.outputFile);
      const outputDirectory = path.dirname(outputFile);

      assertOutputIsOutsideDocumentationRoot(
        input.rootDirectory,
        outputDirectory,
      );

      await mkdir(outputDirectory, {
        recursive: true,
      });

      await writeFile(
        outputFile,
        `${JSON.stringify(input.manifest, null, 2)}\n`,
        'utf8',
      );

      await cp(
        input.rootDirectory,
        path.join(
          outputDirectory,
          input.contentDirectory,
        ),
        {
          recursive: true,
          force: true,
        },
      );
    },
  };

function assertOutputIsOutsideDocumentationRoot(
  rootDirectory: string,
  outputDirectory: string,
): void {
  const relativePath = path.relative(
    path.resolve(rootDirectory),
    path.resolve(outputDirectory),
  );

  const isInsideRoot =
    relativePath === '' ||
    (
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath)
    );

  if (isInsideRoot) {
    throw new Error(
      'The output directory must not be inside the documentation directory.',
    );
  }
}