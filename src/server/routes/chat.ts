import Elysia, { t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { resume, settings } from '../db/schema';
import { authPlugin } from '../plugins/auth';
import { logger } from '../lib/logger';
import OpenAI from 'openai';

function createClient(apiKey: string) {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    timeout: 120000,
    maxRetries: 0,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/FrhCode/job-search-automation',
      'X-Title': 'Job Search Automation',
    },
  });
}

function coachSystemPrompt(resumeText: string): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return {
    role: 'system',
    content: `You are a sharp, no-nonsense career coach. Your job is to make this resume as strong as possible — but you do NOT rewrite on demand. You DIAGNOSE, CRITIQUE, and ASK first.

Today is ${today}. Use this date as your reference for evaluating timelines, employment dates, and anything time-sensitive in the resume.

The user's current resume:
---
${resumeText}
---

YOUR BEHAVIOR:
1. When the user points to a section or a weak spot, your FIRST response must be a BRIEF CRITICAL ANALYSIS. 1-2 sentences max. Tell them honestly what's wrong.
2. Use your judgment:
   - If the fix is OBVIOUS (typos, grammar, formatting, missing keywords, weak verbs like "helped" or "worked on"), just RECOMMEND THE FIX DIRECTLY. Show the old text and your proposed new text. No need to ask questions.
   - If the issue is CONTENT GAPS (missing metrics, unclear impact, vague scope), ask 1-2 SHORT, specific questions. Keep each question to ONE line. Example: "What was the actual metric? e.g., reduced load time from 5s to 500ms."
   - If the issue is SKILL DEPTH, ask ONE quick question like: "What version/tool and what specific task did you do?"
3. Once the user ANSWERS, STOP asking. Immediately show CONCRETE RECOMMENDED CHANGES. Old text → new text, side by side. Keep it to ONE change at a time. Do NOT dump a full rewritten resume.
4. After showing a recommendation, ask: "Apply this, tweak it, or skip?"
5. If the user explicitly says "write it" or "apply it" or "rewrite this for me", THEN provide the complete rewritten resume inside a markdown code block with language label \`resume\`. Otherwise, DO NOT output a code block.
6. Be PROACTIVE but CONCISE. Call out gaps in 1 sentence, then move on.
7. Be CRITICAL, not polite. If something is mediocre, say it's mediocre.

CRITICAL RULES:
- For obvious fixes: critique → recommend directly. Skip the interrogation.
- For content gaps: critique → 1-2 short questions → show change.
- Once the user answers, SHOW CHANGES. Never ask a second round.
- One change at a time. Iterate in small bites.
- When you DO rewrite (only after explicit user request), make ONLY the changes discussed.
- Always end with: apply, tweak, or move on?

For general coaching questions or advice, respond normally without code blocks.`,
  };
}

async function getResumeAndConfig(set: { status: number }) {
  const [resumeRow] = await db.select().from(resume).limit(1);
  if (!resumeRow) {
    set.status = 400;
    return null;
  }
  const [apiKeyRow, modelRow] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
    db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
  ]);
  const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
  const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-20250514';
  if (!apiKey) {
    set.status = 400;
    return null;
  }
  return { resumeRow, apiKey, model };
}

