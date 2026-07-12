import { describe, expect, it } from "vitest";
import { buildDocumentTree } from "../src/build-document-tree.js";
import { buildDocumentationManifest } from "../src/build-documentation-manifest.js";
import { parseDocumentFilename } from "../src/parse-document-filename.js";

describe("buildDocumentationManifest", () => {
  it("creates a portable manifest from documents and tree", () => {
    const documents = [
      "docs/2_Usage.md",
      "docs/1.1_Installation.md",
      "docs/1_Getting-Started.md",
    ]
      .map(parseDocumentFilename)
      .filter((document) => document !== undefined);

    const tree = buildDocumentTree(documents);

    const manifest = buildDocumentationManifest(
      documents,
      tree,
    );

    expect(manifest).toEqual({
      version: 1,
      documents: [
        {
          id: "1",
          title: "Getting Started",
          contentPath: "content/1_Getting-Started.md",
        },
        {
          id: "1.1",
          title: "Installation",
          contentPath: "content/1.1_Installation.md",
        },
        {
          id: "2",
          title: "Usage",
          contentPath: "content/2_Usage.md",
        },
      ],
      tree: [
        {
          id: "1",
          children: [
            {
              id: "1.1",
              children: [],
            },
          ],
        },
        {
          id: "2",
          children: [],
        },
      ],
    });
  });
});
