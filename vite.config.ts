import { defineConfig } from "vite";

export default defineConfig({
  root: "viewer",
  publicDir: "../output/public",
  build: {
    outDir: "../output/viewer",
    emptyOutDir: true,
  },
});
