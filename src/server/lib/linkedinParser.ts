import { parseHTML } from 'linkedom';
import { createHash } from 'node:crypto';

const KEYWORD_PATTERNS = [
  /\bhiring\b/i,
  /\blooking\s+for\b/i,
  /\bwe['\u2019]?re\s+hiring\b/i,
  /\bjoin\s+(our\s+)?team\b/i,
  /\bopen\s+(position|role)\b/i,
  /\bjob\s+opening\b/i,
  /\bcareer\s+opportunit(y|ies)\b/i,
  /\bvacanc(y|ies)\b/i,
  /\brecruit(ing|ment)?\b/i,
  /\btalent\s+needed\b/i,
  /\bnow\s+hiring\b/i,
  /\bseeking\b/i,
  /\bopportunit(y|ies)\b/i,
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[…\.]{2,}\s*more/gi, '')
    .replace(/\s*show\s+more\s*/gi, '')
    .trim();
}

function computeHash(text: string): string {
  const normalized = normalizeText(text);
  const fingerprint = normalized.slice(0, 500);
  return createHash('sha256').update(fingerprint).digest('hex');
}

function findMatchedKeywords(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of KEYWORD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(m);
    }
  }
  return result;
}

function stripHtml(html: string): string {
  // Simple but effective: replace tags with spaces, then collapse whitespace
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasOnlyAttrs(el: Element, allowed: string[]): boolean {
  const attrs = Array.from(el.attributes).map((a) => a.name);
  return attrs.length === allowed.length && allowed.every((name) => el.hasAttribute(name));
}

export interface ParsedPost {
  contentHash: string;
  authorName: string | null;
  authorHeadline: string | null;
  postContent: string;
  rawHtml: string;
  matchedKeywords: string[];
}

export function parseLinkedInHtml(html: string): ParsedPost[] {
  const { document } = parseHTML(html);

  const candidates = document.querySelectorAll('[data-display-contents]:has([data-display-contents])');

  const matches: Element[] = [];
  for (const el of Array.from(candidates)) {
    // 1. Target: only data-display-contents + class
    if (!hasOnlyAttrs(el, ['data-display-contents', 'class'])) continue;

    // 2. Direct child div with ONLY class
    const child1 = el.firstElementChild;
    if (!child1 || child1.tagName !== 'DIV') continue;
    if (!hasOnlyAttrs(child1, ['class'])) continue;

    // 3. Direct child div with ONLY class + componentkey
    const child2 = child1.firstElementChild;
    if (!child2 || child2.tagName !== 'DIV') continue;
    if (!hasOnlyAttrs(child2, ['class', 'componentkey'])) continue;

    matches.push(el);
  }

  const posts: ParsedPost[] = [];
  for (const el of matches) {
    // Try to find the actual post body
    let bodyEl = el.querySelector('[data-testid="expandable-text-box"]');

    // If not found, fallback: use the element itself but try to exclude action bars
    let postHtml = '';
    if (bodyEl) {
      postHtml = bodyEl.innerHTML;
    } else {
      // Clone to avoid modifying original
      const clone = el.cloneNode(true) as Element;
      // Remove known noise elements
      clone.querySelectorAll('button, svg, [aria-label="Like"], [aria-label="Comment"], [aria-label="Repost"], [aria-label="Send"]').forEach((n) => n.remove());
      postHtml = clone.innerHTML;
    }

    const stripped = stripHtml(postHtml);
    if (!stripped || stripped.length < 20) continue;

    // Extract author info
    let authorName: string | null = null;
    let authorHeadline: string | null = null;

    const authorLink = el.querySelector('a[href*="/in/"]');
    if (authorLink) {
      // Try to find name near the author link
      const nameEl = authorLink.querySelector('p, span, div');
      if (nameEl) {
        authorName = stripHtml(nameEl.innerHTML).trim() || null;
      }
      // If not found in children, check siblings or parent
      if (!authorName) {
        const parentText = stripHtml(authorLink.parentElement?.innerHTML || '').trim();
        if (parentText) authorName = parentText.split('\n')[0].trim();
      }
    }

    // Try to find headline (often a <p> near author with role text)
    const allParagraphs = el.querySelectorAll('p');
    for (const p of Array.from(allParagraphs)) {
      const text = stripHtml(p.innerHTML).trim();
      if (text && text.length > 5 && text.length < 200 && text !== authorName) {
        // Heuristic: if it contains typical headline words, use it
        if (/engineer|developer|manager|lead|architect|founder|ceo|cto|head of|director/i.test(text)) {
          authorHeadline = text;
          break;
        }
      }
    }

    const contentHash = computeHash(stripped);
    const matchedKeywords = findMatchedKeywords(stripped);

    posts.push({
      contentHash,
      authorName,
      authorHeadline,
      postContent: stripped,
      rawHtml: el.outerHTML.slice(0, 5000), // truncate for storage
      matchedKeywords,
    });
  }

  return posts;
}
