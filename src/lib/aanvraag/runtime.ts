import { MockCrm } from "../crm/mock-crm";
import { Outbox } from "../crm/outbox";
import { MemoryStore, PrefixedStore, createBrowserStore, type KeyValueStore } from "../crm/store";
import { DraftStore } from "./draft";
import { flushOutbox, type SubmitDeps } from "./submit";

const ROOT_PREFIX = "spoorlinde.";

export type BrowserAanvraagRuntime = SubmitDeps & {
  drafts: DraftStore;
};

export function createAanvraagRuntime(store: KeyValueStore): BrowserAanvraagRuntime {
  const crm = new MockCrm({ store: new PrefixedStore(store, `${ROOT_PREFIX}crm.`) });
  const outbox = new Outbox(new PrefixedStore(store, `${ROOT_PREFIX}outbox.`));
  const drafts = new DraftStore(new PrefixedStore(store, `${ROOT_PREFIX}aanvraag.`));
  return {
    crm,
    outbox,
    drafts,
    retryAttempts: 3,
    retryDelayMs: 200,
  };
}

export function createBrowserAanvraagRuntime(): BrowserAanvraagRuntime {
  const store = typeof window === "undefined" ? new MemoryStore() : createBrowserStore();
  return createAanvraagRuntime(store);
}

export async function retryQueuedAanvragen(runtime: BrowserAanvraagRuntime): Promise<void> {
  await flushOutbox(runtime);
}
