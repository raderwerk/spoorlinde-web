import { describe, expect, it } from "vitest";
import { USER_MESSAGES } from "../src/lib/aanvraag/messages";
import { submitAanvraag, flushOutbox } from "../src/lib/aanvraag/submit";
import {
  AANVRAAG_FIELDS,
  PAYMENT_FIELDS_NEVER_ASKED,
  validateAanvraag,
} from "../src/lib/aanvraag/validate";
import { createAanvraagRuntime } from "../src/lib/aanvraag/runtime";
import { DraftStore, TOTAL_STEPS, nextStep } from "../src/lib/aanvraag/draft";
import { MockCrm } from "../src/lib/crm/mock-crm";
import { Outbox } from "../src/lib/crm/outbox";
import { MemoryStore } from "../src/lib/crm/store";
import { DUPLICATE_WINDOW_MS } from "../src/lib/crm/types";
import {
  REAL_MAIL_FORBIDDEN_MESSAGE,
  isAllowedTestEmail,
  isValidEmailAddress,
  sendTransactionalEmail,
} from "../src/lib/email/guard";
import { serializeForInlineScript } from "../src/lib/aanvraag/serialize";

const REIS = {
  reisSlug: "dolomieten-per-nachttrein",
  reisTitel: "Dolomieten per nachttrein",
};

function createHarness(clock = { now: 1_700_000_000_000 }) {
  const store = new MemoryStore();
  let nextId = 0;
  const id = () => {
    nextId += 1;
    return `id-${nextId}`;
  };
  const crm = new MockCrm({
    store,
    clock: () => clock.now,
    id,
  });
  const outbox = new Outbox(store, () => clock.now);
  return {
    crm,
    outbox,
    clock,
    id,
    deps: {
      crm,
      outbox,
      clock: () => clock.now,
      id,
      retryAttempts: 3,
      retryDelayMs: 0,
    },
  };
}

function aanvraag(email = "reiziger@example.com", extra: Record<string, string> = {}) {
  return {
    naam: "Test Reiziger",
    email,
    ...REIS,
    opmerking: "Graag een plaats bij het raam.",
    ...extra,
  };
}

describe("WV-194 aanvraag → CRM", () => {
  it("creates one contact with the chosen trip on a filled-in aanvraag", async () => {
    const { crm, deps } = createHarness();

    const result = await submitAanvraag(aanvraag(), deps);

    expect(result.status).toBe("created");
    if (result.status !== "created") {
      throw new Error("expected created");
    }
    expect(result.ok).toBe(true);
    expect(result.reference).toMatch(/^SL-[A-Z0-9]+$/);
    expect(result.message).toBe(USER_MESSAGES.created);

    const contacts = crm.snapshot().contacts;
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.email).toBe("reiziger@example.com");
    expect(contacts[0]?.reisSlug).toBe("dolomieten-per-nachttrein");
    expect(contacts[0]?.reisTitel).toBe("Dolomieten per nachttrein");
    expect(contacts[0]?.notes).toHaveLength(0);
  });

  it("does not create a second contact within 24 hours; it adds a note instead", async () => {
    const { crm, deps, clock } = createHarness();

    const first = await submitAanvraag(aanvraag(), { ...deps, id: () => "sub-1" });
    clock.now += DUPLICATE_WINDOW_MS - 1;
    const second = await submitAanvraag(aanvraag(), { ...deps, id: () => "sub-2" });

    expect(first.status).toBe("created");
    expect(second.status).toBe("duplicate");
    if (second.status !== "duplicate") {
      throw new Error("expected duplicate");
    }
    expect(second.ok).toBe(true);
    expect(second.message).toBe(USER_MESSAGES.duplicate);
    expect(second.reference).not.toBe(first.status === "created" ? first.reference : "");

    const contacts = crm.snapshot().contacts;
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.notes).toHaveLength(1);
    expect(contacts[0]?.notes[0]?.body).toMatch(/Dubbele aanvraag binnen 24 uur/);
    expect(contacts[0]?.notes[0]?.reisSlug).toBe("dolomieten-per-nachttrein");
  });

  it("keeps the aanvraag, retries, and never reports success when the CRM is unreachable", async () => {
    const { crm, outbox, deps } = createHarness();
    crm.reachable = false;

    const result = await submitAanvraag(aanvraag(), deps);

    expect(result.status).toBe("queued");
    if (result.status !== "queued") {
      throw new Error("expected queued");
    }
    expect(result.ok).toBe(false);
    expect(result.message).toBe(USER_MESSAGES.crmUnreachable);
    expect(result.message.toLowerCase()).not.toMatch(/ontvangen|gelukt|bevestigd/);
    expect(result.attempts).toBe(3);
    expect(crm.calls.filter((call) => call === "upsertAanvraag")).toHaveLength(3);
    expect(crm.snapshot().contacts).toHaveLength(0);
    expect(outbox.listPending()).toHaveLength(1);
    expect(outbox.listPending()[0]?.aanvraag.email).toBe("reiziger@example.com");

    crm.reachable = true;
    const flushed = await flushOutbox(deps);

    expect(flushed.delivered).toBe(1);
    expect(flushed.failed).toBe(0);
    expect(outbox.listPending()).toHaveLength(0);
    expect(crm.snapshot().contacts).toHaveLength(1);
    expect(crm.snapshot().contacts[0]?.reisSlug).toBe("dolomieten-per-nachttrein");
  });

  it("keeps separate queued aanvragen and retry counters for the same address", async () => {
    const { crm, outbox, deps } = createHarness();
    crm.reachable = false;

    await submitAanvraag(aanvraag("reiziger@example.com", {
      submissionId: "sub-A",
      reisSlug: "reis-A",
      reisTitel: "Reis A",
    }), deps);
    await submitAanvraag(aanvraag("reiziger@example.com", {
      submissionId: "sub-B",
      reisSlug: "reis-B",
      reisTitel: "Reis B",
    }), deps);

    expect(outbox.listPending()).toMatchObject([
      { id: "sub-A", aanvraag: { reisSlug: "reis-A" }, attempts: 3 },
      { id: "sub-B", aanvraag: { reisSlug: "reis-B" }, attempts: 3 },
    ]);

    crm.reachable = true;
    expect(await flushOutbox(deps)).toEqual({ delivered: 2, failed: 0 });
    expect(outbox.listPending()).toHaveLength(0);
    expect(crm.snapshot().contacts).toHaveLength(1);
    expect(crm.snapshot().contacts[0]?.notes[0]?.reisSlug).toBe("reis-B");
  });
});

