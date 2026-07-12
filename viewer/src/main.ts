import { marked } from "marked";
import "./style.css";

type DocumentationManifest = {
  version: 1;
  documents: ManifestDocument[];
  tree: ManifestNode[];
};

type ManifestDocument = {
  id: string;
  title: string;
  contentPath: string;
};

type ManifestNode = {
  id: string;
  children: ManifestNode[];
};

type LoadedManifest = {
  manifest: DocumentationManifest;
  manifestUrl: URL;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error('Element "#app" was not found.');
}

app.innerHTML = `
  <div class="documentation-layout">
    <aside class="documentation-sidebar">
      <div class="documentation-brand">
        Markdown Doc Tree
      </div>

      <nav
        id="documentation-tree"
        aria-label="Documentation"
      ></nav>
    </aside>

    <main
      id="documentation-content"
      class="documentation-content"
    >
      <p>Loading documentation...</p>
    </main>
  </div>
`;

const treeElement =
  document.querySelector<HTMLElement>(
    "#documentation-tree",
  );

const contentElement =
  document.querySelector<HTMLElement>(
    "#documentation-content",
  );

if (!treeElement || !contentElement) {
  throw new Error(
    "Viewer elements could not be initialized.",
  );
}

await initializeViewer();

async function initializeViewer(): Promise<void> {
  try {
    const loadedManifest = await loadManifest();

    const {
      manifest,
      manifestUrl,
    } = loadedManifest;

    const documentsById = new Map(
      manifest.documents.map((document) => [
        document.id,
        document,
      ]),
    );

    window.addEventListener(
      "hashchange",
      async () => {
        const documentId =
          window.location.hash.slice(1);

        const document =
          documentsById.get(documentId);

        if (document) {
          await displayDocument(document, manifestUrl);
        }
      },
    );

    treeElement!.innerHTML = renderTree(
      manifest.tree,
      documentsById,
    );

    treeElement!.addEventListener(
      "click",
      (event) => {
        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        const link = target.closest<HTMLAnchorElement>(
          "[data-document-id]",
        );

        if (!link) {
          return;
        }

        event.preventDefault();

        const documentId =
          link.dataset.documentId;

        if (!documentId) {
          return;
        }

        if (
          window.location.hash ===
          `#${documentId}`
        ) {
          const document =
            documentsById.get(documentId);

          if (document) {
            void displayDocument(document, manifestUrl);
          }

          return;
        }

        window.location.hash = documentId;
      },
    );

    const initialDocument =
      findInitialDocument(
        manifest,
        window.location.hash.slice(1),
      );

    if (initialDocument) {
      await displayDocument(
        initialDocument, 
        manifestUrl
      );
    } else {
      contentElement!.innerHTML =
        "<p>No documents were found.</p>";
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    contentElement!.innerHTML = `
      <h1>Documentation could not be loaded</h1>
      <pre>${escapeHtml(message)}</pre>
    `;
  }
}

async function loadManifest(): Promise<LoadedManifest> {
  const searchParameters = new URLSearchParams(
    window.location.search,
  );

  const configuredManifestPath =
    searchParameters.get("manifest") ??
    "/docs-manifest.json";

  const manifestUrl = new URL(
    configuredManifestPath,
    window.location.href,
  );

  const response = await fetch(manifestUrl);

  if (!response.ok) {
    throw new Error(
      `Manifest request failed with status ${response.status}.`,
    );
  }

  const manifest =
    (await response.json()) as DocumentationManifest;

  return {
    manifest,
    manifestUrl,
  };
}

function renderTree(
  nodes: ManifestNode[],
  documentsById: Map<string, ManifestDocument>,
): string {
  const items = nodes
    .map((node) => {
      const document = documentsById.get(node.id);

      if (!document) {
        return "";
      }

      const children =
        node.children.length > 0
          ? renderTree(node.children, documentsById)
          : "";

      return `
        <li>
          <a
            href="#${document.id}"
            data-document-id="${document.id}"
          >
            <span class="document-id">
              ${document.id}
            </span>

            ${escapeHtml(document.title)}
          </a>

          ${children}
        </li>
      `;
    })
    .join("");

  return `<ul>${items}</ul>`;
}

function findInitialDocument(
  manifest: DocumentationManifest,
  requestedId: string,
): ManifestDocument | undefined {
  if (requestedId) {
    const requestedDocument =
      manifest.documents.find(
        (document) =>
          document.id === requestedId,
      );

    if (requestedDocument) {
      return requestedDocument;
    }
  }

  return manifest.documents[0];
}

async function displayDocument(
  document: ManifestDocument,
  manifestUrl: URL,
): Promise<void> {
  setActiveDocument(document.id);

  contentElement!.innerHTML =
    "<p>Loading document...</p>";

  const documentUrl = new URL(
    document.contentPath,
    manifestUrl,
  );

  const response = await fetch(documentUrl);

  if (!response.ok) {
    throw new Error(
      `Document "${document.id}" could not be loaded ` +
        `with status ${response.status}.`,
    );
  }

  const markdown = await response.text();
  const renderedHtml = await marked.parse(markdown);

  contentElement!.innerHTML = renderedHtml;

  resolveDocumentUrls(
    contentElement!,
    response.url,
  );
}

function resolveDocumentUrls(
  container: HTMLElement,
  documentUrl: string,
): void {
  resolveElementUrls(
    container.querySelectorAll<HTMLImageElement>(
      "img[src]",
    ),
    "src",
    documentUrl,
  );

  resolveElementUrls(
    container.querySelectorAll<HTMLAnchorElement>(
      "a[href]",
    ),
    "href",
    documentUrl,
  );
}

function resolveElementUrls<
  TElement extends HTMLElement,
>(
  elements: NodeListOf<TElement>,
  attributeName: "src" | "href",
  documentUrl: string,
): void {
  for (const element of elements) {
    const value =
      element.getAttribute(attributeName);

    if (!value || shouldKeepUrlUnchanged(value)) {
      continue;
    }

    const resolvedUrl = new URL(
      value,
      documentUrl,
    );

    element.setAttribute(
      attributeName,
      resolvedUrl.href,
    );
  }
}

function shouldKeepUrlUnchanged(
  value: string,
): boolean {
  return (
    value.startsWith("#") ||
    value.startsWith("data:") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  );
}

function setActiveDocument(
  documentId: string,
): void {
  const links =
    treeElement!.querySelectorAll<HTMLAnchorElement>(
      "[data-document-id]",
    );

  for (const link of links) {
    link.classList.toggle(
      "active",
      link.dataset.documentId === documentId,
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
