export class CrmUnreachableError extends Error {
  readonly code = "crm_unreachable" as const;

  constructor(message = "CRM is unreachable") {
    super(message);
    this.name = "CrmUnreachableError";
  }
}

export function isCrmUnreachableError(error: unknown): error is CrmUnreachableError {
  return error instanceof CrmUnreachableError;
}
