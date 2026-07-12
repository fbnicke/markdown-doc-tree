import path from "node:path";
import type { DocumentSource } from "./document-node.js";

const DOCUMENT_FILENAME_PATTERN =
  /^(?<coordinate>\d+(?:\.\d+)*)_(?<name>.+)\.md$/i;

export function parseDocumentFilename(
  sourcePath: string,
): DocumentSource | undefined {
  const filename = path.basename(sourcePath);
  const match = DOCUMENT_FILENAME_PATTERN.exec(filename);

  if (!match?.groups) {
    return undefined;
  }

  const order = match.groups.coordinate
    .split(".")
    .map((segment) => Number.parseInt(segment, 10));

  const title = match.groups.name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: match.groups.coordinate,
    order,
    title,
    filename,
    sourcePath,
  };
}
