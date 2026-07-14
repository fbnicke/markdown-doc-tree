import { DocumentSource } from '../../domain/document-node.js';

export interface DocumentationSourceReader {
  read(rootDirectory: string): Promise<DocumentSource[]>;
}