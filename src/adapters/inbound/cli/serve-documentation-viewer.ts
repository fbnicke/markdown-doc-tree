import {
  createReadStream,
  existsSync,
} from "node:fs";
import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import http, {
  type ServerResponse,
} from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  spawn,
} from "node:child_process";
import {
  fileURLToPath,
} from "node:url";

import type {
  DocumentationDiagnosticSeverity,
} from "../../../domain/documentation-diagnostic.js";
import {
  generateDocumentationManifest,
} from "../../../application/use-cases/generate-documentation-manifest.js";
import {
  fileSystemDocumentationSourceReader,
} from "../../outbound/filesystem/scan-document-directory.js";
import {
  fileSystemDocumentationManifestPublisher,
} from "../../outbound/filesystem/file-system-documentation-manifest-publisher.js";

export type ServeDocumentationViewerOptions = {
  port: number;
  openBrowser: boolean;
  missingParentSeverity: DocumentationDiagnosticSeverity;
};

export async function serveDocumentationViewer(
  rootDirectory: string,
  options: ServeDocumentationViewerOptions,
): Promise<void> {
  const workspaceDirectory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "markdown-doc-tree-",
    ),
  );

  const manifestFile = path.join(
    workspaceDirectory,
    "docs-manifest.json",
  );

  try {
    await generateDocumentationManifest(
      fileSystemDocumentationSourceReader,
      fileSystemDocumentationManifestPublisher,
      rootDirectory,
      {
        outputFile: manifestFile,
        missingParentSeverity:
          options.missingParentSeverity,
      },
    );

    const viewerBundleFile =
      resolveViewerBundleFile();

    const server = createViewerServer({
      workspaceDirectory,
      viewerBundleFile,
    });

    await listen(server, options.port);

    const viewerUrl =
      `http://localhost:${options.port}`;

    console.log();
    console.log(
      `Documentation viewer available at:\n${viewerUrl}`,
    );
    console.log();
    console.log(
      "Press Ctrl+C to stop the server.",
    );

    if (options.openBrowser) {
      openBrowser(viewerUrl);
    }

    registerShutdownHandler(
      server,
      workspaceDirectory,
    );
  } catch (error: unknown) {
    await rm(workspaceDirectory, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}

export type CreateViewerServerOptions = {
  workspaceDirectory: string;
  viewerBundleFile: string;
};

export function createViewerServer(
  options: CreateViewerServerOptions,
): http.Server {
  return http.createServer(
    (request, response) => {
      void handleRequest(
        request.url,
        response,
        options,
      ).catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          `Viewer request failed: ${message}`,
        );

        if (!response.headersSent) {
          response.writeHead(500, {
            "content-type":
              "text/plain; charset=utf-8",
          });
        }

        response.end(
          "Internal server error.",
        );
      });
    },
  );
}

async function handleRequest(
  requestUrl: string | undefined,
  response: ServerResponse,
  options: CreateViewerServerOptions,
): Promise<void> {
  const url = new URL(
    requestUrl ?? "/",
    "http://localhost",
  );

  if (url.pathname === "/") {
    sendText(
      response,
      200,
      "text/html; charset=utf-8",
      createViewerHtml(),
    );

    return;
  }

  if (url.pathname === "/viewer.js") {
    sendFile(
      response,
      options.viewerBundleFile,
    );

    return;
  }

  const requestedFile =
    resolveWorkspaceFile(
      options.workspaceDirectory,
      url.pathname,
    );

  if (
    !requestedFile ||
    !existsSync(requestedFile)
  ) {
    sendText(
      response,
      404,
      "text/plain; charset=utf-8",
      "Not found.",
    );

    return;
  }

  sendFile(response, requestedFile);
}

function resolveWorkspaceFile(
  workspaceDirectory: string,
  requestPath: string,
): string | undefined {
  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(
      requestPath,
    );
  } catch {
    return undefined;
  }

  const relativeRequestPath =
    decodedPath.replace(/^\/+/, "");

  const resolvedFile = path.resolve(
    workspaceDirectory,
    relativeRequestPath,
  );

  const relativePath = path.relative(
    workspaceDirectory,
    resolvedFile,
  );

  const escapesWorkspace =
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath);

  if (escapesWorkspace) {
    return undefined;
  }

  return resolvedFile;
}

