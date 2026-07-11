import { describe, expect, it } from "vitest";
import type { DocumentSource } from "../src/document-node.js";
import { validateDocuments } from "../src/validate-documentation.js";

describe("validateDocuments", () => {
  it("allows missing parents with a warning by default", () => {
    const result = validateDocuments([
      document("2.1", "docs/2.1_Installation.md"),
    ]);

    expect(result.valid).toBe(true);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "missing_parent",
        documentId: "2.1",
      }),
    );

    expect(result.tree.map((node) => node.id)).toEqual([
      "2.1",
    ]);
  });

  it("can treat missing parents as errors", () => {
    const result = validateDocuments(
      [document("2.1", "docs/2.1_Installation.md")],
      {
        missingParentSeverity: "error",
      },
    );

    expect(result.valid).toBe(false);
    expect(result.tree).toEqual([]);
  });

  it("attaches a document to the nearest existing ancestor", () => {
    const result = validateDocuments([
      document("2", "docs/2_Usage.md"),
      document(
        "2.1.1",
        "docs/2.1.1_Advanced-Installation.md",
      ),
    ]);

    expect(result.valid).toBe(true);

    expect(
      result.tree[0]?.children.map((node) => node.id),
    ).toEqual(["2.1.1"]);
  });

  it("rejects duplicate document ids", () => {
    const result = validateDocuments([
      document("1", "docs/1_First.md"),
      document("1", "docs/other/1_Second.md"),
    ]);

    expect(result.valid).toBe(false);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "duplicate_document_id",
        documentId: "1",
      }),
    );
  });
});

function document(
  id: string,
  sourcePath: string,
): DocumentSource {
  return {
    id,
    order: id.split(".").map(Number),
    title: id,
    filename: sourcePath.split("/").at(-1) ?? sourcePath,
    sourcePath,
  };
}