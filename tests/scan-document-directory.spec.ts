import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileSystemDocumentationSourceReader } from '../src/index.js';

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

describe("scanDocumentDirectory", () => {
  it("discovers numbered Markdown documents in the root directory and ignores nested directories in root", async () => {
    const root = await createTemporaryDirectory();

    await writeFile(
      path.join(root, "1_Getting-Started.md"),
      "# Getting Started",
    );

    await mkdir(path.join(root, "nested"));

    await writeFile(
      path.join(
        root,
        "nested",
        "1.1_Installation.md",
      ),
      "# Installation",
    );

    const documents = await fileSystemDocumentationSourceReader.read(root);

    expect(
      documents.map((document) => document.id),
    ).toEqual(["1"]);
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(
    path.join(tmpdir(), "markdown-doc-tree-"),
  );

  temporaryDirectories.push(directory);

  return directory;
}
