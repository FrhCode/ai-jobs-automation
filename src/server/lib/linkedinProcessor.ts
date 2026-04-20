import { eq } from "drizzle-orm";
import { db } from "../db";
import type { SelectLinkedInPost } from "../db/schema";
import { linkedinPosts } from "../db/schema";
import { analyzeLinkedInPost, classifyIsProgrammerJob } from "./aiAnalyzer";
import type { ParsedPost } from "./linkedinParser";

const CONCURRENCY = 3;

interface ProcessingContext {
  batchId: string;
  resumeText: string;
  apiKey: string;
  model: string;
}

async function runWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        console.error(
          `[LinkedIn Batch] Worker error at index ${i}:`,
          (err as Error).message,
        );
        throw err;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function processLinkedInBatch(
  posts: ParsedPost[],
  existingMap: Map<string, SelectLinkedInPost>,
  ctx: ProcessingContext,
): Promise<void> {
  const { batchId, resumeText, apiKey, model } = ctx;

  let analyzedCount = 0;
  let reusedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Step 1: Insert/update all posts with basic metadata so they appear in UI immediately
  const postIds = new Map<string, number>();
  for (const post of posts) {
    const existing = existingMap.get(post.contentHash);

    const data = {
      contentHash: post.contentHash,
      batchId,
      authorName: post.authorName,
      authorHeadline: post.authorHeadline,
      postContent: post.postContent,
      rawHtml: post.rawHtml,
      matchedKeywords: post.matchedKeywords,
      isJob: existing?.isJob ?? false,
      title: existing?.title ?? null,
      company: existing?.company ?? null,
      location: existing?.location ?? null,
      salary: existing?.salary ?? null,
      score: existing?.score ?? null,
      matchedSkills: existing?.matchedSkills ?? [],
      missingSkills: existing?.missingSkills ?? [],
      summary: existing?.summary ?? null,
      recommendation: existing?.recommendation ?? null,
      aiAnalyzed: existing?.aiAnalyzed ?? false,
      applyUrl: existing?.applyUrl ?? null,
      contactEmail: existing?.contactEmail ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db
        .update(linkedinPosts)
        .set(data)
        .where(eq(linkedinPosts.id, existing.id))
        .returning();
      postIds.set(post.contentHash, updated.id);
      if (existing.aiAnalyzed) {
        reusedCount++;
      }
    } else {
      const [inserted] = await db
        .insert(linkedinPosts)
        .values(data)
        .onConflictDoUpdate({
          target: linkedinPosts.contentHash,
          set: { batchId, updatedAt: new Date() },
        })
        .returning();
      postIds.set(post.contentHash, inserted.id);
    }
  }

  // Determine which posts need processing
  type PostTask = {
    post: ParsedPost;
    postId: number;
    existing: { id: number; aiAnalyzed: boolean | null } | undefined;
  };

  const tasks: PostTask[] = [];
  for (const post of posts) {
    const existing = existingMap.get(post.contentHash);
    const postId = postIds.get(post.contentHash);
    if (!postId) continue;

    // Skip if already fully analyzed
    if (existing && existing.aiAnalyzed) continue;

    // Skip if no AI credentials
    if (!resumeText || !apiKey) continue;

    tasks.push({ post, postId, existing });
  }

  if (tasks.length === 0) {
    console.log(
      `[LinkedIn Batch] ${batchId} complete — all ${posts.length} posts reused from cache`,
    );
    return;
  }

  // Step 2: Run lightweight programmer-job filter in parallel
  console.log(
    `[LinkedIn Batch] Running programmer filter for ${tasks.length} posts`,
  );
  const filterResults = await runWithLimit(
    tasks.map(({ post, postId }) => async () => {
      try {
        const result = await classifyIsProgrammerJob(
          post.postContent,
          apiKey,
          model,
        );
        return {
          postId,
          contentHash: post.contentHash,
          result,
          error: null as string | null,
        };
      } catch (err) {
        return {
          postId,
          contentHash: post.contentHash,
          result: null,
          error: (err as Error).message,
        };
      }
    }),
    CONCURRENCY,
  );

  // Step 3: For non-programmer jobs, save early result and skip full analysis
  const fullAnalysisTasks: PostTask[] = [];
  for (const fr of filterResults) {
    if (!fr.result) {
      // Filter failed — leave as unanalyzed so retry can reprocess
      failedCount++;
      await db
        .update(linkedinPosts)
        .set({
          aiAnalyzed: false,
          aiFailed: true,
          summary: `AI analysis failed: ${fr.error}`,
          updatedAt: new Date(),
        })
        .where(eq(linkedinPosts.id, fr.postId));
      continue;
    }

    if (!fr.result.isProgrammerJob) {
      // Not a programmer job — save minimal result
      skippedCount++;
      await db
        .update(linkedinPosts)
        .set({
          isJob: false,
          title: fr.result.title || "Unknown",
          company: fr.result.company || "Unknown",
          score: 0,
          recommendation: "Skip",
          summary: "Not a programmer/tech job — filtered out",
          aiAnalyzed: true,
          aiFailed: false,
          updatedAt: new Date(),
        })
        .where(eq(linkedinPosts.id, fr.postId));
      continue;
    }

    // Programmer job — needs full analysis
    const task = tasks.find((t) => t.postId === fr.postId);
    if (task) fullAnalysisTasks.push(task);
  }

  // Step 4: Run full AI analysis only for programmer jobs
  if (fullAnalysisTasks.length > 0) {
    console.log(
      `[LinkedIn Batch] Running full analysis for ${fullAnalysisTasks.length} programmer jobs`,
    );
    const aiResults = await runWithLimit(
      fullAnalysisTasks.map(({ post, postId }) => async () => {
        try {
          const aiResult = await analyzeLinkedInPost(
            post.postContent,
            resumeText,
            apiKey,
            model,
          );
          analyzedCount++;
          return { postId, aiResult, error: null as string | null };
        } catch (err) {
          failedCount++;
          return { postId, aiResult: null, error: (err as Error).message };
        }
      }),
      CONCURRENCY,
    );

    for (const result of aiResults) {
      if (result.aiResult) {
        await db
          .update(linkedinPosts)
          .set({
            isJob: true,
            title: result.aiResult.title,
            company: result.aiResult.company,
            location: result.aiResult.location,
            salary: result.aiResult.salary,
            score: result.aiResult.score,
            matchedSkills: result.aiResult.matchedSkills,
            missingSkills: result.aiResult.missingSkills,
            summary: result.aiResult.summary,
            recommendation: result.aiResult.recommendation,
            applyUrl: result.aiResult.applyUrl || null,
            contactEmail: result.aiResult.contactEmail || null,
            aiAnalyzed: true,
            aiFailed: false,
            updatedAt: new Date(),
          })
          .where(eq(linkedinPosts.id, result.postId));
      } else {
        await db
          .update(linkedinPosts)
          .set({
            aiAnalyzed: false,
            aiFailed: true,
            summary: `AI analysis failed: ${result.error}`,
            updatedAt: new Date(),
          })
          .where(eq(linkedinPosts.id, result.postId));
      }
    }
  }

  console.log(
    `[LinkedIn Batch] ${batchId} complete — full analysis: ${analyzedCount}, reused: ${reusedCount}, skipped (non-programmer): ${skippedCount}, failed: ${failedCount}, total: ${posts.length}`,
  );
}
