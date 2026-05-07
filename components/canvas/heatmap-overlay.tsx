"use client";

import * as React from "react";
import type { HotspotData } from "@/types/visualization";

interface HeatmapOverlayProps {
  hotspots: HotspotData[];
  visible?: boolean;
}

export function HeatmapOverlay({ hotspots, visible = true }: HeatmapOverlayProps) {
  if (!visible || hotspots.length === 0) return null;

  const topHotspots = hotspots.slice(0, 10);

  return (
    <div className="absolute top-4 left-4 w-64 p-4 rounded-lg bg-[var(--card)]/95 border border-[var(--border)] backdrop-blur-sm">
      <h3 className="text-sm font-medium text-[var(--foreground)] mb-3 flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full bg-[var(--destructive)] animate-pulse"
          style={{ boxShadow: "0 0 8px var(--destructive)" }}
        />
        Hotspots
      </h3>
      <div className="space-y-2">
        {topHotspots.map((hotspot) => (
          <HotspotItem key={hotspot.fileId} hotspot={hotspot} />
        ))}
      </div>
    </div>
  );
}

function HotspotItem({ hotspot }: { hotspot: HotspotData }) {
  const filename = hotspot.path.split("/").pop() || hotspot.path;
  const directory = hotspot.path.split("/").slice(0, -1).join("/") || "/";

  return (
    <div className="group">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: `rgba(239, 68, 68, ${0.3 + hotspot.score * 0.7})`,
            boxShadow: `0 0 ${hotspot.score * 8}px rgba(239, 68, 68, ${hotspot.score})`,
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-[var(--foreground)] truncate">
            {filename}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] truncate">
            {directory}
          </p>
        </div>
        <div className="text-xs tabular-nums text-[var(--muted-foreground)]">
          {(hotspot.score * 100).toFixed(0)}%
        </div>
      </div>
      {/* Intensity bar */}
      <div className="mt-1 h-0.5 bg-[var(--secondary)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${hotspot.score * 100}%`,
            background: `linear-gradient(90deg, var(--render-color), var(--destructive))`,
          }}
        />
      </div>
    </div>
  );
}

// Legend component for the heatmap
export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
      <span>Low</span>
      <div className="w-24 h-2 rounded-full bg-gradient-to-r from-[var(--render-color)] to-[var(--destructive)]" />
      <span>High</span>
    </div>
  );
}
