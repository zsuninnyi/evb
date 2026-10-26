import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "./app.ts";

describe("GET /health", () => {
  it("returns 200", async () => {
    const response = await createApp().request("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});
