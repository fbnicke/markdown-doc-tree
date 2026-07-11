export type DocumentationDiagnosticSeverity =
  | "error"
  | "warning";

export type DocumentationDiagnosticCode =
  | "duplicate_document_id"
  | "missing_parent";

export type DocumentationDiagnostic = {
  severity: DocumentationDiagnosticSeverity;
  code: DocumentationDiagnosticCode;
  message: string;
  documentId: string;
  sourcePaths: string[];
};