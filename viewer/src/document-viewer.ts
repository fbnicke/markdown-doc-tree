import { marked } from "marked";
import componentStyles from "./document-viewer.css?inline";

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

type NavigationMode = "internal" | "hash";

export class DocumentViewerElement extends HTMLElement {
  static readonly observedAttributes = [
    "manifest-url",
    "navigation-mode",
    "initial-document",
  ];

  readonly #shadowRoot: ShadowRoot;
  readonly #treeElement: HTMLElement;
  readonly #contentElement: HTMLElement;

  #documentsById = new Map<string, ManifestDocument>();
  #manifestUrl?: URL;
  #initializationId = 0;
  #connected = false;
  #hashChangeListenerAttached = false;
  #documentLoadId = 0;

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "open" });
    this.#shadowRoot.innerHTML = `
      <style>${componentStyles}</style>

      <div
        class="documentation-layout"
        part="layout"
      >
        <aside class="documentation-sidebar" part="sidebar">
          <div class="documentation-brand" part="brand">
            Markdown Doc Tree
          </div>

          <nav
            id="documentation-tree"
            aria-label="Documentation"
            part="navigation"
          ></nav>
        </aside>

        <main
          id="documentation-content"
          class="documentation-content"
          part="content"
        >
          <p>Loading documentation...</p>
        </main>
      </div>
    `;

    const treeElement =
      this.#shadowRoot.querySelector<HTMLElement>(
        "#documentation-tree",
      );

    const contentElement =
      this.#shadowRoot.querySelector<HTMLElement>(
        "#documentation-content",
      );

    if (!treeElement || !contentElement) {
      throw new Error(
        "Viewer elements could not be initialized.",
      );
    }

    this.#treeElement = treeElement;
    this.#contentElement = contentElement;
  }

  connectedCallback(): void {
    this.#connected = true;

    this.#treeElement.addEventListener(
      "click",
      this.#handleTreeClick,
    );

    this.#synchronizeHashChangeListener();

    void this.#initializeViewer();
  }

  disconnectedCallback(): void {
    this.#connected = false;
    ++this.#documentLoadId;

    this.#treeElement.removeEventListener(
      "click",
      this.#handleTreeClick,
    );

    this.#synchronizeHashChangeListener();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (
      oldValue === newValue ||
      !this.#connected
    ) {
      return;
    }

    if (name === "navigation-mode") {
      this.#synchronizeHashChangeListener();
    }

    void this.#initializeViewer();
  }

  async #initializeViewer(): Promise<void> {
    const initializationId = ++this.#initializationId;

    ++this.#documentLoadId;

    this.#contentElement.innerHTML =
      "<p>Loading documentation...</p>";

    try {
      const loadedManifest = await this.#loadManifest();

      if (initializationId !== this.#initializationId) {
        return;
      }

      const { manifest, manifestUrl } = loadedManifest;

      this.#manifestUrl = manifestUrl;
      this.#documentsById = new Map(
        manifest.documents.map((document) => [
          document.id,
          document,
        ]),
      );

      this.#treeElement.innerHTML = this.#renderTree(
        manifest.tree,
      );

      const initialDocument = this.#findInitialDocument(
        manifest,
      );

      if (initialDocument) {
        await this.#displayDocument(initialDocument);
      } else {
        this.#contentElement.innerHTML =
          "<p>No documents were found.</p>";
      }
    } catch (error: unknown) {
      if (initializationId !== this.#initializationId) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      this.#contentElement.innerHTML = `
        <h1>Documentation could not be loaded</h1>
        <pre>${escapeHtml(message)}</pre>
      `;
    }
  }

  async #loadManifest(): Promise<LoadedManifest> {
    const configuredManifestPath =
      this.getAttribute("manifest-url") ??
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

  #renderTree(nodes: ManifestNode[]): string {
    const items = nodes
      .map((node) => {
        const document = this.#documentsById.get(node.id);

        if (!document) {
          return "";
        }

        const children =
          node.children.length > 0
            ? this.#renderTree(node.children)
            : "";

        return `
          <li part="navigation-item">
            <a
              href="#${document.id}"
              data-document-id="${document.id}"
              part="navigation-link"
            >
              <span class="document-id" part="document-id">
                ${document.id}
              </span>

              ${escapeHtml(document.title)}
            </a>

            ${children}
          </li>
        `;
      })
      .join("");

    return `<ul part="navigation-list">${items}</ul>`;
  }

  #findInitialDocument(
    manifest: DocumentationManifest,
  ): ManifestDocument | undefined {
    const hashDocument =
      this.#getNavigationMode() === "hash"
        ? this.#findDocument(
            manifest,
            window.location.hash.slice(1),
          )
        : undefined;

    if (hashDocument) {
      return hashDocument;
    }

    const configuredDocument = this.#findDocument(
      manifest,
      this.getAttribute("initial-document"),
    );

    return configuredDocument ?? manifest.documents[0];
  }

  #findDocument(
    manifest: DocumentationManifest,
    documentId: string | null,
  ): ManifestDocument | undefined {
    if (!documentId) {
      return undefined;
    }

    return manifest.documents.find(
      (document) => document.id === documentId,
    );
  }

  async #displayDocument(
    document: ManifestDocument,
  ): Promise<void> {
    const documentLoadId =
      ++this.#documentLoadId;

    this.#setActiveDocument(document.id);

    this.#contentElement.innerHTML =
      "<p>Loading document...</p>";

    try {
      if (!this.#manifestUrl) {
        throw new Error(
          "Manifest URL is not available.",
        );
      }

      const documentUrl = new URL(
        document.contentPath,
        this.#manifestUrl,
      );

      const response = await fetch(documentUrl);

      if (
        documentLoadId !== this.#documentLoadId
      ) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Document "${document.id}" could not be loaded ` +
            `with status ${response.status}.`,
        );
      }

      const markdown = await response.text();

      if (
        documentLoadId !== this.#documentLoadId
      ) {
        return;
      }

      const renderedHtml =
        await marked.parse(markdown);

      if (
        documentLoadId !== this.#documentLoadId
      ) {
        return;
      }

      this.#contentElement.innerHTML =
        renderedHtml;

      resolveDocumentUrls(
        this.#contentElement,
        response.url,
      );
    } catch (error: unknown) {
      if (
        documentLoadId !== this.#documentLoadId
      ) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      this.#contentElement.innerHTML = `
        <h1>Document could not be loaded</h1>
        <pre>${escapeHtml(message)}</pre>
      `;
    }
  }

  readonly #handleHashChange = (): void => {
    if (this.#getNavigationMode() !== "hash") {
      return;
    }

    const documentId =
      window.location.hash.slice(1);

    const document =
      this.#documentsById.get(documentId);

    if (document) {
      void this.#displayDocument(document);
    }
  };

  readonly #handleTreeClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest<HTMLAnchorElement>(
      "[data-document-id]",
    );

    if (!link) {
      return;
    }

    event.preventDefault();

    const documentId = link.dataset.documentId;

    if (!documentId) {
      return;
    }

    const document = this.#documentsById.get(documentId);

    if (!document) {
      return
    };

    if(
      this.#getNavigationMode() === "internal"
    ) {
      void this.#displayDocument(document);
      return;
    }

    if (window.location.hash === `#${documentId}`) {
      void this.#displayDocument(document);
      return;
    }

    window.location.hash = documentId;
  };

  #setActiveDocument(documentId: string): void {
    const links =
      this.#treeElement.querySelectorAll<HTMLAnchorElement>(
        "[data-document-id]",
      );

    for (const link of links) {
      const active = link.dataset.documentId === documentId;

      link.classList.toggle(
        "active",
        active,
      );

      link.setAttribute(
        "part",
        active
          ? "navigation-link navigation-link-active"
          : "navigation-link",
      );
    }
  }

  #getNavigationMode(): NavigationMode {
    return this.getAttribute(
      "navigation-mode",
    ) === "hash" 
      ? "hash" 
      : "internal";
  }

  #synchronizeHashChangeListener(): void {
    const shouldListen =
      this.#connected &&
      this.#getNavigationMode() === "hash";

    if (
      shouldListen ===
      this.#hashChangeListenerAttached
    ) {
      return;
    }

    if (shouldListen) {
      window.addEventListener(
        "hashchange",
        this.#handleHashChange,
      );
    } else {
      window.removeEventListener(
        "hashchange",
        this.#handleHashChange,
      );
    }

    this.#hashChangeListenerAttached = shouldListen;
  }
}

function resolveDocumentUrls(
  container: HTMLElement,
  documentUrl: string,
): void {
  resolveElementUrls(
    container.querySelectorAll<HTMLImageElement>("img[src]"),
    "src",
    documentUrl,
  );

  resolveElementUrls(
    container.querySelectorAll<HTMLAnchorElement>("a[href]"),
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
    const value = element.getAttribute(attributeName);

    if (!value || shouldKeepUrlUnchanged(value)) {
      continue;
    }

    const resolvedUrl = new URL(value, documentUrl);

    element.setAttribute(attributeName, resolvedUrl.href);
  }
}

function shouldKeepUrlUnchanged(value: string): boolean {
  return (
    value.startsWith("#") ||
    value.startsWith("data:") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (!customElements.get("markdown-doc-tree")) {
  customElements.define(
    "markdown-doc-tree",
    DocumentViewerElement,
  );
}

declare global {
  interface HTMLElementTagNameMap {
    "markdown-doc-tree": DocumentViewerElement;
  }
}
