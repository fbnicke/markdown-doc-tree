import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const viewerRoot = fileURLToPath(
  new URL(".", import.meta.url),
);

const entryFile = fileURLToPath(
  new URL("./src/index.ts", import.meta.url),
);

export default defineConfig({
  root: viewerRoot,

  build: {
    lib: {
      entry: entryFile,
      formats: ["es"],
      fileName: "markdown-doc-tree",
    },

    outDir: "../dist/viewer",
    emptyOutDir: false,
  },
});
