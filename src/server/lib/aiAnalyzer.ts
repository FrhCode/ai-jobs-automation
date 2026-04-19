import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import OpenAI from 'openai';

const SENTINEL = {
  title: 'Unknown',
  company: 'Unknown',
  location: 'Unknown',
  salary: 'Not listed',
  descriptionSummary: 'Could not analyze',
  score: -1,
  matchedSkills: [] as string[],
  missingSkills: [] as string[],
  summary: 'AI analysis failed',
  recommendation: 'Skip' as const,
};

function createClient(apiKey: string) {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/FrhCode/job-search-automation',
      'X-Title': 'Job Search Automation',
    },
  });
}

async function classifyIsTech(
  rawText: string,
  scrapeStatus: string,
  model: string,
  client: OpenAI
): Promise<{ isTech: boolean; title: string; company: string }> {
  if (scrapeStatus === 'login_wall' || scrapeStatus === 'failed') {
    return { isTech: true, title: '', company: '' };
  }
  const snippet = (rawText || '').slice(0, 150);
  if (!snippet.trim()) return { isTech: true, title: '', company: '' };

  const prompt = `Is this a software/tech/IT/engineering job? JSON only, no markdown:
{"isTech": true|false, "title": "<title>", "company": "<company>"}

Job text (first 150 chars):
${snippet}`;

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Filter request timed out')), 30000)
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
      timeout,
    ]);
    const text = completion.choices[0]?.message?.content || '';
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) return { isTech: true, title: '', company: '' };
    const parsed = JSON.parse(match[0]);
    return {
      isTech: parsed.isTech !== false,
      title: parsed.title || '',
      company: parsed.company || '',
    };
  } catch (err) {
    console.log(`  [Filter] Error: ${(err as Error).message} — proceeding with full analysis`);
    return { isTech: true, title: '', company: '' };
  }
}

function buildPrompt(rawText: string, resumeText: string, scrapeStatus: string) {
  const jobContent =
    scrapeStatus === 'login_wall' || scrapeStatus === 'failed'
      ? rawText
        ? `The job page could not be scraped. Here are user-provided notes about the job:\n${rawText}`
        : 'The job page could not be scraped and no notes were provided.'
      : `Here is the raw text extracted from the job posting page:\n\n${rawText.slice(0, 8000)}`;

  return `You are a job-fit analyzer. Respond ONLY with valid JSON — no markdown, no explanation, no extra text.

## Resume
${resumeText.slice(0, 4000)}

## Job Posting
${jobContent}

## Task
Extract the job details and score the fit between the resume and the job posting.

Return exactly this JSON schema:
{
  "title": "<job title or Unknown>",
  "company": "<company name or Unknown>",
  "location": "<location or Unknown>",
  "salary": "<salary range or Not listed>",
  "descriptionSummary": "<2-3 sentence summary of the role>",
  "score": <integer 0-100>,
  "matchedSkills": ["<skill>", ...],
  "missingSkills": ["<skill>", ...],
  "summary": "<2-3 sentences on why this is or isn't a good fit>",
  "recommendation": "<Apply | Consider | Skip>"
}

Scoring guide:
- 90-100: Near-perfect match, apply immediately
- 70-89: Strong match, apply with confidence
- 50-69: Partial match, worth considering
- 0-49: Significant gaps, skip unless strategic`;
}

function createCoverLetterPrompt(job: {
  title: string | null;
  company: string | null;
  location: string | null;
  descriptionSummary: string | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
}, resumeText: string) {
  return `You are an expert career coach who writes compelling, personalized cover letters.

## Candidate Resume
${resumeText.slice(0, 4000)}

## Job Details
- Title: ${job.title || 'Unknown'}
- Company: ${job.company || 'Unknown'}
- Location: ${job.location || 'Unknown'}
- Role Summary: ${job.descriptionSummary || 'Not available'}

## Matched Skills
${(job.matchedSkills ?? []).join(', ') || 'None listed'}

## Missing Skills
${(job.missingSkills ?? []).join(', ') || 'None listed'}

## Task
Write a professional cover letter (300-500 words) for this job application. The tone should be confident, enthusiastic, and authentic.

Requirements:
1. Address the hiring manager generally (e.g., "Dear Hiring Manager,")
2. Mention the specific role and company name
3. Highlight 2-3 key matched skills with concrete examples
4. Acknowledge any missing skills briefly but frame them as growth opportunities
5. End with a strong call to action
6. Do NOT include markdown formatting, headers, or code blocks — just plain text
7. Return ONLY the cover letter text, nothing else`;
}

