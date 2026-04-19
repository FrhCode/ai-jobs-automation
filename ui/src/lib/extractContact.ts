const URL_REGEX = /https?:\/\/(?:[\w-]+(?:\.[\w-]+)+)(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

const EXCLUDED_URL_PATTERNS = [
  /linkedin\.com\/in\//i,
  /linkedin\.com\/company\//i,
  /linkedin\.com\/posts?\//i,
  /linkedin\.com\/pulse\//i,
  /facebook\.com\//i,
  /twitter\.com\//i,
  /x\.com\//i,
  /instagram\.com\//i,
  /youtube\.com\//i,
  /youtu\.be\//i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.pdf$/i,
  /\.docx?$/i,
  /tracking/i,
  /pixel/i,
  /beacon/i,
];

const EXCLUDED_EMAIL_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
  /notifications?@/i,
  /help@linkedin\.com/i,
  /linkedin\.com$/i,
];

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const filtered = matches.filter((url) => {
    return !EXCLUDED_URL_PATTERNS.some((pattern) => pattern.test(url));
  });
  return Array.from(new Set(filtered));
}

export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  const filtered = matches.filter((email) => {
    return !EXCLUDED_EMAIL_PATTERNS.some((pattern) => pattern.test(email));
  });
  return Array.from(new Set(filtered));
}
