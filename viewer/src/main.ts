import "./index.js";

const viewer =
  document.querySelector<HTMLElement>(
    "markdown-doc-tree",
  );

if (!viewer) {
  throw new Error(
    'Element "markdown-doc-tree" was not found.',
  );
}

const configuredManifestPath =
  new URLSearchParams(window.location.search).get(
    "manifest",
  );

if (configuredManifestPath) {
  viewer.setAttribute(
    "manifest-url",
    configuredManifestPath,
  );
}
