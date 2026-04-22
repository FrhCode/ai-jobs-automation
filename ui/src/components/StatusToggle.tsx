import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StatusToggleProps {
  readonly status: string | null | undefined;
  readonly onChange: (status: "applied" | "not_interested" | "not_applied") => void;
}

export function StatusToggle({ status, onChange }: StatusToggleProps) {
  const isApplied = status === "applied";
  const isNotInterested = status === "not_interested";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(isApplied ? "not_applied" : "applied")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
          isApplied
            ? "bg-cyan text-white"
            : "border border-border-subtle text-text-secondary hover:text-cyan hover:border-cyan/30"
        )}
      >
        {isApplied && <Check className="w-3.5 h-3.5" />}
        Applied
      </button>
      <button
        type="button"
        onClick={() => onChange(isNotInterested ? "not_applied" : "not_interested")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
          isNotInterested
            ? "bg-rose text-white"
            : "border border-border-subtle text-text-secondary hover:text-rose hover:border-rose/30"
        )}
      >
        {isNotInterested && <Check className="w-3.5 h-3.5" />}
        Not Interested
      </button>
    </div>
  );
}