describe("test-only e-mail guard", () => {
  it("accepts reserved test domains and rejects a real inbox", () => {
    expect(isAllowedTestEmail("reiziger@example.com")).toBe(true);
    expect(isAllowedTestEmail("demo@spoorlinde.test")).toBe(true);
    expect(isAllowedTestEmail("iemand@voorbeeld.invalid")).toBe(false);
    expect(isAllowedTestEmail("klant@spoorlinde.invalid")).toBe(false);

    const rejected = validateAanvraag(aanvraag("klant@voorbeeld.invalid"));
    expect(rejected.ok).toBe(false);
    if (rejected.ok) {
      throw new Error("expected rejection");
    }
    expect(rejected.errors[0]?.message).toBe(USER_MESSAGES.realEmailForbidden);
    expect(REAL_MAIL_FORBIDDEN_MESSAGE.toLowerCase()).toMatch(/geen e-mail|echt adres/);
  });

  it.each([
    "a@b@example.com",
    "a b c@example.com",
    "<script>@example.com",
    "a@@example.com",
  ])("rejects malformed address %s before checking its domain", (email) => {
    expect(isValidEmailAddress(email)).toBe(false);
    const rejected = validateAanvraag(aanvraag(email));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.errors[0]).toEqual({
        field: "email",
        message: "Vul een geldig e-mailadres in.",
      });
    }
  });

  it("refuses to send transactional mail to any address", () => {
    expect(() => sendTransactionalEmail("reiziger@example.com", "x", "y")).toThrow(
      /no mail is sent/i,
    );
  });
});

describe("aanvraag page bootstrap", () => {
  it("cannot be escaped by a trip title containing a closing script tag", () => {
    const attack = "</script><img src=x onerror=alert(1)>";
    const serialized = serializeForInlineScript({ titel: attack });

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual({ titel: attack });
  });
});

describe("browser runtime wiring", () => {
  it("uses one prefixed store so a second submit adds a note, not a contact", async () => {
    const store = new MemoryStore();
    const runtime = createAanvraagRuntime(store);
    runtime.retryDelayMs = 0;

    const first = await submitAanvraag(aanvraag(), runtime);
    const second = await submitAanvraag(aanvraag(), runtime);
    const crm = runtime.crm as MockCrm;

    expect(first.status).toBe("created");
    expect(second.status).toBe("duplicate");
    expect(crm.snapshot().contacts).toHaveLength(1);
    expect(crm.snapshot().contacts[0]?.notes).toHaveLength(1);
  });
});

describe("aanvraag form constraints", () => {
  it("never asks for payment fields and stays within three steps", () => {
    expect(TOTAL_STEPS).toBe(3);
    expect(nextStep(1)).toBe(2);
    expect(nextStep(2)).toBe(3);
    expect(nextStep(3)).toBe(3);
    for (const field of PAYMENT_FIELDS_NEVER_ASKED) {
      expect(AANVRAAG_FIELDS).not.toContain(field);
    }
  });

  it("keeps filled-in fields after a CRM failure", async () => {
    const store = new MemoryStore();
    const drafts = new DraftStore(store);
    const filled = {
      reisSlug: "dolomieten-per-nachttrein",
      naam: "Test Reiziger",
      email: "reiziger@example.com",
      opmerking: "Raamplek",
    };
    drafts.save(filled);

    const { crm, deps } = createHarness();
    crm.reachable = false;
    const result = await submitAanvraag(aanvraag(), deps);

    expect(result.status).toBe("queued");
    expect(drafts.load()).toEqual(filled);
  });
});
