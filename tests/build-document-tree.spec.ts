import { describe, expect, it } from "vitest";
import { buildDocumentTree } from "../src/build-document-tree.js";
import { parseDocumentFilename } from "../src/parse-document-filename.js";

describe("document tree", () => {
  it("builds a hierarchy from numbered Markdown filenames", () => {
    const paths = [
      "docs/2.1_Embedding.md",
      "docs/1.2_Configuration.md",
      "docs/2_Usage.md",
      "docs/1_Getting-Started.md",
      "docs/1.1_Installation.md",
    ];

    const documents = paths
      .map(parseDocumentFilename)
      .filter((document) => document !== undefined);

    const tree = buildDocumentTree(documents);

    expect(tree.map((node) => node.id)).toEqual(["1", "2"]);

    expect(tree[0]?.children.map((node) => node.id)).toEqual([
      "1.1",
      "1.2",
    ]);

    expect(tree[1]?.children.map((node) => node.id)).toEqual([
      "2.1",
    ]);
  });

  it("ignores Markdown files without a numeric prefix", () => {
    expect(parseDocumentFilename("docs/README.md")).toBeUndefined();
  });

  it("rejects children whose parent document is missing", () => {
    const child = parseDocumentFilename(
      "docs/1.1_Installation.md",
    );

    expect(() => buildDocumentTree(child ? [child] : [])).toThrow(
      'missing parent "1"',
    );
  });
});
