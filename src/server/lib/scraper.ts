import { mkdir } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    // Block private IP ranges and non-HTTP(S) protocols
    const hostname = u.hostname;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) return false;
    if (hostname.startsWith('169.254.')) return false; // link-local
    if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) return false; // IPv6 private/link-local
    return true;
  } catch {
    return false;
  }
}

async function fetchHtml(url: string, redirects = 5): Promise<{ html: string; status: number }> {
  if (redirects === 0) throw new Error('Too many redirects');
  if (!isAllowedUrl(url)) throw new Error('URL not allowed');

  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const res = await fetch(url, {
    headers: {
      'User-Agent': ua,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      Connection: 'keep-alive',
    },
    redirect: 'manual',
  });

  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get('location');
    if (!location) throw new Error('Redirect without location header');
    const next = location.startsWith('http') ? location : new URL(location, url).href;
    return fetchHtml(next, redirects - 1);
  }

  const html = await res.text();
  return { html, status: res.status };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim();
}

function detectSite(url: string): 'linkedin' | 'jobstreet' | 'unknown' {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('jobstreet.com')) return 'jobstreet';
  return 'unknown';
}

function extractJobUrls(html: string, site: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const add = (clean: string) => {
    if (!seen.has(clean)) {
      seen.add(clean);
      urls.push(clean);
    }
  };

  if (site === 'jobstreet') {
    const re = /href="\/id\/job\/(\d+)[^"]*"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      add(`https://id.jobstreet.com/id/job/${m[1]}`);
    }
    return urls;
  }

  const re = /<a[^>]+class="[^"]*base-card[^"]*"[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].replace(/&amp;/g, '&');
    try {
      const u = new URL(raw);
      add(`${u.origin}${u.pathname}`);
    } catch {
      // skip malformed URLs
    }
  }

  return urls;
}

export async function scrapeSearchPage(searchUrl: string): Promise<string[]> {
  let html: string;
  let status: number;

  try {
    ({ html, status } = await fetchHtml(searchUrl));
  } catch (err) {
    console.log(`  [Scraper] Fetch error on search page: ${(err as Error).message}`);
    return [];
  }

  if (process.env.DEBUG === 'true') {
    const debugDir = path.resolve('debug');
    await mkdir(debugDir, { recursive: true });
    const filename = path.join(debugDir, `search_${Date.now()}.html`);
    await writeFile(filename, html, 'utf8');
    console.log(`  [Scraper] Saved response HTML → ${filename} (HTTP ${status})`);
  }

  if (status === 401 || status === 403) {
    console.log(`  [Scraper] Blocked on search page (HTTP ${status})`);
    return [];
  }

  const site = detectSite(searchUrl);
  const urls = extractJobUrls(html, site);
  console.log(`  [Scraper] Found ${urls.length} job postings in search results (${site})`);
  return urls;
}

const DETAIL_ANCHORS: Record<string, string[]> = {
  linkedin: ['id="job-details"'],
  jobstreet: ['data-automation="jobAdDetails"', 'data-automation="splitViewJobDetailsWrapper"'],
};

function extractJobDescription(html: string, site: string): string | null {
  const anchors = DETAIL_ANCHORS[site] || [];
  for (const anchor of anchors) {
    const idx = html.indexOf(anchor);
    if (idx === -1) continue;
    const candidate = stripHtml(html.slice(idx, idx + 20000));
    if (candidate.length >= 200) return candidate;
  }
  return null;
}

export interface ScrapeResult {
  rawText: string;
  scrapeStatus: 'success' | 'partial' | 'login_wall' | 'failed';
  url: string;
}

export async function scrapeJob(url: string, notes = ''): Promise<ScrapeResult> {
  let html: string;
  let status: number;

  try {
    ({ html, status } = await fetchHtml(url));
  } catch (err) {
    console.log(`  [Scraper] Fetch error: ${(err as Error).message}`);
    return { rawText: notes, scrapeStatus: 'failed', url };
  }

  if (process.env.DEBUG === 'true') {
    const debugDir = path.resolve('debug');
    await mkdir(debugDir, { recursive: true });
    const filename = path.join(debugDir, `job_${Date.now()}.html`);
    await writeFile(filename, html, 'utf8');
    console.log(`  [Scraper] Saved response HTML → ${filename} (HTTP ${status})`);
  }

  if (status === 401 || status === 403 || (html.includes('/authwall') && html.length < 5000)) {
    console.log(`  [Scraper] Login wall (HTTP ${status})`);
    return { rawText: notes, scrapeStatus: 'login_wall', url };
  }

  let text = extractJobDescription(html, detectSite(url));

  if (!text || text.length < 200) {
    text = stripHtml(html);
  }

  if (text.length < 200) {
    console.log(`  [Scraper] Very little content (${text.length} chars) — may be blocked`);
    return { rawText: notes || text, scrapeStatus: 'partial', url };
  }

  const trimmed = text.slice(0, 8000);
  console.log(`  [Scraper] Extracted ${trimmed.length} chars`);
  return { rawText: trimmed, scrapeStatus: 'success', url };
}
