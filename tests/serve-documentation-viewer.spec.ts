import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import type {
  AddressInfo,
} from "node:net";
import os from "node:os";
import path from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { createViewerServer } from '../src/adapters/inbound/cli/serve-documentation-viewer.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(
      (directory) =>
        rm(directory, {
          recursive: true,
          force: true,
        }),
    ),
  );
});

describe("documentation viewer server", () => {
  it(
    "serves the viewer shell, bundle, manifest, Markdown, and assets",
    async () => {
      const fixture =
        await createServerFixture();

      const server = createViewerServer({
        workspaceDirectory:
          fixture.workspaceDirectory,
        viewerBundleFile:
          fixture.viewerBundleFile,
      });

      await listenOnAvailablePort(server);

      try {
        const baseUrl = serverUrl(server);

        const shellResponse = await fetch(
          `${baseUrl}/`,
        );

        expect(shellResponse.status).toBe(200);
        expect(
          shellResponse.headers.get(
            "content-type",
          ),
        ).toContain("text/html");

        const shell =
          await shellResponse.text();

        expect(shell).toContain(
          'manifest-url="/docs-manifest.json"',
        );
        expect(shell).toContain(
          'src="/viewer.js"',
        );

        const viewerResponse = await fetch(
          `${baseUrl}/viewer.js`,
        );

        expect(viewerResponse.status).toBe(200);
        expect(
          viewerResponse.headers.get(
            "content-type",
          ),
        ).toContain("text/javascript");
        expect(
          await viewerResponse.text(),
        ).toBe(
          'customElements.define("markdown-doc-tree", class extends HTMLElement {});',
        );

        const manifestResponse =
          await fetch(
            `${baseUrl}/docs-manifest.json`,
          );

        expect(
          manifestResponse.status,
        ).toBe(200);
        expect(
          manifestResponse.headers.get(
            "content-type",
          ),
        ).toContain("application/json");
        expect(
          await manifestResponse.json(),
        ).toEqual({
          version: 1,
          documents: [],
          tree: [],
        });

        const markdownResponse =
          await fetch(
            `${baseUrl}/content/1_Introduction.md`,
          );

        expect(
          markdownResponse.status,
        ).toBe(200);
        expect(
          markdownResponse.headers.get(
            "content-type",
          ),
        ).toContain("text/markdown");
        expect(
          await markdownResponse.text(),
        ).toBe("# Introduction\n");

        const imageResponse = await fetch(
          `${baseUrl}/content/images/example.png`,
        );

        expect(imageResponse.status).toBe(200);
        expect(
          imageResponse.headers.get(
            "content-type",
          ),
        ).toContain("image/png");
      } finally {
        await closeServer(server);
      }
    },
  );

  it(
    "returns 404 for missing files",
    async () => {
      const fixture =
        await createServerFixture();

      const server = createViewerServer({
        workspaceDirectory:
          fixture.workspaceDirectory,
        viewerBundleFile:
          fixture.viewerBundleFile,
      });

      await listenOnAvailablePort(server);

      try {
        const response = await fetch(
          `${serverUrl(server)}/missing.md`,
        );

        expect(response.status).toBe(404);
        expect(
          await response.text(),
        ).toBe("Not found.");
      } finally {
        await closeServer(server);
      }
    },
  );

  it(
    "does not serve files outside the generated workspace",
    async () => {
      const fixture =
        await createServerFixture();

      const secretFile = path.join(
        path.dirname(
          fixture.workspaceDirectory,
        ),
        "secret.txt",
      );

      await writeFile(
        secretFile,
        "not public",
        "utf8",
      );

      const server = createViewerServer({
        workspaceDirectory:
          fixture.workspaceDirectory,
        viewerBundleFile:
          fixture.viewerBundleFile,
      });

      await listenOnAvailablePort(server);

      try {
        const response = await fetch(
          `${serverUrl(server)}/..%2Fsecret.txt`,
        );

        expect(response.status).toBe(404);
        expect(
          await response.text(),
        ).toBe("Not found.");
      } finally {
        await closeServer(server);
      }
    },
  );
});

async function createServerFixture(): Promise<{
  workspaceDirectory: string;
  viewerBundleFile: string;
}> {
  const fixtureDirectory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "markdown-doc-tree-server-test-",
    ),
  );

  temporaryDirectories.push(
    fixtureDirectory,
  );

  const workspaceDirectory = path.join(
    fixtureDirectory,
    "workspace",
  );

  const contentDirectory = path.join(
    workspaceDirectory,
    "content",
  );

  const imageDirectory = path.join(
    contentDirectory,
    "images",
  );

  await mkdir(imageDirectory, {
    recursive: true,
  });

  await writeFile(
    path.join(
      workspaceDirectory,
      "docs-manifest.json",
    ),
    JSON.stringify({
      version: 1,
      documents: [],
      tree: [],
    }),
    "utf8",
  );

  await writeFile(
    path.join(
      contentDirectory,
      "1_Introduction.md",
    ),
    "# Introduction\n",
    "utf8",
  );

  await writeFile(
    path.join(
      imageDirectory,
      "example.png",
    ),
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
    ]),
  );

  const viewerBundleFile = path.join(
    fixtureDirectory,
    "viewer.js",
  );

  await writeFile(
    viewerBundleFile,
    'customElements.define("markdown-doc-tree", class extends HTMLElement {});',
    "utf8",
  );

  return {
    workspaceDirectory,
    viewerBundleFile,
  };
}

function listenOnAvailablePort(
  server: ReturnType<
    typeof createViewerServer
  >,
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      server.once("error", reject);

      server.listen(
        0,
        "127.0.0.1",
        () => {
          server.off(
            "error",
            reject,
          );

          resolve();
        },
      );
    },
  );
}

function serverUrl(
  server: ReturnType<
    typeof createViewerServer
  >,
): string {
  const address = server.address();

  if (
    !address ||
    typeof address === "string"
  ) {
    throw new Error(
      "Expected the test server to use a TCP address.",
    );
  }

  return `http://127.0.0.1:${
    (address as AddressInfo).port
  }`;
}

function closeServer(
  server: ReturnType<
    typeof createViewerServer
  >,
): Promise<void> {
  server.closeAllConnections();

  return new Promise(
    (resolve, reject) => {
      server.close((error: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    },
  );
}