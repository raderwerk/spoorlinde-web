import type { AanvraagPayload } from "./types";
import type { KeyValueStore } from "./store";

export type OutboxStatus = "pending" | "delivered";

export type OutboxItem = {
  id: string;
  aanvraag: AanvraagPayload;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: OutboxStatus;
};

const ITEMS_KEY = "items";

type PersistedOutbox = {
  items: OutboxItem[];
};

export class Outbox {
  constructor(
    private readonly store: KeyValueStore,
    private readonly clock: () => number = Date.now,
  ) {}

  enqueue(aanvraag: AanvraagPayload): OutboxItem {
    const state = this.load();
    const existing = state.items.find(
      (item) => item.status === "pending" && item.aanvraag.email === aanvraag.email,
    );
    if (existing) {
      existing.aanvraag = aanvraag;
      existing.id = aanvraag.submissionId;
      this.save(state);
      return existing;
    }

    const item: OutboxItem = {
      id: aanvraag.submissionId,
      aanvraag,
      createdAt: this.clock(),
      attempts: 0,
      status: "pending",
    };
    state.items.push(item);
    this.save(state);
    return item;
  }

  listPending(): OutboxItem[] {
    return this.load().items.filter((item) => item.status === "pending");
  }

  recordAttempt(id: string, errorMessage: string): void {
    const state = this.load();
    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    item.attempts += 1;
    item.lastError = errorMessage;
    this.save(state);
  }

  markDelivered(id: string): void {
    const state = this.load();
    const item = state.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    item.status = "delivered";
    this.save(state);
  }

  private load(): PersistedOutbox {
    const raw = this.store.get(ITEMS_KEY);
    if (!raw) {
      return { items: [] };
    }
    try {
      const parsed = JSON.parse(raw) as PersistedOutbox;
      if (!Array.isArray(parsed.items)) {
        return { items: [] };
      }
      return parsed;
    } catch {
      return { items: [] };
    }
  }

  private save(state: PersistedOutbox): void {
    this.store.set(ITEMS_KEY, JSON.stringify(state));
  }
}
