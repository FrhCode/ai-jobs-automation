import { mkdir } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const SENTINEL = {
  title: "Unknown",
  company: "Unknown",
  location: "Unknown",
  salary: "Not listed",
  descriptionSummary: "Could not analyze",
  score: -1,
  matchedSkills: [] as string[],
  missingSkills: [] as string[],
  summary: "AI analysis failed",
  recommendation: "Skip" as const,
  applyUrl: "",
  contactEmail: "",
};

function createClient(apiKey: string) {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/FrhCode/job-search-automation",
      "X-Title": "Job Search Automation",
    },
  });
}

async function classifyIsTech(
  rawText: string,
  scrapeStatus: string,
  model: string,
  client: OpenAI,
): Promise<{ isTech: boolean; title: string; company: string }> {
  if (scrapeStatus === "login_wall" || scrapeStatus === "failed") {
    return { isTech: true, title: "", company: "" };
  }
  const snippet = (rawText || "").slice(0, 150);
  if (!snippet.trim()) return { isTech: true, title: "", company: "" };

  const prompt = `Is this a software/tech/IT/engineering job? JSON only, no markdown:
{"isTech": true|false, "title": "<title>", "company": "<company>"}

Job text (first 150 chars):
${snippet}`;

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Filter request timed out")), 30000),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
      timeout,
    ]);
    const text = completion.choices[0]?.message?.content || "";
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) return { isTech: true, title: "", company: "" };
    const parsed = JSON.parse(match[0]);
    return {
      isTech: parsed.isTech !== false,
      title: parsed.title || "",
      company: parsed.company || "",
    };
  } catch (err) {
    console.log(
      `  [Filter] Error: ${(err as Error).message} — proceeding with full analysis`,
    );
    return { isTech: true, title: "", company: "" };
  }
}

export interface ProgrammerFilterResult {
  isProgrammerJob: boolean;
  title: string;
  company: string;
}

export async function classifyIsProgrammerJob(
  postContent: string,
  apiKey: string,
  model: string,
): Promise<ProgrammerFilterResult> {
  const client = createClient(apiKey);
  const snippet = (postContent || "").slice(0, 300);
  if (!snippet.trim()) return { isProgrammerJob: true, title: "", company: "" };

  const prompt = `Is this a software/programming/tech/engineering/developer job posting? JSON only, no markdown:
{"isProgrammerJob": true|false, "title": "<inferred job title or Unknown>", "company": "<inferred company or Unknown>"}

Job text (first 300 chars):
${snippet}`;

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Programmer filter timed out")), 15000),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
      timeout,
    ]);
    const text = completion.choices[0]?.message?.content || "";
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) return { isProgrammerJob: true, title: "", company: "" };
    const parsed = JSON.parse(match[0]);
    return {
      isProgrammerJob: parsed.isProgrammerJob !== false,
      title: parsed.title || "",
      company: parsed.company || "",
    };
  } catch (err) {
    console.log(
      `  [Filter] Programmer check error: ${(err as Error).message} — proceeding with full analysis`,
    );
    return { isProgrammerJob: true, title: "", company: "" };
  }
}

