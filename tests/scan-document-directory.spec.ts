import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanDocumentDirectory } from "../src/scan-document-directory.js";

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
  it("recursively discovers numbered Markdown documents", async () => {
    const root = await createTemporaryDirectory();

    await writeFile(
      path.join(root, "1_Getting-Started.md"),
      "# Getting Started",
    );

    await mkdir(path.join(root, "installation"));

    await writeFile(
      path.join(root, "installation", "1.1_Installation.md"),
      "# Installation",
    );

    await writeFile(
      path.join(root, "README.md"),
      "# Ignored",
    );

    await writeFile(
      path.join(root, "notes.txt"),
      "Ignored",
    );

    const documents = await scanDocumentDirectory(root);

    expect(
      documents.map((document) => document.id).sort(),
    ).toEqual(["1", "1.1"]);
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(
    path.join(tmpdir(), "opensource-doc-tree-"),
  );

  temporaryDirectories.push(directory);

  return directory;
}