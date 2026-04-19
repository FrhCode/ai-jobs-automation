import { z } from 'zod';

export const settingsSchema = z.record(z.string(), z.string());

export const updateSettingsSchema = z.record(z.string(), z.string().optional());

export type SettingsMap = z.infer<typeof settingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
