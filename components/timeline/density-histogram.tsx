"use client";

import * as React from "react";
import type { TimelineBucket } from "@/types/visualization";

interface DensityHistogramProps {
  buckets: TimelineBucket[];
  currentIndex: number;
  width: number;
  height: number;
  onSeek?: (index: number) => void;
}

export function DensityHistogram({
  buckets,
  currentIndex,
  width,
  height,
  onSeek,
}: DensityHistogramProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  if (buckets.length === 0 || width === 0) return null;

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const barWidth = Math.max(2, (width - 20) / buckets.length);
  const padding = { top: 10, bottom: 10, left: 10, right: 10 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  // Calculate bar dimensions
  const bars = buckets.map((bucket, index) => {
    const barHeight = (bucket.count / maxCount) * chartHeight;
    const x = padding.left + (index / buckets.length) * chartWidth;
    const y = padding.top + chartHeight - barHeight;

    return {
      x,
      y,
      width: Math.max(1, barWidth - 1),
      height: Math.max(1, barHeight),
      bucket,
      index,
    };
  });

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !onSeek) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const ratio = x / chartWidth;
    const index = Math.floor(ratio * buckets.length);
    if (index >= 0 && index < buckets.length) {
      onSeek(index);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const ratio = x / chartWidth;
    const index = Math.floor(ratio * buckets.length);
    if (index >= 0 && index < buckets.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  // Current position marker
  const currentX = padding.left + (currentIndex / buckets.length) * chartWidth;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-pointer"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Background */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="var(--secondary)"
          rx={4}
          opacity={0.3}
        />

        {/* Bars */}
        <g>
          {bars.map((bar) => {
            const isPast = bar.index <= currentIndex;
            const isHovered = bar.index === hoverIndex;
            const isCurrent = bar.index === currentIndex;

            return (
              <rect
                key={bar.index}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={
                  isCurrent
                    ? "var(--primary)"
                    : isPast
                      ? "var(--transform-color)"
                      : isHovered
                        ? "var(--muted-foreground)"
                        : "var(--border)"
                }
                opacity={isPast ? 0.9 : 0.5}
                rx={1}
                className="transition-all duration-100"
              />
            );
          })}
        </g>

        {/* Current position line */}
        <line
          x1={currentX}
          y1={padding.top}
          x2={currentX}
          y2={height - padding.bottom}
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Current position handle */}
        <circle
          cx={currentX}
          cy={height - padding.bottom}
          r={6}
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth={2}
        />

        {/* Hover indicator */}
        {hoverIndex !== null && hoverIndex !== currentIndex && (
          <line
            x1={padding.left + (hoverIndex / buckets.length) * chartWidth}
            y1={padding.top}
            x2={padding.left + (hoverIndex / buckets.length) * chartWidth}
            y2={height - padding.bottom}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverIndex !== null && buckets[hoverIndex] && (
        <div
          className="absolute pointer-events-none z-10 px-2 py-1 rounded bg-[var(--popover)] border border-[var(--border)] shadow-md text-xs"
          style={{
            left: Math.min(
              width - 120,
              Math.max(10, padding.left + (hoverIndex / buckets.length) * chartWidth - 50)
            ),
            top: -35,
          }}
        >
          <span className="font-medium text-[var(--foreground)]">
            {buckets[hoverIndex].count} commits
          </span>
          <span className="text-[var(--muted-foreground)] ml-2">
            {formatDate(buckets[hoverIndex].date)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
