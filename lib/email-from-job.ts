const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function extractJobEmail(description: string, url: string): string | null {
  const mailto = url.match(/mailto:([^?&\s]+)/i);
  if (mailto?.[1]) {
    return decodeURIComponent(mailto[1]);
  }
  const matches = description.match(EMAIL_RE) || [];
  const skip = /example\.com|sentry\.io|wixpress|schema\.org|godaddy|wordpress/i;
  const found = matches.find((e) => !skip.test(e));
  return found ? found.toLowerCase() : null;
}

export function coverLetterRequired(description: string): boolean {
  return /cover\s*letter|covering\s*letter|motivation\s*letter/i.test(description);
}
