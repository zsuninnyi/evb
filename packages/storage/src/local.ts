import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertObjectKey } from "./keys.ts";
import type { ObjectStorage, UploadUrl } from "./types.ts";

export type LocalObjectStorageOptions = {
  root: string;
};

function resolveKey(root: string, key: string): string {
  assertObjectKey(key);
  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, key);
  if (filePath !== rootPath && !filePath.startsWith(rootPath + path.sep)) {
    throw new Error("Invalid object key");
  }
  return filePath;
}

export function createLocalObjectStorage(
  options: LocalObjectStorageOptions,
): ObjectStorage {
  const root = path.resolve(options.root);

  return {
    async createUploadUrl(key: string): Promise<UploadUrl> {
      return {
        url: pathToFileURL(resolveKey(root, key)).href,
        method: "PUT",
      };
    },

    async createReadUrl(key: string): Promise<string> {
      return pathToFileURL(resolveKey(root, key)).href;
    },

    async putObject(
      key: string,
      body: Uint8Array,
      contentType: string,
    ): Promise<void> {
      const filePath = resolveKey(root, key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, body);
      await writeFile(`${filePath}.content-type`, contentType);
    },

    async deleteObject(key: string): Promise<void> {
      const filePath = resolveKey(root, key);
      await rm(filePath, { force: true });
      await rm(`${filePath}.content-type`, { force: true });
    },
  };
}
