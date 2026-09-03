export type CrmNote = {
  id: string;
  body: string;
  createdAt: number;
  reference: string;
  reisSlug: string;
  reisTitel: string;
};

export type CrmContact = {
  id: string;
  email: string;
  naam: string;
  reisSlug: string;
  reisTitel: string;
  reference: string;
  createdAt: number;
  lastAanvraagAt: number;
  notes: CrmNote[];
  processedSubmissions: Record<string, string>;
};

export type AanvraagPayload = {
  submissionId: string;
  naam: string;
  email: string;
  reisSlug: string;
  reisTitel: string;
  opmerking: string;
};

export type UpsertResult = {
  contact: CrmContact;
  reference: string;
  duplicate: boolean;
  idempotentReplay: boolean;
};

export interface CrmClient {
  upsertAanvraag(payload: AanvraagPayload): Promise<UpsertResult>;
}

export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
