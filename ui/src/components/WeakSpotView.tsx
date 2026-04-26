import type { WeakSpot } from '@/api';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface WeakSpotViewProps {
  text: string;
  weakSpots: WeakSpot[];
  onSpotClick: (spot: WeakSpot) => void;
}

interface Segment {
  content: string;
  spot?: WeakSpot;
}

function buildSegments(text: string, weakSpots: WeakSpot[]): Segment[] {
  if (!weakSpots.length) return [{ content: text }];

  // Find positions of all snippets (sorted by start index)
  type Range = { start: number; end: number; spot: WeakSpot };
  const ranges: Range[] = [];

  for (const spot of weakSpots) {
    if (!spot.snippet) continue;
    let searchFrom = 0;
    const idx = text.indexOf(spot.snippet, searchFrom);
    if (idx === -1) continue;
    // Check for overlap with existing ranges and skip if overlapping
    const end = idx + spot.snippet.length;
    const overlaps = ranges.some((r) => idx < r.end && end > r.start);
    if (!overlaps) {
      ranges.push({ start: idx, end, spot });
      searchFrom = end;
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ content: text.slice(cursor, range.start) });
    }
    segments.push({ content: text.slice(range.start, range.end), spot: range.spot });
    cursor = range.end;
  }
  if (cursor < text.length) {
    segments.push({ content: text.slice(cursor) });
  }
  return segments;
}

function TooltipMark({
  spot,
  content,
  onClick,
}: {
  spot: WeakSpot;
  content: string;
  onClick: () => void;
}) {
  const [show, setShow] = useState(false);
  const markRef = useRef<HTMLElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!markRef.current) return;
    const rect = markRef.current.getBoundingClientRect();
    const tooltipWidth = 224; // w-56 = 14rem = 224px
    const tooltipHeight = 80; // approx
    const margin = 8;

    let top = rect.top - tooltipHeight - margin;
    // If not enough space above, show below
    if (top < margin) {
      top = rect.bottom + margin;
    }

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

    setTooltipPos({ top, left });
  }, []);

  useEffect(() => {
    if (!show) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [show, updatePosition]);

  return (
    <>
      <mark
        ref={markRef}
        onClick={onClick}
        onMouseEnter={() => {
          setShow(true);
        }}
        onMouseLeave={() => setShow(false)}
        className={cn(
          'rounded px-0.5 py-px cursor-pointer transition-colors font-medium',
          spot.severity === 'high'
            ? 'bg-amber-400 hover:bg-amber-300 text-gray-900'
            : 'bg-yellow-300 hover:bg-yellow-200 text-gray-900',
        )}
      >
        {content}
      </mark>
      {show && tooltipPos &&
        createPortal(
          <div
            className="fixed z-[9999] w-56 rounded-lg bg-surface border border-border-subtle shadow-xl px-3 py-2 text-[11px] text-text-secondary leading-snug pointer-events-none"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <span
              className={cn(
                'block font-semibold mb-0.5 text-[10px] uppercase tracking-wide',
                spot.severity === 'high' ? 'text-amber' : 'text-yellow-400',
              )}
            >
              {spot.severity === 'high' ? 'High priority' : 'Suggestion'}
            </span>
            {spot.issue}
            <span className="block mt-1 text-cyan text-[10px]">Click to coach →</span>
          </div>,
          document.body
        )}
    </>
  );
}

export function WeakSpotView({ text, weakSpots, onSpotClick }: WeakSpotViewProps) {
  const segments = buildSegments(text, weakSpots);

  return (
    <pre className="w-full h-full text-xs text-text-secondary whitespace-pre-wrap break-words font-mono leading-relaxed">
      {segments.map((seg, i) =>
        seg.spot ? (
          <TooltipMark
            key={i}
            spot={seg.spot}
            content={seg.content}
            onClick={() => onSpotClick(seg.spot!)}
          />
        ) : (
          <span key={i}>{seg.content}</span>
        )
      )}
    </pre>
  );
}
