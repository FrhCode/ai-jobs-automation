import { useMemo } from 'react';
import { Compass } from 'lucide-react';

interface SectionNavigatorProps {
  readonly resumeText: string;
  readonly onSectionClick: (section: string) => void;
}

const KNOWN_SECTIONS = [
  'Experience',
  'Education',
  'Skills',
  'Projects',
  'Summary',
  'Certifications',
  'Awards',
  'Languages',
  'Volunteer',
  'Publications',
  'References',
  'Interests',
];

export function SectionNavigator({ resumeText, onSectionClick }: SectionNavigatorProps) {
  const detected = useMemo(() => {
    const found = new Set<string>();
    const lines = resumeText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // ALL CAPS lines like EXPERIENCE, EDUCATION
      if (/^[A-Z][A-Z\s\/]+$/.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 40) {
        const normalized = trimmed
          .split(/[\s\/]+/)
          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
          .join(' ');
        found.add(normalized);
      }
      // Known keywords (case-insensitive)
      for (const section of KNOWN_SECTIONS) {
        const regex = new RegExp(`^${section}s?$`, 'i');
        if (regex.test(trimmed)) {
          found.add(section);
        }
      }
    }
    return Array.from(found);
  }, [resumeText]);

  if (detected.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="w-4 h-4 text-cyan" />
        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted">
          Sections
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {detected.map((section) => (
          <button
            key={section}
            onClick={() => onSectionClick(section)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-cyan hover:border-cyan hover:bg-cyan-dim transition-all cursor-pointer"
          >
            {section}
          </button>
        ))}
      </div>
    </div>
  );
}
