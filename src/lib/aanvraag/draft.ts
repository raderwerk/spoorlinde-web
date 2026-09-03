import type { KeyValueStore } from "../crm/store";

export const DRAFT_KEY = "draft";
export const TOTAL_STEPS = 3 as const;
export type WizardStep = 1 | 2 | 3;

export type DraftValues = {
  reisSlug: string;
  naam: string;
  email: string;
  opmerking: string;
};

export const EMPTY_DRAFT: DraftValues = {
  reisSlug: "",
  naam: "",
  email: "",
  opmerking: "",
};

export function nextStep(step: WizardStep): WizardStep {
  switch (step) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 3;
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}

export function prevStep(step: WizardStep): WizardStep {
  switch (step) {
    case 1:
      return 1;
    case 2:
      return 1;
    case 3:
      return 2;
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}

export class DraftStore {
  constructor(private readonly store: KeyValueStore) {}

  load(): DraftValues {
    const raw = this.store.get(DRAFT_KEY);
    if (!raw) {
      return { ...EMPTY_DRAFT };
    }
    try {
      const parsed = JSON.parse(raw) as Partial<DraftValues>;
      return {
        reisSlug: parsed.reisSlug ?? "",
        naam: parsed.naam ?? "",
        email: parsed.email ?? "",
        opmerking: parsed.opmerking ?? "",
      };
    } catch {
      return { ...EMPTY_DRAFT };
    }
  }

  save(values: DraftValues): void {
    this.store.set(DRAFT_KEY, JSON.stringify(values));
  }

  clear(): void {
    this.store.delete(DRAFT_KEY);
  }
}