export async function generateCoverLetter(
  job: {
    title: string | null;
    company: string | null;
    location: string | null;
    descriptionSummary: string | null;
    matchedSkills: string[] | null;
    missingSkills: string[] | null;
  },
  resumeText: string,
  apiKey: string,
  model: string
): Promise<string> {
  const client = createClient(apiKey);
  const prompt = createCoverLetterPrompt(job, resumeText);

  let responseText = '';
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Cover letter generation timed out after 60s')), 60000)
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || '';
  } catch (err) {
    console.log(`  [AI] Cover letter error: ${(err as Error).message}`);
    throw err;
  }

  return responseText.trim();
}

export interface AnalyzeInput {
  rawText: string;
  scrapeStatus: string;
  url: string;
}

export interface AnalyzeResult {
  url: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  descriptionSummary: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  recommendation: string;
  scrapeStatus: string;
}

export async function analyzeJob(
  scrapeResult: AnalyzeInput,
  resumeText: string,
  apiKey: string,
  model: string
): Promise<AnalyzeResult> {
  const { rawText, scrapeStatus, url } = scrapeResult;

  const client = createClient(apiKey);

  const filter = await classifyIsTech(rawText, scrapeStatus, model, client);
  if (!filter.isTech) {
    console.log(`  [Filter] Non-tech job — skipped (${filter.title || 'unknown title'})`);
    return {
      url,
      title: filter.title || 'Unknown',
      company: filter.company || 'Unknown',
      location: 'Not analyzed',
      salary: 'Not analyzed',
      descriptionSummary: 'Non-tech job — skipped by pre-filter',
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      summary: 'Filtered out: not a tech job',
      recommendation: 'Skip',
      scrapeStatus,
    };
  }

  const prompt = buildPrompt(rawText, resumeText, scrapeStatus);

  if (process.env.DEBUG === 'true') {
    const debugDir = path.resolve('debug');
    await mkdir(debugDir, { recursive: true });
    const promptFile = path.join(debugDir, `prompt_${Date.now()}.txt`);
    await Bun.write(promptFile, prompt);
    console.log(`  [AI] Prompt dumped → ${promptFile} (${prompt.length} chars)`);
  }

  let responseText = '';
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out after 60s')), 60000)
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || '';
  } catch (err) {
    console.log(`  [AI] API error: ${(err as Error).message}`);
    return { ...SENTINEL, url, scrapeStatus: scrapeResult.scrapeStatus };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const match = /\{[\s\S]*\}/.exec(responseText);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.log(`  [AI] Could not parse response for ${url}`);
        return { ...SENTINEL, url, scrapeStatus: scrapeResult.scrapeStatus };
      }
    } else {
      console.log(`  [AI] No JSON found in response for ${url}`);
      return { ...SENTINEL, url, scrapeStatus: scrapeResult.scrapeStatus };
    }
  }

  return {
    url,
    title: (parsed.title as string) || SENTINEL.title,
    company: (parsed.company as string) || SENTINEL.company,
    location: (parsed.location as string) || SENTINEL.location,
    salary: (parsed.salary as string) || SENTINEL.salary,
    descriptionSummary: (parsed.descriptionSummary as string) || SENTINEL.descriptionSummary,
    score: typeof parsed.score === 'number' ? parsed.score : SENTINEL.score,
    matchedSkills: Array.isArray(parsed.matchedSkills) ? (parsed.matchedSkills as string[]) : [],
    missingSkills: Array.isArray(parsed.missingSkills) ? (parsed.missingSkills as string[]) : [],
    summary: (parsed.summary as string) || SENTINEL.summary,
    recommendation: (parsed.recommendation as string) || SENTINEL.recommendation,
    scrapeStatus,
  };
}
