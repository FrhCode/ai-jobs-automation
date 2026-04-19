import Elysia from 'elysia';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { jobs } from '../db/schema';
import { authPlugin } from '../plugins/auth';

export const statsRoutes = new Elysia({ prefix: '/api/stats' })
  .use(authPlugin)

  .get('/', async () => {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(jobs);
    const total = Number(totalResult[0]?.count ?? 0);

    const byRecommendation = await db
      .select({
        recommendation: jobs.recommendation,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .groupBy(jobs.recommendation);

    const byAppStatus = await db
      .select({
        appStatus: jobs.appStatus,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .groupBy(jobs.appStatus);

    const avgScoreResult = await db
      .select({ avg: sql<number>`avg(${jobs.score})` })
      .from(jobs)
      .where(sql`${jobs.score} is not null`);
    const avgScore = avgScoreResult[0]?.avg ? Math.round(Number(avgScoreResult[0].avg)) : 0;

    // Score histogram: buckets of 10
    const scoreRows = await db
      .select({ score: jobs.score })
      .from(jobs)
      .where(sql`${jobs.score} is not null`);

    const histogramMap: Record<number, number> = {};
    for (let i = 0; i < 10; i++) histogramMap[i * 10] = 0;
    for (const row of scoreRows) {
      const bucket = Math.floor((row.score ?? 0) / 10) * 10;
      const key = Math.min(bucket, 90);
      histogramMap[key] = (histogramMap[key] || 0) + 1;
    }

    const scoreHistogram = Object.entries(histogramMap).map(([bucket, count]) => ({
      bucket: `${bucket}-${Number(bucket) + 9}`,
      count,
    }));

    const topCompanies = await db
      .select({
        company: jobs.company,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .where(sql`${jobs.company} is not null and ${jobs.company} <> 'Unknown'`)
      .groupBy(jobs.company)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return {
      total,
      byRecommendation: Object.fromEntries(byRecommendation.map((r) => [r.recommendation ?? 'unknown', r.count])),
      byAppStatus: Object.fromEntries(byAppStatus.map((r) => [r.appStatus ?? 'unknown', r.count])),
      avgScore,
      scoreHistogram,
      topCompanies,
    };
  }, {
    requireAuth: true,
  });
