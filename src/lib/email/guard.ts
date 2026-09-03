/**
 * Mail safety for the Spoorlinde demo.
 *
 * This site never sends email. Addresses are accepted only on reserved
 * test domains so a real inbox cannot be reached even if a mailer is
 * wired up later by mistake.
 */

export const TEST_EMAIL_DOMAINS = [
  "example.com",
  "example.org",
  "example.net",
  "spoorlinde.test",
] as const;

export const REAL_MAIL_FORBIDDEN_MESSAGE =
  "Alleen testdomeinen zijn toegestaan. Deze demo verstuurt geen e-mail en er gaat geen bericht naar een echt adres.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function domainOf(email: string): string | null {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) {
    return null;
  }
  return normalized.slice(at + 1);
}

export function isAllowedTestEmail(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) {
    return false;
  }
  return (TEST_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export function assertAllowedTestEmail(email: string): void {
  if (!isAllowedTestEmail(email)) {
    throw new Error(REAL_MAIL_FORBIDDEN_MESSAGE);
  }
}

/**
 * There is no mailer in this project. Calling this is always a programming
 * error: the demo must never send a message to any address.
 */
export function sendTransactionalEmail(_to: string, _subject: string, _body: string): never {
  throw new Error(
    "sendTransactionalEmail is disabled. Spoorlinde is a demo; no mail is sent to any address.",
  );
}
