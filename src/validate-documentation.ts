import { buildDocumentTree } from "./build-document-tree.js";
import type {
  DocumentNode,
  DocumentSource,
} from "./document-node.js";
import type {
  DocumentationDiagnostic,
  DocumentationDiagnosticSeverity,
} from "./documentation-diagnostic.js";
import { scanDocumentDirectory } from "./scan-document-directory.js";

export type ValidateDocumentationOptions = {
  missingParentSeverity?: DocumentationDiagnosticSeverity;
};

export type DocumentationValidationResult = {
  valid: boolean;
  documents: DocumentSource[];
  tree: DocumentNode[];
  diagnostics: DocumentationDiagnostic[];
};

export async function validateDocumentationDirectory(
  rootDirectory: string,
  options: ValidateDocumentationOptions = {},
): Promise<DocumentationValidationResult> {
  const documents =
    await scanDocumentDirectory(rootDirectory);

  return validateDocuments(documents, options);
}

export function validateDocuments(
  documents: DocumentSource[],
  options: ValidateDocumentationOptions = {},
): DocumentationValidationResult {
  const diagnostics: DocumentationDiagnostic[] = [];

  collectDuplicateIdDiagnostics(documents, diagnostics);
  collectMissingParentDiagnostics(
    documents,
    diagnostics,
    options.missingParentSeverity ?? "warning",
  );

  const hasErrors = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );

  const tree = hasErrors
    ? []
    : buildDocumentTree(documents, {
        missingParentBehavior:
          "attach-to-nearest-ancestor",
      });

  return {
    valid: !hasErrors,
    documents,
    tree,
    diagnostics,
  };
}

function collectDuplicateIdDiagnostics(
  documents: DocumentSource[],
  diagnostics: DocumentationDiagnostic[],
): void {
  const documentsById = new Map<
    string,
    DocumentSource[]
  >();

  for (const document of documents) {
    const matchingDocuments =
      documentsById.get(document.id) ?? [];

    matchingDocuments.push(document);
    documentsById.set(document.id, matchingDocuments);
  }

  for (const [id, matchingDocuments] of documentsById) {
    if (matchingDocuments.length < 2) {
      continue;
    }

    diagnostics.push({
      severity: "error",
      code: "duplicate_document_id",
      documentId: id,
      message: `Multiple documents use id "${id}".`,
      sourcePaths: matchingDocuments.map(
        (document) => document.sourcePath,
      ),
    });
  }
}

function collectMissingParentDiagnostics(
  documents: DocumentSource[],
  diagnostics: DocumentationDiagnostic[],
  severity: DocumentationDiagnosticSeverity,
): void {
  const documentIds = new Set(
    documents.map((document) => document.id),
  );

  for (const document of documents) {
    const parentId = getParentId(document.id);

    if (!parentId || documentIds.has(parentId)) {
      continue;
    }

    diagnostics.push({
      severity,
      code: "missing_parent",
      documentId: document.id,
      message:
        `Document "${document.id}" has no direct ` +
        `parent document "${parentId}".`,
      sourcePaths: [document.sourcePath],
    });
  }
}

function getParentId(id: string): string | undefined {
  const segments = id.split(".");

  if (segments.length === 1) {
    return undefined;
  }

  return segments.slice(0, -1).join(".");
}
