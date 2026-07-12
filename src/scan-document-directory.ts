import { readdir } from "node:fs/promises";
import path from "node:path";
import type { DocumentSource } from "./document-node.js";
import { parseDocumentFilename } from "./parse-document-filename.js";

export async function scanDocumentDirectory(
  rootDirectory: string,
): Promise<DocumentSource[]> {
  const entries = await readdir(rootDirectory, {
    withFileTypes: true,
  });

  const documents: DocumentSource[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(
      rootDirectory,
      entry.name,
    );

    const document = parseDocumentFilename(sourcePath);

    if (document) {
      documents.push(document);
    }
  }

  return documents;
}