export const chatRoutes = new Elysia({ prefix: '/api/chat' })
  .use(authPlugin)

  .post('/resume', async ({ body, set }) => {
    const config = await getResumeAndConfig(set);
    if (!config) {
      if (set.status === 400) return { message: set.status === 400 ? 'No resume uploaded or API key missing.' : 'Error' };
      return { message: 'No resume uploaded. Please upload a resume first.' };
    }
    const { resumeRow, apiKey, model } = config;
    const client = createClient(apiKey);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = body.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Chat request timed out after 60s')), 60000),
      );
      const completion = await Promise.race<OpenAI.Chat.Completions.ChatCompletion>([
        client.chat.completions.create({
          model,
          messages: [coachSystemPrompt(resumeRow.extractedText), ...messages],
          temperature: 0.7,
        }),
        timeout,
      ]);
      const reply = completion.choices[0]?.message?.content || '';
      return { reply };
    } catch (err) {
      logger.error(`  [Chat] Error: ${(err as Error).message}`);
      set.status = 500;
      return { message: 'AI chat failed. Please try again.' };
    }
  }, {
    requireAuth: true,
    body: t.Object({
      messages: t.Array(t.Object({
        role: t.String(),
        content: t.String(),
      })),
    }),
  })

  .post('/resume/stream', async ({ body, set }) => {
    const [resumeRow] = await db.select().from(resume).limit(1);
    if (!resumeRow) {
      set.status = 400;
      return { message: 'No resume uploaded. Please upload a resume first.' };
    }
    const [apiKeyRow, modelRow] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4';
    if (!apiKey) {
      set.status = 400;
      return { message: 'No OpenRouter API key configured.' };
    }

    const client = createClient(apiKey);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = body.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          const stream = await client.chat.completions.create({
            model,
            messages: [coachSystemPrompt(resumeRow.extractedText), ...messages],
            temperature: 0.7,
            stream: true,
          });
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          logger.error(`  [Chat/Stream] Error: ${(err as Error).message}`);
          controller.enqueue(encoder.encode('\n\n[Error: AI response failed. Please try again.]'));
        } finally {
          controller.close();
        }
      },
    });
  }, {
    requireAuth: true,
    body: t.Object({
      messages: t.Array(t.Object({
        role: t.String(),
        content: t.String(),
      })),
    }),
  })

  .post('/resume/analyze', async ({ set }) => {
    const [resumeRow] = await db.select().from(resume).limit(1);
    if (!resumeRow) {
      set.status = 400;
      return { message: 'No resume uploaded.' };
    }
    const [apiKeyRow, modelRow] = await Promise.all([
      db.select().from(settings).where(eq(settings.key, 'openrouter_api_key')).limit(1),
      db.select().from(settings).where(eq(settings.key, 'openrouter_model')).limit(1),
    ]);
    const apiKey = apiKeyRow[0]?.value || process.env.OPENROUTER_API_KEY || '';
    const model = modelRow[0]?.value || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-20250514';
    if (!apiKey) {
      set.status = 400;
      return { message: 'No OpenRouter API key configured.' };
    }

    const client = createClient(apiKey);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    logger.info(`[Analyze] Starting analysis with model: ${model}`);
    logger.info(`[Analyze] Resume text length: ${resumeRow.extractedText.length} chars`);

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analyze request timed out after 120s')), 120000),
      );
      logger.info('[Analyze] Sending request to OpenRouter...');
      const completion = await Promise.race<OpenAI.Chat.Completions.ChatCompletion>([
        client.chat.completions.create({
          model,
          temperature: 0.3,
          max_tokens: 2048,
          messages: [
          {
            role: 'system',
            content: `You are a resume analyst. Today is ${today}. Use this as your reference date when evaluating employment timelines, dates, and anything time-sensitive.

ABSOLUTE RULES — NEVER VIOLATE:
1. NEVER flag "total years of experience" summary statements (e.g., "4 years of experience", "5+ years", "over 3 years") as "overstated" or "exaggerated" just because individual job durations might add up to slightly less. Total years is a rounded, good-faith estimate that includes internships, freelance, part-time, overlapping roles, or gaps not listed in detail. ONLY flag date claims if there is a clear factual impossibility (e.g., claiming 10 years but the oldest listed role is from 2 years ago).
2. For PERSONAL PROJECTS, SIDE PROJECTS, OPEN SOURCE, or PORTFOLIO sections: do NOT flag for missing business metrics or "impact." Evaluate technical depth, what was built, technologies used, and challenges solved instead.

SECTION-SPECIFIC RULES:
- For WORK EXPERIENCE sections: expect metrics, business impact, outcomes, and quantified achievements.
- Personal projects are allowed to be descriptive rather than metric-driven.

Return ONLY valid JSON with no explanation, no markdown fences, no extra text.`,
          },
          {
            role: 'user',
            content: `Analyze this resume and identify 3-7 weak spots that need improvement. For each weak spot, find an exact short phrase or sentence from the resume text.

IMPORTANT: Do NOT flag "total years of experience" claims as overstated. Rounded totals (e.g., "4 years") are normal and valid even if individual job tenures don't perfectly sum to that number.

Resume:
---
${resumeRow.extractedText}
---

Return ONLY this JSON structure (no markdown, no explanation):
{"weakSpots":[{"snippet":"exact short phrase copied from resume","issue":"concise reason it is weak","severity":"high"}]}

severity must be "high" or "medium". snippet must be an exact substring of the resume text, kept short (under 80 chars).`,
          },
        ],
      }),
        timeout,
      ]);

      logger.info('[Analyze] Response received, parsing...');
      const raw = completion.choices[0]?.message?.content || '{}';
      logger.info(`[Analyze] Raw response length: ${raw.length} chars`);
      // Strip markdown fences if the model disobeys
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      logger.info(`[Analyze] Found ${parsed.weakSpots?.length ?? 0} weak spots`);
      return { weakSpots: parsed.weakSpots ?? [] };
    } catch (err) {
      logger.error(`[Chat/Analyze] Error: ${(err as Error).message}`);
      return { weakSpots: [] };
    }
  }, {
    requireAuth: true,
  });
