import path from "node:path";
import type { DocumentSource } from "./document-node.js";
import { parseDocumentFilename } from "./parse-document-filename.js";
import { readdir } from 'node:fs/promises';

export async function scanDocumentDirectory(
  rootDirectory: string,
): Promise<DocumentSource[]> {
  const documents: DocumentSource[] = [];

  await scanDirectory(rootDirectory, documents);

  return documents;
}

async function scanDirectory(
  directory: string,
  documents: DocumentSource[],
): Promise<void> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const sourcePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(sourcePath, documents);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const document = parseDocumentFilename(sourcePath);

    if (document) {
      documents.push(document);
    }
  }
}