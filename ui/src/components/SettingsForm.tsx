import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  Clock,
  Cpu,
  Globe,
  Play,
  Save,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface SettingsFormProps {
  readonly settings: Record<string, string>;
  readonly onSave: (updates: Record<string, string>) => void;
  readonly isPending: boolean;
  readonly isSuccess?: boolean;
  readonly isError?: boolean;
  readonly error?: Error | null;
  readonly onTriggerCron?: () => void;
  readonly isTriggering?: boolean;
  readonly triggerResult?: {
    searchUrls: number;
    found: number;
    newUrls: number;
  } | null;
}

export function SettingsForm({
  settings,
  onSave,
  isPending,
  isSuccess,
  isError,
  error,
  onTriggerCron,
  isTriggering,
  triggerResult,
}: SettingsFormProps) {
  const [form, setForm] = useState(settings);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const urls = (() => {
    try {
      return JSON.parse(form.cron_search_urls ?? "[]") as string[];
    } catch {
      return [];
    }
  })();

  const cronEnabled = form.cron_enabled === "true";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* AI Configuration */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-cyan-dim border border-cyan/15 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-cyan" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            AI Configuration
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <Field>
            <FieldLabel htmlFor="api-key">OpenRouter API Key</FieldLabel>
            <Input
              id="api-key"
              value={form.openrouter_api_key ?? ""}
              onChange={(e) => update("openrouter_api_key", e.target.value)}
              placeholder="sk-or-…"
              className="font-mono"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ai-model">Model</FieldLabel>
            <Input
              id="ai-model"
              value={form.openrouter_model ?? ""}
              onChange={(e) => update("openrouter_model", e.target.value)}
              placeholder="anthropic/claude-sonnet-4-20250514"
              className="font-mono"
            />
          </Field>
        </div>
      </div>

      {/* Cron Scheduler */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-glow border border-amber/15 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-amber" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            Cron Scheduler
          </h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Enable scheduled scraping
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Automatically scrape job URLs on a schedule
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cronEnabled}
              onClick={() =>
                update("cron_enabled", cronEnabled ? "false" : "true")
              }
              className={cn(
                "w-10 h-6 rounded-full transition-colors duration-200 relative shrink-0",
                cronEnabled ? "bg-cyan" : "bg-border-subtle",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all duration-200",
                  cronEnabled ? "left-5" : "left-1",
                )}
              />
            </button>
          </div>

          <Field>
            <FieldLabel>Cron Expression</FieldLabel>
            <Input
              value={form.cron_schedule ?? ""}
              onChange={(e) => update("cron_schedule", e.target.value)}
              placeholder="0 9 * * *"
              className="font-mono"
            />
            <FieldDescription>
              Example:{" "}
              <code className="font-mono bg-surface-elevated px-1 py-0.5 rounded text-text-secondary">
                0 9 * * *
              </code>{" "}
              = daily at 9 AM
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel
              htmlFor="search-urls"
              className="flex items-center gap-1.5"
            >
              <Globe className="w-3 h-3 text-text-muted" />
              Search URLs
              <span className="text-text-muted font-normal">
                (one per line)
              </span>
            </FieldLabel>
            <Textarea
              id="search-urls"
              value={urls.join("\n")}
              onChange={(e) =>
                update(
                  "cron_search_urls",
                  JSON.stringify(e.target.value.split("\n").filter(Boolean)),
                )
              }
              rows={5}
              className="font-mono resize-y"
            />
          </Field>

          <Field>
            <FieldLabel className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-text-muted" />
              Request Delay (ms)
            </FieldLabel>
            <Input
              type="number"
              value={form.request_delay_ms ?? "2000"}
              onChange={(e) => update("request_delay_ms", e.target.value)}
              className="font-mono"
            />
          </Field>

          <div className="pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onTriggerCron}
              disabled={isTriggering}
              className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTriggering ? (
                <>
                  <div className="w-4 h-4 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-cyan" />
                  Run Cron Now
                </>
              )}
            </button>
            {triggerResult && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald">
                <CheckCircle className="w-3.5 h-3.5" />
                Scanned {triggerResult.searchUrls} URL(s), found{" "}
                {triggerResult.found} jobs, enqueued {triggerResult.newUrls} new
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={isPending}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
            isSuccess ? "bg-emerald text-white" : "btn-primary",
          )}
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>

        {isError && (
          <div className="flex items-start gap-2 text-xs text-rose bg-rose/10 border border-rose/20 rounded-lg px-3 py-2.5">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Failed to save settings</p>
              <p className="text-rose/80 mt-0.5">
                {error?.message || "Something went wrong. Please try again."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
