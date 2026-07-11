import type {
  DocumentNode,
  DocumentSource,
} from "./document-node.js";

export type MissingParentBehavior =
  | "error"
  | "promote-to-root"
  | "attach-to-nearest-ancestor";

export type BuildDocumentTreeOptions = {
  missingParentBehavior?: MissingParentBehavior;
};

export function buildDocumentTree(
  documents: DocumentSource[],
  options: BuildDocumentTreeOptions = {},
): DocumentNode[] {
  const missingParentBehavior =
    options.missingParentBehavior ?? "error";

  const nodes = new Map<string, DocumentNode>();

  for (const document of documents) {
    if (nodes.has(document.id)) {
      throw new Error(`Duplicate document id: ${document.id}`);
    }

    nodes.set(document.id, {
      ...document,
      children: [],
    });
  }

  const roots: DocumentNode[] = [];

  for (const node of nodes.values()) {
    const directParentId = getParentId(node.id);

    if (!directParentId) {
      roots.push(node);
      continue;
    }

    const directParent = nodes.get(directParentId);

    if (directParent) {
      directParent.children.push(node);
      continue;
    }

    if (missingParentBehavior === "error") {
      throw new Error(
        `Document "${node.id}" references missing parent "${directParentId}".`,
      );
    }

    if (
      missingParentBehavior ===
      "attach-to-nearest-ancestor"
    ) {
      const nearestAncestor = findNearestAncestor(
        node.id,
        nodes,
      );

      if (nearestAncestor) {
        nearestAncestor.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  sortNodes(roots);

  return roots;
}

function getParentId(id: string): string | undefined {
  const segments = id.split(".");

  if (segments.length === 1) {
    return undefined;
  }

  return segments.slice(0, -1).join(".");
}

function findNearestAncestor(
  id: string,
  nodes: Map<string, DocumentNode>,
): DocumentNode | undefined {
  const segments = id.split(".");

  for (
    let length = segments.length - 2;
    length >= 1;
    length -= 1
  ) {
    const ancestorId = segments
      .slice(0, length)
      .join(".");

    const ancestor = nodes.get(ancestorId);

    if (ancestor) {
      return ancestor;
    }
  }

  return undefined;
}

function sortNodes(nodes: DocumentNode[]): void {
  nodes.sort((left, right) =>
    compareOrder(left.order, right.order),
  );

  for (const node of nodes) {
    sortNodes(node.children);
  }
}

function compareOrder(
  left: number[],
  right: number[],
): number {
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const difference =
      (left[index] ?? Number.NEGATIVE_INFINITY) -
      (right[index] ?? Number.NEGATIVE_INFINITY);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}