function sendFile(
  response: ServerResponse,
  file: string,
): void {
  response.writeHead(200, {
    "content-type": contentTypeFor(file),
  });

  const stream = createReadStream(file);

  stream.on("error", (error: Error) => {
    console.error(
      `Could not read "${file}": ${error.message}`,
    );

    if (!response.headersSent) {
      response.writeHead(500, {
        "content-type":
          "text/plain; charset=utf-8",
      });
    }

    response.end(
      "Could not read requested file.",
    );
  });

  stream.pipe(response);
}

function sendText(
  response: ServerResponse,
  statusCode: number,
  contentType: string,
  content: string,
): void {
  response.writeHead(statusCode, {
    "content-type": contentType,
  });

  response.end(content);
}

function createViewerHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Markdown Doc Tree</title>

    <style>
      html,
      body {
        height: 100%;
      }

      body {
        margin: 0;
      }

      markdown-doc-tree {
        display: block;
        height: 100%;
      }
    </style>
  </head>

  <body>
    <markdown-doc-tree
      manifest-url="/docs-manifest.json"
      navigation-mode="hash"
    ></markdown-doc-tree>

    <script
      type="module"
      src="/viewer.js"
    ></script>
  </body>
</html>
`;
}

function resolveViewerBundleFile(): string {
  const packageRoot = fileURLToPath(
    new URL(
      "../../../../",
      import.meta.url,
    ),
  );

  const viewerBundleFile = path.join(
    packageRoot,
    "dist",
    "viewer",
    "markdown-doc-tree.js",
  );

  if (!existsSync(viewerBundleFile)) {
    throw new Error(
      [
        "The viewer bundle was not found.",
        `Expected it at: ${viewerBundleFile}`,
        "Run `npm run viewer:build:library` first.",
      ].join("\n"),
    );
  }

  return viewerBundleFile;
}

function listen(
  server: http.Server,
  port: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleError = (
      error: NodeJS.ErrnoException,
    ): void => {
      server.off("listening", handleListening);

      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${port} is already in use.`,
          ),
        );

        return;
      }

      reject(error);
    };

    const handleListening = (): void => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once(
      "listening",
      handleListening,
    );

    server.listen(port, "127.0.0.1");
  });
}

function registerShutdownHandler(
  server: http.Server,
  workspaceDirectory: string,
): void {
  let shuttingDown = false;

  const shutdown = (): void => {
    if (shuttingDown) {
      console.log(
        "Forcing documentation viewer shutdown...",
      );

      server.closeAllConnections();
      process.exit(1);
    }

    shuttingDown = true;

    console.log();
    console.log(
      "Stopping documentation viewer...",
    );

    server.close();

    server.closeAllConnections();

    void rm(workspaceDirectory, {
      recursive: true,
      force: true,
    })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          `Could not remove temporary viewer files: ${message}`,
        );
      })
      .finally(() => {
        process.exit(0);
      });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function openBrowser(url: string): void {
  const command =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";

  const args =
    process.platform === "win32"
      ? ["/c", "start", "", url]
      : [url];

  const child = spawn(
    command,
    args,
    {
      detached: true,
      stdio: "ignore",
    },
  );

  child.on("error", (error: Error) => {
    console.warn(
      [
        "Could not open the browser automatically.",
        error.message,
        `Open this URL manually: ${url}`,
      ].join("\n"),
    );
  });

  child.unref();
}

function contentTypeFor(
  file: string,
): string {
  switch (
    path.extname(file).toLowerCase()
  ) {
    case ".html":
      return "text/html; charset=utf-8";

    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";

    case ".json":
      return "application/json; charset=utf-8";

    case ".md":
      return "text/markdown; charset=utf-8";

    case ".css":
      return "text/css; charset=utf-8";

    case ".svg":
      return "image/svg+xml";

    case ".png":
      return "image/png";

    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".gif":
      return "image/gif";

    case ".webp":
      return "image/webp";

    default:
      return "application/octet-stream";
  }
}