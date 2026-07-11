export type DocumentSource = {
  id: string;
  order: number[];
  title: string;
  filename: string;
  sourcePath: string;
};

export type DocumentNode = DocumentSource & {
  children: DocumentNode[];
};