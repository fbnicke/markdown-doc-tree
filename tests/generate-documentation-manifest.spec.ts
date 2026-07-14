import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { fileSystemDocumentationSourceReader, generateDocumentationManifest } from '../src/index.js';
import { fileSystemDocumentationManifestPublisher } from '../src/adapters/outbound/filesystem/file-system-documentation-manifest-publisher.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );

  temporaryDirectories.length = 0;
});

describe("generateDocumentationManifest", () => {
  it("writes the manifest and copies Markdown content", async () => {
    const temporaryRoot =
      await createTemporaryDirectory();

    const docsDirectory = path.join(
      temporaryRoot,
      "docs",
    );

    const outputDirectory = path.join(
      temporaryRoot,
      "output",
    );

    await mkdir(docsDirectory, {
      recursive: true,
    });

    await writeFile(
      path.join(
        docsDirectory,
        "1_Getting-Started.md",
      ),
      "# Getting Started\n",
      "utf8",
    );

    await generateDocumentationManifest(
      fileSystemDocumentationSourceReader,
      fileSystemDocumentationManifestPublisher,
      docsDirectory,
      {
        outputFile: path.join(
          outputDirectory,
          "docs-manifest.json",
        ),
      },
    );

    const manifest = JSON.parse(
      await readFile(
        path.join(
          outputDirectory,
          "docs-manifest.json",
        ),
        "utf8",
      ),
    );

    const copiedMarkdown = await readFile(
      path.join(
        outputDirectory,
        "content",
        "1_Getting-Started.md",
      ),
      "utf8",
    );

    expect(manifest.documents).toEqual([
      {
        id: "1",
        title: "Getting Started",
        contentPath:
          "content/1_Getting-Started.md",
      },
    ]);

    expect(copiedMarkdown).toBe(
      "# Getting Started\n",
    );
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(
    path.join(
      tmpdir(),
      "markdown-doc-tree-",
    ),
  );

  temporaryDirectories.push(directory);

  return directory;
}
