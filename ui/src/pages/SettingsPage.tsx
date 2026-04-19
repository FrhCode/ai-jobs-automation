import { SettingsForm } from '@/components/SettingsForm';
import { useSettings, useUpdateSettings, useTriggerCron } from '@/hooks/useSettings';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const trigger = useTriggerCron();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
      <div className="w-5 h-5 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      Loading settings...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-cyan" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
      </div>
      <p className="text-sm text-text-secondary -mt-4">
        Configure AI model, API keys, and scheduled scraping behavior.
      </p>
      <SettingsForm
        key={JSON.stringify(settings)}
        settings={settings ?? {}}
        onSave={(updates) => update.mutate(updates)}
        isPending={update.isPending}
        isSuccess={update.isSuccess}
        isError={update.isError}
        error={update.error}
        onTriggerCron={() => trigger.mutate()}
        isTriggering={trigger.isPending}
        triggerResult={trigger.isSuccess ? trigger.data : null}
      />
    </div>
  );
}
