import { isCrmUnreachableError } from "../crm/errors";
import type { Outbox } from "../crm/outbox";
import type { AanvraagPayload, CrmClient, UpsertResult } from "../crm/types";
import { USER_MESSAGES } from "./messages";
import { validateAanvraag, type AanvraagInput, type FieldError } from "./validate";

export const DEFAULT_RETRY_ATTEMPTS = 3;

export type SubmitStatus = "created" | "duplicate" | "queued" | "invalid";

export type SubmitResult =
  | {
      status: "created";
      ok: true;
      reference: string;
      contactId: string;
      message: string;
    }
  | {
      status: "duplicate";
      ok: true;
      reference: string;
      contactId: string;
      message: string;
    }
  | {
      status: "queued";
      ok: false;
      message: string;
      attempts: number;
    }
  | {
      status: "invalid";
      ok: false;
      message: string;
      errors: FieldError[];
    };

export type SubmitDeps = {
  crm: CrmClient;
  outbox: Outbox;
  clock?: () => number;
  id?: () => string;
  retryAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  retryDelayMs?: number;
};

export async function submitAanvraag(
  input: AanvraagInput,
  deps: SubmitDeps,
): Promise<SubmitResult> {
  const validated = validateAanvraag(input);
  if (!validated.ok) {
    return {
      status: "invalid",
      ok: false,
      message: USER_MESSAGES.validation,
      errors: validated.errors,
    };
  }

  const submissionId = input.submissionId ?? createSubmissionId(deps);
  const payload: AanvraagPayload = {
    submissionId,
    ...validated.value,
  };

  deps.outbox.enqueue(payload);

  const attempts = deps.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
  const delayMs = deps.retryDelayMs ?? 0;
  const sleep = deps.sleep ?? defaultSleep;

  let completedAttempts = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    completedAttempts = attempt;
    try {
      const upserted = await deps.crm.upsertAanvraag(payload);
      deps.outbox.markDelivered(payload.submissionId);
      return toSuccess(upserted);
    } catch (error) {
      if (!isCrmUnreachableError(error)) {
        throw error;
      }
      deps.outbox.recordAttempt(payload.submissionId, error.message);
      if (attempt < attempts && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  return {
    status: "queued",
    ok: false,
    message: USER_MESSAGES.crmUnreachable,
    attempts: completedAttempts,
  };
}

export async function flushOutbox(deps: SubmitDeps): Promise<{ delivered: number; failed: number }> {
  const pending = deps.outbox.listPending();
  let delivered = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await deps.crm.upsertAanvraag(item.aanvraag);
      deps.outbox.markDelivered(item.id);
      delivered += 1;
    } catch (error) {
      if (!isCrmUnreachableError(error)) {
        throw error;
      }
      deps.outbox.recordAttempt(item.id, error.message);
      failed += 1;
    }
  }

  return { delivered, failed };
}

function toSuccess(upserted: UpsertResult): Extract<SubmitResult, { ok: true }> {
  if (upserted.duplicate) {
    return {
      status: "duplicate",
      ok: true,
      reference: upserted.reference,
      contactId: upserted.contact.id,
      message: USER_MESSAGES.duplicate,
    };
  }
  return {
    status: "created",
    ok: true,
    reference: upserted.reference,
    contactId: upserted.contact.id,
    message: USER_MESSAGES.created,
  };
}

function createSubmissionId(deps: SubmitDeps): string {
  if (deps.id) {
    return deps.id();
  }
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const clock = deps.clock ?? Date.now;
  return `sub-${clock()}-${Math.random().toString(16).slice(2)}`;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function describeSubmitResult(result: SubmitResult): string {
  switch (result.status) {
    case "created":
    case "duplicate":
    case "queued":
    case "invalid":
      return result.message;
    default: {
      const exhaustive: never = result;
      return exhaustive;
    }
  }
}
