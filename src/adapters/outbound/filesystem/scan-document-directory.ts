import { readdir } from "node:fs/promises";
import path from "node:path";
import type { DocumentationSourceReader } from '../../../ports/outbound/documentation-source-reader.js';
import type { DocumentSource } from '../../../domain/document-node.js';
import { parseDocumentFilename } from '../../../domain/parse-document-filename.js';

export const fileSystemDocumentationSourceReader: DocumentationSourceReader = {
  async read(rootDirectory: string): Promise<DocumentSource[]> {
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
};
