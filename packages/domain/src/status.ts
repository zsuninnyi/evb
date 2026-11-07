export const OUTFIT_STATUSES = [
  "uploading",
  "upload_failed",
  "processing",
  "ready",
  "pending_review",
  "rejected",
] as const;

export type OutfitStatus = (typeof OUTFIT_STATUSES)[number];

export type OutfitStatusEvent =
  | { type: "upload_completed" }
  | { type: "upload_failed" }
  | { type: "retry" }
  | { type: "moderation_allowed" }
  | { type: "moderation_uncertain" }
  | { type: "moderation_blocked" }
  | { type: "admin_approved" }
  | { type: "admin_rejected" };

const transitions: Record<
  OutfitStatus,
  Partial<Record<OutfitStatusEvent["type"], OutfitStatus>>
> = {
  uploading: {
    upload_completed: "processing",
    upload_failed: "upload_failed",
  },
  upload_failed: {
    retry: "uploading",
  },
  processing: {
    moderation_allowed: "ready",
    moderation_uncertain: "pending_review",
    moderation_blocked: "rejected",
  },
  pending_review: {
    admin_approved: "ready",
    admin_rejected: "rejected",
  },
  ready: {},
  rejected: {},
};

export class IllegalStatusTransitionError extends Error {
  readonly from: OutfitStatus;
  readonly event: OutfitStatusEvent["type"];

  constructor(from: OutfitStatus, event: OutfitStatusEvent["type"]) {
    super(`Illegal outfit status transition: ${from} + ${event}`);
    this.name = "IllegalStatusTransitionError";
    this.from = from;
    this.event = event;
  }
}

export function isOutfitStatus(value: string): value is OutfitStatus {
  return (OUTFIT_STATUSES as readonly string[]).includes(value);
}

export function isTerminalOutfitStatus(status: OutfitStatus): boolean {
  return status === "ready" || status === "rejected";
}

/**
 * The only legal way to change outfit status. Throws on illegal events.
 */
export function transition(
  status: OutfitStatus,
  event: OutfitStatusEvent,
): OutfitStatus {
  const next = transitions[status][event.type];
  if (!next) {
    throw new IllegalStatusTransitionError(status, event.type);
  }
  return next;
}
