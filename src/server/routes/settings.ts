import { eq, inArray } from "drizzle-orm";
import Elysia from "elysia";
import { updateSettingsSchema } from "../../shared/schemas/settings";
import { db } from "../db";
import { settings } from "../db/schema";
import { reloadCronSchedule } from "../lib/cronScheduler";
import { authPlugin } from "../plugins/auth";

function maskValue(key: string, value: string): string {
  if (key === "openrouter_api_key" && value.startsWith("sk-or-")) {
    return "sk-or-***";
  }
  if (key === "app_password_hash") {
    return "***";
  }
  return value;
}

function isMaskedValue(key: string, value: string): boolean {
  if (key === "openrouter_api_key" && value === "sk-or-***") {
    return true;
  }
  if (key === "app_password_hash" && value === "***") {
    return true;
  }
  return false;
}

export const settingsRoutes = new Elysia({ prefix: "/api/settings" })
  .use(authPlugin)

  .get(
    "/",
    async () => {
      const rows = await db.select().from(settings);
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = maskValue(row.key, row.value);
      }
      return result;
    },
    {
      requireAuth: true,
    },
  )

  .put(
    "/",
    async ({ body }) => {
      const keys = Object.keys(body);
      if (keys.length === 0) return {};

      await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(settings)
          .where(inArray(settings.key, keys));
        const existingSet = new Set(existing.map((r) => r.key));

        for (const [key, value] of Object.entries(body)) {
          if (value === undefined || value === null) continue;
          if (isMaskedValue(key, value)) continue;
          if (existingSet.has(key)) {
            await tx
              .update(settings)
              .set({ value })
              .where(eq(settings.key, key));
          } else {
            await tx.insert(settings).values({ key, value });
          }
        }
      });

      await reloadCronSchedule();

      const rows = await db.select().from(settings);
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = maskValue(row.key, row.value);
      }
      return result;
    },
    {
      requireAuth: true,
      body: updateSettingsSchema,
    },
  );
