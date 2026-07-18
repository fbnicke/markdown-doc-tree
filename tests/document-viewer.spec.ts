// @vitest-environment happy-dom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import "../viewer/src/document-viewer.js";

const manifest = {
  version: 1,
  documents: [
    {
      id: "1",
      title: "Getting Started",
      contentPath: "content/1.md",
    },
    {
      id: "2",
      title: "Usage",
      contentPath: "content/2.md",
    },
    {
      id: "3",
      title: "Missing",
      contentPath: "content/missing.md",
    },
  ],
  tree: [
    {
      id: "1",
      children: [],
    },
    {
      id: "2",
      children: [],
    },
    {
      id: "3",
      children: [],
    },
  ],
};

describe("DocumentViewerElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(
      null,
      "",
      "/",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith("docs-manifest.json")) {
          return new Response(
            JSON.stringify(manifest),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.endsWith("content/1.md")) {
          return new Response(
            "# Getting Started",
            {
              status: 200,
            },
          );
        }

        if (url.endsWith("content/2.md")) {
          return new Response(
            "# Usage",
            {
              status: 200,
            },
          );
        }

        return new Response("Not found", {
          status: 404,
        });
      }),
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("uses internal navigation by default", async () => {
    const viewer = document.createElement(
      "markdown-doc-tree",
    );

    viewer.setAttribute(
      "manifest-url",
      "/docs-manifest.json",
    );

    document.body.append(viewer);

    await expectDocumentHeading(
      viewer,
      "Getting Started",
    );

    const usageLink =
      viewer.shadowRoot
        ?.querySelector<HTMLAnchorElement>(
          '[data-document-id="2"]',
        );

    expect(usageLink).not.toBeNull();

    usageLink?.click();

    await expectDocumentHeading(
      viewer,
      "Usage",
    );

    expect(window.location.hash).toBe("");
  });

  it("selects the configured initial document", async () => {
    const viewer = document.createElement(
      "markdown-doc-tree",
    );

    viewer.setAttribute(
      "manifest-url",
      "/docs-manifest.json",
    );

    viewer.setAttribute(
      "initial-document",
      "2",
    );

    document.body.append(viewer);

    await expectDocumentHeading(
      viewer,
      "Usage",
    );

    expect(window.location.hash).toBe("");
  });

  it("synchronizes document selection with the URL hash", async () => {
    const viewer = document.createElement(
      "markdown-doc-tree",
    );

    viewer.setAttribute(
      "manifest-url",
      "/docs-manifest.json",
    );

    viewer.setAttribute(
      "navigation-mode",
      "hash",
    );

    document.body.append(viewer);

    await expectDocumentHeading(
      viewer,
      "Getting Started",
    );

    const usageLink =
      viewer.shadowRoot
        ?.querySelector<HTMLAnchorElement>(
          '[data-document-id="2"]',
        );

    expect(usageLink).not.toBeNull();

    usageLink?.click();

    await vi.waitFor(() => {
      expect(window.location.hash).toBe("#2");
    });

    await expectDocumentHeading(
      viewer,
      "Usage",
    );
  });

  it("ignores a stale document response", async () => {
    let resolveUsageResponse!: (
      response: Response,
    ) => void;

    const delayedUsageResponse =
      new Promise<Response>((resolve) => {
        resolveUsageResponse = resolve;
      });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.endsWith("docs-manifest.json")) {
          return new Response(
            JSON.stringify(manifest),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.endsWith("content/1.md")) {
          return new Response(
            "# Getting Started",
            {
              status: 200,
            },
          );
        }

        if (url.endsWith("content/2.md")) {
          return delayedUsageResponse;
        }

        return new Response("Not found", {
          status: 404,
        });
      }),
    );

    const viewer = document.createElement(
      "markdown-doc-tree",
    );

    viewer.setAttribute(
      "manifest-url",
      "/docs-manifest.json",
    );

    document.body.append(viewer);

    await expectDocumentHeading(
      viewer,
      "Getting Started",
    );

    const usageLink =
      viewer.shadowRoot
        ?.querySelector<HTMLAnchorElement>(
          '[data-document-id="2"]',
        );

    const gettingStartedLink =
      viewer.shadowRoot
        ?.querySelector<HTMLAnchorElement>(
          '[data-document-id="1"]',
        );

    expect(usageLink).not.toBeNull();
    expect(gettingStartedLink).not.toBeNull();

    usageLink?.click();
    gettingStartedLink?.click();

    await expectDocumentHeading(
      viewer,
      "Getting Started",
    );

    resolveUsageResponse(
      new Response("# Usage", {
        status: 200,
      }),
    );

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const heading =
      viewer.shadowRoot
        ?.querySelector<HTMLElement>(
          "#documentation-content h1",
        );

    expect(heading?.textContent).toBe(
      "Getting Started",
    );
  });

  it("renders document loading failures", async () => {
    const viewer = document.createElement(
      "markdown-doc-tree",
    );

    viewer.setAttribute(
      "manifest-url",
      "/docs-manifest.json",
    );

    document.body.append(viewer);

    await expectDocumentHeading(
      viewer,
      "Getting Started",
    );

    const missingDocumentLink =
      viewer.shadowRoot
        ?.querySelector<HTMLAnchorElement>(
          '[data-document-id="3"]',
        );

    expect(missingDocumentLink).not.toBeNull();

    missingDocumentLink?.click();

    await expectDocumentHeading(
      viewer,
      "Document could not be loaded",
    );

    const errorDetails =
      viewer.shadowRoot
        ?.querySelector<HTMLElement>(
          "#documentation-content pre",
        );

    expect(errorDetails?.textContent).toContain(
      "status 404",
    );
  });
});

async function expectDocumentHeading(
  viewer: HTMLElement,
  expectedHeading: string,
): Promise<void> {
  await vi.waitFor(() => {
    const heading =
      viewer.shadowRoot
        ?.querySelector<HTMLElement>(
          "#documentation-content h1",
        );

    expect(heading?.textContent).toBe(
      expectedHeading,
    );
  });
}