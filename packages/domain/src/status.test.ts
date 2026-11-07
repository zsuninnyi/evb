import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IllegalStatusTransitionError,
  OUTFIT_STATUSES,
  transition,
  type OutfitStatus,
  type OutfitStatusEvent,
} from "./status.ts";

const legal: Array<{
  from: OutfitStatus;
  event: OutfitStatusEvent;
  to: OutfitStatus;
}> = [
  { from: "uploading", event: { type: "upload_completed" }, to: "processing" },
  {
    from: "uploading",
    event: { type: "upload_failed" },
    to: "upload_failed",
  },
  { from: "upload_failed", event: { type: "retry" }, to: "uploading" },
  {
    from: "processing",
    event: { type: "moderation_allowed" },
    to: "ready",
  },
  {
    from: "processing",
    event: { type: "moderation_uncertain" },
    to: "pending_review",
  },
  {
    from: "processing",
    event: { type: "moderation_blocked" },
    to: "rejected",
  },
  {
    from: "pending_review",
    event: { type: "admin_approved" },
    to: "ready",
  },
  {
    from: "pending_review",
    event: { type: "admin_rejected" },
    to: "rejected",
  },
];

const allEvents: OutfitStatusEvent["type"][] = [
  "upload_completed",
  "upload_failed",
  "retry",
  "moderation_allowed",
  "moderation_uncertain",
  "moderation_blocked",
  "admin_approved",
  "admin_rejected",
];

describe("transition", () => {
  it("allows every documented legal transition", () => {
    for (const step of legal) {
      assert.equal(transition(step.from, step.event), step.to);
    }
  });

  it("rejects every undocumented transition", () => {
    const legalKeys = new Set(
      legal.map((step) => `${step.from}:${step.event.type}`),
    );

    for (const from of OUTFIT_STATUSES) {
      for (const eventType of allEvents) {
        if (legalKeys.has(`${from}:${eventType}`)) {
          continue;
        }

        assert.throws(
          () => transition(from, { type: eventType }),
          (error: unknown) => {
            assert.ok(error instanceof IllegalStatusTransitionError);
            assert.equal(error.from, from);
            assert.equal(error.event, eventType);
            return true;
          },
        );
      }
    }
  });
});