function buildPrompt(
  rawText: string,
  resumeText: string,
  scrapeStatus: string,
) {
  const jobContent =
    scrapeStatus === "login_wall" || scrapeStatus === "failed"
      ? rawText
        ? `The job page could not be scraped. Here are user-provided notes about the job:\n${rawText}`
        : "The job page could not be scraped and no notes were provided."
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

function createCoverLetterPrompt(
  job: {
    title: string | null;
    company: string | null;
    location: string | null;
    descriptionSummary: string | null;
    matchedSkills: string[] | null;
    missingSkills: string[] | null;
  },
  resumeText: string,
) {
  return `You are an expert career coach who writes compelling, personalized cover letters.

## Candidate Resume
${resumeText.slice(0, 4000)}

## Job Details
- Title: ${job.title || "Unknown"}
- Company: ${job.company || "Unknown"}
- Location: ${job.location || "Unknown"}
- Role Summary: ${job.descriptionSummary || "Not available"}

## Matched Skills
${(job.matchedSkills ?? []).join(", ") || "None listed"}

## Missing Skills
${(job.missingSkills ?? []).join(", ") || "None listed"}

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
  model: string,
): Promise<string> {
  const client = createClient(apiKey);
  const prompt = createCoverLetterPrompt(job, resumeText);

  let responseText = "";
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Cover letter generation timed out after 60s")),
        60000,
      ),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.log(`  [AI] Cover letter error: ${(err as Error).message}`);
    throw err;
  }

  return responseText.trim();
}

function createApplicationEmailPrompt(
  job: {
    title: string | null;
    company: string | null;
    location: string | null;
    descriptionSummary: string | null;
    matchedSkills: string[] | null;
    missingSkills: string[] | null;
  },
  resumeText: string,
  contactEmail: string,
) {
  return `You are an expert career coach who writes compelling, personalized job-application emails.

## Candidate Resume
${resumeText.slice(0, 4000)}

## Job Details
- Title: ${job.title || "Unknown"}
- Company: ${job.company || "Unknown"}
- Location: ${job.location || "Unknown"}
- Role Summary: ${job.descriptionSummary || "Not available"}

## Matched Skills
${(job.matchedSkills ?? []).join(", ") || "None listed"}

## Missing Skills
${(job.missingSkills ?? []).join(", ") || "None listed"}

## Recipient
${contactEmail}

## Task
Write a professional job-application email. The tone should be confident, enthusiastic, and authentic.

Requirements:
1. Subject line should be clear and professional (e.g., "Application for [Role] — [Candidate Name]")
2. Greet the recipient professionally
3. Mention the specific role and company
4. Highlight 2-3 key matched skills with concrete examples
5. Acknowledge any missing skills briefly but frame them as growth opportunities
6. End with a strong call to action
7. Do NOT include markdown formatting, headers, bold, italic or code blocks — just plain text

Return ONLY a JSON object in this exact schema — no markdown, no explanation, no extra text:
{"subject": "<email subject line>", "body": "<full email body>"}`;
}

export interface GenerateEmailResult {
  subject: string;
  body: string;
}

export async function generateApplicationEmail(
  job: {
    title: string | null;
    company: string | null;
    location: string | null;
    descriptionSummary: string | null;
    matchedSkills: string[] | null;
    missingSkills: string[] | null;
  },
  resumeText: string,
  contactEmail: string,
  apiKey: string,
  model: string,
): Promise<GenerateEmailResult> {
  const client = createClient(apiKey);
  const prompt = createApplicationEmailPrompt(job, resumeText, contactEmail);

  let responseText = "";
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Email generation timed out after 60s")),
        60000,
      ),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.log(`  [AI] Email generation error: ${(err as Error).message}`);
    throw err;
  }

  // Try to parse JSON response
  try {
    const match = /\{[\s\S]*\}/.exec(responseText);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        subject: (parsed.subject as string) || "Job Application",
        body: (parsed.body as string) || responseText.trim(),
      };
    }
  } catch {
    // Fall through
  }

  // Fallback: split first line as subject, rest as body
  const lines = responseText.trim().split("\n");
  const subject =
    lines[0].replace(/^Subject:\s*/i, "").trim() || "Job Application";
  const body = lines.slice(1).join("\n").trim() || responseText.trim();
  return { subject, body };
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

function createAnswerPrompt(
  question: string,
  job: {
    title: string | null;
    company: string | null;
    location: string | null;
    descriptionSummary: string | null;
    matchedSkills: string[] | null;
    missingSkills: string[] | null;
  },
  resumeText: string,
) {
  return `You are an expert career coach who helps job applicants answer application questions convincingly and authentically.

## Candidate Resume
${resumeText.slice(0, 4000)}

## Job Details
- Title: ${job.title || "Unknown"}
- Company: ${job.company || "Unknown"}
- Location: ${job.location || "Unknown"}
- Role Summary: ${job.descriptionSummary || "Not available"}

## Matched Skills
${(job.matchedSkills ?? []).join(", ") || "None listed"}

## Missing Skills
${(job.missingSkills ?? []).join(", ") || "None listed"}

## Application Question
${question}

## Task
Write a strong, authentic answer to this job application question. The answer should:
1. Be specific and concrete — avoid generic fluff
2. Draw from the candidate's actual resume experience where possible
3. Be concise but compelling (typically 100-300 words unless the question clearly asks for more)
4. Match the tone expected for the role (professional, enthusiastic, thoughtful)
5. Address any missing skills honestly but frame them as growth opportunities
6. Return ONLY the answer text, nothing else — no markdown of any kind (no headers, no bold, no italic, no bullet points, no code blocks, no asterisks, no underscores for formatting), plain text only`;
}

export async function generateAnswer(
  question: string,
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
  model: string,
): Promise<string> {
  const client = createClient(apiKey);
  const prompt = createAnswerPrompt(question, job, resumeText);

  let responseText = "";
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Answer generation timed out after 60s")),
        60000,
      ),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.log(`  [AI] Answer error: ${(err as Error).message}`);
    throw err;
  }

  return responseText.trim();
}

function buildLinkedInPrompt(postContent: string, resumeText: string) {
  return `You are a job-fit analyzer specializing in informal LinkedIn posts. Respond ONLY with valid JSON — no markdown, no explanation, no extra text.

## Candidate Resume
${resumeText.slice(0, 4000)}

## LinkedIn Post
${postContent.slice(0, 6000)}

## Task
Determine if this LinkedIn post is a job opportunity. If it is, extract details and score the fit.

Return exactly this JSON schema:
{
  "isJob": true|false,
  "title": "<job title or Unknown>",
  "company": "<company name or Unknown>",
  "location": "<location or Unknown>",
  "salary": "<salary range or Not listed>",
  "descriptionSummary": "<2-3 sentence summary of the role>",
  "score": <integer 0-100>,
  "matchedSkills": ["<skill>", ...],
  "missingSkills": ["<skill>", ...],
  "summary": "<2-3 sentences on why this is or isn't a good fit>",
  "recommendation": "<Apply | Consider | Skip>",
  "applyUrl": "<apply/link URL from the post, or empty string if none>",
  "contactEmail": "<contact email from the post, or empty string if none>"
}

Scoring guide:
- 90-100: Near-perfect match, apply immediately
- 70-89: Strong match, apply with confidence
- 50-69: Partial match, worth considering
- 0-49: Significant gaps, skip unless strategic

If isJob is false, still fill in the other fields with defaults (score 0, recommendation Skip).`;
}

export interface LinkedInAnalyzeResult {
  isJob: boolean;
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
  applyUrl: string;
  contactEmail: string;
}

export async function analyzeLinkedInPost(
  postContent: string,
  resumeText: string,
  apiKey: string,
  model: string,
): Promise<LinkedInAnalyzeResult> {
  const client = createClient(apiKey);
  const prompt = buildLinkedInPrompt(postContent, resumeText);

  if (process.env.DEBUG === "true") {
    const debugDir = path.resolve("debug");
    await mkdir(debugDir, { recursive: true });
    const promptFile = path.join(debugDir, `linkedin_prompt_${Date.now()}.txt`);
    await Bun.write(promptFile, prompt);
    console.log(
      `  [AI] LinkedIn prompt dumped → ${promptFile} (${prompt.length} chars)`,
    );
  }

  let responseText = "";
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("LinkedIn AI request timed out after 60s")),
        60000,
      ),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || "";
  } catch (err) {
    console.log(`  [AI] LinkedIn API error: ${(err as Error).message}`);
    return { isJob: false, ...SENTINEL };
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
        console.log(`  [AI] Could not parse LinkedIn response`);
        return { isJob: false, ...SENTINEL };
      }
    } else {
      console.log(`  [AI] No JSON found in LinkedIn response`);
      return { isJob: false, ...SENTINEL };
    }
  }

  return {
    isJob: parsed.isJob === true,
    title: (parsed.title as string) || SENTINEL.title,
    company: (parsed.company as string) || SENTINEL.company,
    location: (parsed.location as string) || SENTINEL.location,
    salary: (parsed.salary as string) || SENTINEL.salary,
    descriptionSummary:
      (parsed.descriptionSummary as string) || SENTINEL.descriptionSummary,
    score: typeof parsed.score === "number" ? parsed.score : SENTINEL.score,
    matchedSkills: Array.isArray(parsed.matchedSkills)
      ? (parsed.matchedSkills as string[])
      : [],
    missingSkills: Array.isArray(parsed.missingSkills)
      ? (parsed.missingSkills as string[])
      : [],
    summary: (parsed.summary as string) || SENTINEL.summary,
    recommendation:
      (parsed.recommendation as string) || SENTINEL.recommendation,
    applyUrl: (parsed.applyUrl as string) || "",
    contactEmail: (parsed.contactEmail as string) || "",
  };
}

export async function analyzeJob(
  scrapeResult: AnalyzeInput,
  resumeText: string,
  apiKey: string,
  model: string,
): Promise<AnalyzeResult> {
  const { rawText, scrapeStatus, url } = scrapeResult;

  const client = createClient(apiKey);

  const filter = await classifyIsTech(rawText, scrapeStatus, model, client);
  if (!filter.isTech) {
    console.log(
      `  [Filter] Non-tech job — skipped (${filter.title || "unknown title"})`,
    );
    return {
      url,
      title: filter.title || "Unknown",
      company: filter.company || "Unknown",
      location: "Not analyzed",
      salary: "Not analyzed",
      descriptionSummary: "Non-tech job — skipped by pre-filter",
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      summary: "Filtered out: not a tech job",
      recommendation: "Skip",
      scrapeStatus,
    };
  }

  const prompt = buildPrompt(rawText, resumeText, scrapeStatus);

  if (process.env.DEBUG === "true") {
    const debugDir = path.resolve("debug");
    await mkdir(debugDir, { recursive: true });
    const promptFile = path.join(debugDir, `prompt_${Date.now()}.txt`);
    await Bun.write(promptFile, prompt);
    console.log(
      `  [AI] Prompt dumped → ${promptFile} (${prompt.length} chars)`,
    );
  }

  let responseText = "";
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("AI request timed out after 60s")),
        60000,
      ),
    );
    const completion = await Promise.race([
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      timeout,
    ]);
    responseText = completion.choices[0]?.message?.content || "";
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
    descriptionSummary:
      (parsed.descriptionSummary as string) || SENTINEL.descriptionSummary,
    score: typeof parsed.score === "number" ? parsed.score : SENTINEL.score,
    matchedSkills: Array.isArray(parsed.matchedSkills)
      ? (parsed.matchedSkills as string[])
      : [],
    missingSkills: Array.isArray(parsed.missingSkills)
      ? (parsed.missingSkills as string[])
      : [],
    summary: (parsed.summary as string) || SENTINEL.summary,
    recommendation:
      (parsed.recommendation as string) || SENTINEL.recommendation,
    scrapeStatus,
  };
}
