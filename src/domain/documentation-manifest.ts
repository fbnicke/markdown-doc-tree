export type DocumentationManifest = {
  version: 1;
  documents: ManifestDocument[];
  tree: ManifestNode[];
};

export type ManifestDocument = {
  id: string;
  title: string;
  contentPath: string;
};

export type ManifestNode = {
  id: string;
  children: ManifestNode[];
};
