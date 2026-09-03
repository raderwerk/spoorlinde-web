import { assertAllowedTestEmail, normalizeEmail } from "../email/guard";
import { CrmUnreachableError } from "./errors";
import { createReference } from "./reference";
import type { KeyValueStore } from "./store";
import {
  DUPLICATE_WINDOW_MS,
  type AanvraagPayload,
  type CrmClient,
  type CrmContact,
  type UpsertResult,
} from "./types";

const CONTACTS_KEY = "contacts";

export type MockCrmOptions = {
  store: KeyValueStore;
  clock?: () => number;
  id?: () => string;
};

type PersistedState = {
  contacts: CrmContact[];
};

/**
 * In-process CRM stand-in for the Spoorlinde demo.
 *
 * This is a free test environment, not a production CRM. It never sends
 * mail, never calls a third-party API, and refuses non-test addresses.
 */
export class MockCrm implements CrmClient {
  reachable = true;
  readonly calls: string[] = [];

  private readonly store: KeyValueStore;
  private readonly clock: () => number;
  private readonly id: () => string;

  constructor(options: MockCrmOptions) {
    this.store = options.store;
    this.clock = options.clock ?? Date.now;
    this.id = options.id ?? defaultId;
  }

  snapshot(): { contacts: CrmContact[] } {
    return { contacts: this.load().contacts.map(cloneContact) };
  }

  async upsertAanvraag(payload: AanvraagPayload): Promise<UpsertResult> {
    this.calls.push("upsertAanvraag");
    this.assertReachable();

    const email = normalizeEmail(payload.email);
    assertAllowedTestEmail(email);

    const state = this.load();
    const now = this.clock();
    const existing = state.contacts.find((contact) => contact.email === email);

    if (existing) {
      const knownReference = existing.processedSubmissions[payload.submissionId];
      if (knownReference) {
        this.save(state);
        return {
          contact: cloneContact(existing),
          reference: knownReference,
          duplicate: Object.keys(existing.processedSubmissions).length > 1,
          idempotentReplay: true,
        };
      }

      const withinDuplicateWindow = now - existing.lastAanvraagAt < DUPLICATE_WINDOW_MS;
      const reference = createReference(payload.submissionId);
      existing.processedSubmissions[payload.submissionId] = reference;
      existing.lastAanvraagAt = now;
      existing.notes.push({
        id: this.id(),
        body: noteBody(payload, withinDuplicateWindow),
        createdAt: now,
        reference,
        reisSlug: payload.reisSlug,
        reisTitel: payload.reisTitel,
      });

      this.save(state);
      return {
        contact: cloneContact(existing),
        reference,
        duplicate: true,
        idempotentReplay: false,
      };
    }

    const reference = createReference(payload.submissionId);
    const contact: CrmContact = {
      id: this.id(),
      email,
      naam: payload.naam,
      reisSlug: payload.reisSlug,
      reisTitel: payload.reisTitel,
      reference,
      createdAt: now,
      lastAanvraagAt: now,
      notes: [],
      processedSubmissions: { [payload.submissionId]: reference },
    };
    state.contacts.push(contact);
    this.save(state);

    return {
      contact: cloneContact(contact),
      reference,
      duplicate: false,
      idempotentReplay: false,
    };
  }

  private assertReachable(): void {
    if (!this.reachable) {
      throw new CrmUnreachableError();
    }
  }

  private load(): PersistedState {
    const raw = this.store.get(CONTACTS_KEY);
    if (!raw) {
      return { contacts: [] };
    }
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      if (!Array.isArray(parsed.contacts)) {
        return { contacts: [] };
      }
      return parsed;
    } catch {
      return { contacts: [] };
    }
  }

  private save(state: PersistedState): void {
    this.store.set(CONTACTS_KEY, JSON.stringify(state));
  }
}

function noteBody(payload: AanvraagPayload, withinDuplicateWindow: boolean): string {
  const windowText = withinDuplicateWindow
    ? "Dubbele aanvraag binnen 24 uur."
    : "Nieuwe aanvraag op bestaand contact.";
  const opmerking = payload.opmerking ? ` Opmerking: ${payload.opmerking}` : "";
  return `${windowText} Reis: ${payload.reisTitel} (${payload.reisSlug}).${opmerking}`;
}

function cloneContact(contact: CrmContact): CrmContact {
  return structuredClone(contact);
}

function defaultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}
