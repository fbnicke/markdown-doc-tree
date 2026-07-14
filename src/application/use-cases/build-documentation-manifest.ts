import path from 'node:path';
import type { DocumentSource, DocumentNode } from '../../domain/document-node.js';
import type { DocumentationManifest, ManifestDocument, ManifestNode } from '../../domain/documentation-manifest.js';

export type BuildDocumentationManifestOptions = {
  contentDirectory?: string;
};

export function buildDocumentationManifest(
  documents: DocumentSource[],
  tree: DocumentNode[],
  options: BuildDocumentationManifestOptions = {},
): DocumentationManifest {
  const contentDirectory =
    options.contentDirectory ?? "content";

  return {
    version: 1,
    documents: documents
      .map((document) =>
        toManifestDocument(document, contentDirectory),
      )
      .sort(compareManifestDocuments),
    tree: tree.map(toManifestNode),
  };
}

function toManifestDocument(
  document: DocumentSource,
  contentDirectory: string,
): ManifestDocument {
  return {
    id: document.id,
    title: document.title,
    contentPath: toPortablePath(
      path.join(contentDirectory, document.filename),
    ),
  };
}

function toManifestNode(
  node: DocumentNode,
): ManifestNode {
  return {
    id: node.id,
    children: node.children.map(toManifestNode),
  };
}

function compareManifestDocuments(
  left: ManifestDocument,
  right: ManifestDocument,
): number {
  return compareDocumentIds(left.id, right.id);
}

function compareDocumentIds(
  left: string,
  right: string,
): number {
  const leftSegments = left.split(".").map(Number);
  const rightSegments = right.split(".").map(Number);
  const length = Math.max(
    leftSegments.length,
    rightSegments.length,
  );

  for (let index = 0; index < length; index += 1) {
    const difference =
      (leftSegments[index] ?? -1) -
      (rightSegments[index] ?? -1);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function toPortablePath(value: string): string {
  return value.split(path.sep).join("/");
}
