import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { marked } from "marked";
import type { DocumentNode } from "./document-node.js";
import {
  validateDocumentationDirectory,
  type ValidateDocumentationOptions,
} from "./validate-documentation.js";

export type GenerateDocumentationManualOptions =
  ValidateDocumentationOptions & {
    outputFile: string;
    title?: string;
  };

export async function generateDocumentationManual(
  rootDirectory: string,
  options: GenerateDocumentationManualOptions,
): Promise<void> {
  const validation =
    await validateDocumentationDirectory(
      rootDirectory,
      {
        missingParentSeverity:
          options.missingParentSeverity,
      },
    );

  if (!validation.valid) {
    throw new Error(
      "Cannot generate a manual from invalid documentation.",
    );
  }

  const outputFile = path.resolve(
    options.outputFile,
  );

  const outputDirectory = path.dirname(
    outputFile,
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const body = await renderDocumentNodes(
    validation.tree,
    rootDirectory,
  );

  const html = createManualHtml({
    title: options.title ?? "Documentation Manual",
    body,
  });

  const htmlFile = path.join(
    outputDirectory,
    "manual.html",
  );

  await writeFile(htmlFile, html, "utf8");

  await renderPdf(htmlFile, outputFile);
}

async function renderDocumentNodes(
  nodes: DocumentNode[],
  rootDirectory: string,
): Promise<string> {
  const renderedNodes: string[] = [];

  for (const node of nodes) {
    renderedNodes.push(
      await renderDocumentNode(
        node,
        rootDirectory,
      ),
    );
  }

  return renderedNodes.join("\n");
}

async function renderDocumentNode(
  node: DocumentNode,
  rootDirectory: string,
): Promise<string> {
  const markdown = await readFile(
    node.sourcePath,
    "utf8",
  );

  const html = await marked.parse(markdown);

  const rewrittenHtml = rewriteRelativeAssetUrls(
    html,
    node.sourcePath,
    rootDirectory,
  );

  const children = await renderDocumentNodes(
    node.children,
    rootDirectory,
  );

  return `
    <section
      class="manual-section manual-level-${node.order.length}"
      id="document-${escapeAttribute(node.id)}"
    >
      <div class="manual-document">
        ${rewrittenHtml}
      </div>

      ${children}
    </section>
  `;
}

function rewriteRelativeAssetUrls(
  html: string,
  sourcePath: string,
  rootDirectory: string,
): string {
  const sourceDirectory = path.dirname(
    sourcePath,
  );

  return html.replace(
    /(<(?:img|source)\b[^>]*?\s(?:src|srcset)=["'])([^"']+)(["'])/gi,
    (
      fullMatch,
      prefix: string,
      value: string,
      suffix: string,
    ) => {
      if (shouldKeepUrl(value)) {
        return fullMatch;
      }

      const absolutePath = path.resolve(
        sourceDirectory,
        value,
      );

      assertAssetInsideRoot(
        absolutePath,
        rootDirectory,
      );

      return `${prefix}${pathToFileURL(
        absolutePath,
      ).href}${suffix}`;
    },
  );
}

function shouldKeepUrl(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("file:")
  );
}

function assertAssetInsideRoot(
  assetPath: string,
  rootDirectory: string,
): void {
  const relativePath = path.relative(
    path.resolve(rootDirectory),
    path.resolve(assetPath),
  );

  const outsideRoot =
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath);

  if (outsideRoot) {
    throw new Error(
      `Asset is outside documentation root: ${assetPath}`,
    );
  }
}

type ManualHtmlOptions = {
  title: string;
  body: string;
};

function createManualHtml(
  options: ManualHtmlOptions,
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />

    <title>${escapeHtml(options.title)}</title>

    <style>
      @page {
        size: A4;
        margin: 20mm 18mm 22mm 18mm;

        @bottom-center {
          content: counter(page);
          font-size: 9pt;
          color: #64748b;
        }
      }

      :root {
        font-family:
          Arial,
          Helvetica,
          sans-serif;

        color: #1f2937;
        font-size: 11pt;
        line-height: 1.55;
      }

      body {
        margin: 0;
      }

      .title-page {
        display: flex;
        min-height: 240mm;
        flex-direction: column;
        justify-content: center;
        page-break-after: always;
      }

      .title-page h1 {
        margin: 0;
        font-size: 30pt;
      }

      .title-page p {
        margin-top: 12mm;
        color: #64748b;
      }

      .manual-level-1 {
        break-before: page;
      }

      .manual-level-1:first-of-type {
        break-before: auto;
      }

      h1,
      h2,
      h3,
      h4 {
        break-after: avoid;
        color: #0f172a;
      }

      h1 {
        font-size: 24pt;
      }

      h2 {
        margin-top: 10mm;
        font-size: 18pt;
      }

      h3 {
        margin-top: 7mm;
        font-size: 14pt;
      }

      p,
      li {
        orphans: 3;
        widows: 3;
      }

      img {
        display: block;
        max-width: 100%;
        max-height: 220mm;
        margin: 6mm auto;
        object-fit: contain;
        break-inside: avoid;
      }

      pre {
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        padding: 4mm;
        border: 1px solid #cbd5e1;
        border-radius: 2mm;
        background: #f8fafc;
        font-size: 9pt;
        break-inside: avoid;
      }

      code {
        font-family:
          "Cascadia Mono",
          "Courier New",
          monospace;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        break-inside: avoid;
      }

      th,
      td {
        padding: 2.5mm;
        border: 1px solid #cbd5e1;
        text-align: left;
      }

      a {
        color: inherit;
      }
    </style>
  </head>

  <body>
    <section class="title-page">
      <h1>${escapeHtml(options.title)}</h1>
      <p>Generated with Markdown Doc Tree</p>
    </section>

    <main>
      ${options.body}
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(
  value: string,
): string {
  return escapeHtml(value);
}

async function renderPdf(
  htmlFile: string,
  outputFile: string,
): Promise<void> {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    await page.goto(
      pathToFileURL(htmlFile).href,
      {
        waitUntil: "networkidle",
      },
    );

    await page.emulateMedia({
      media: "print",
    });

    await page.pdf({
      path: outputFile,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
  } finally {
    await browser.close();
  }
}
