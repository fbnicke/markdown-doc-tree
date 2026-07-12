import { defineConfig } from "vite";

export default defineConfig({
  root: "viewer",
  publicDir: "../output",
  build: {
    outDir: "../output/viewer",
    emptyOutDir: false,
  },
});
