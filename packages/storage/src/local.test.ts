import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createLocalObjectStorage } from "./local.ts";

const root = path.join(tmpdir(), `evb-storage-${process.pid}`);
const storage = createLocalObjectStorage({ root });

after(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("createLocalObjectStorage", () => {
  it("puts an object and reads the same bytes back", async () => {
    const key = "owner/outfit/original";
    const body = new Uint8Array([1, 2, 3, 4]);

    await storage.putObject(key, body, "image/jpeg");
    const readUrl = await storage.createReadUrl(key, { expiresInSeconds: 60 });
    const stored = await readFile(fileURLToPath(readUrl));

    assert.deepEqual(stored, Buffer.from(body));
  });

  it("deletes an object", async () => {
    const key = "owner/outfit/display";
    await storage.putObject(key, new Uint8Array([9]), "image/webp");
    await storage.deleteObject(key);

    await assert.rejects(readFile(path.join(root, key)));
  });

  it("rejects a key that leaves the storage root", async () => {
    await assert.rejects(
      storage.putObject("../secret", new Uint8Array([1]), "image/png"),
    );
  });
});
