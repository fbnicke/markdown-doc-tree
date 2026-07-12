import { rm } from "node:fs/promises";

await rm("./output/public", {
  recursive: true,
  force: true,
});
