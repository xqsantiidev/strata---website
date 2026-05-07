"use client";

import * as React from "react";
import { DensityHistogram } from "./density-histogram";
import { PlaybackControls } from "../controls/playback-controls";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { bucketCommitsByTime } from "@/lib/processing/commit-parser";
import type { CommitTimelineEntry } from "@/types/visualization";

interface TimelinePlayerProps {
  className?: string;
}

export function TimelinePlayer({ className }: TimelinePlayerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 60 });

  const {
    commits,
    currentCommitIndex,
    isPlaying,
    playbackSpeed,
    startDate,
    endDate,
    currentDate,
    advanceFrame,
    seekToIndex,
  } = useTimelineStore();

  // Calculate timeline buckets
  const buckets = React.useMemo(() => {
    if (commits.length === 0) return [];
    return bucketCommitsByTime(commits, "day");
  }, [commits]);

  // Map commit index to bucket index
  const currentBucketIndex = React.useMemo(() => {
    if (!currentDate || buckets.length === 0) return 0;

    // Find the bucket that contains the current date
    for (let i = 0; i < buckets.length; i++) {
      const bucketDate = buckets[i].date;
      const nextBucketDate = buckets[i + 1]?.date;

      if (!nextBucketDate || currentDate < nextBucketDate) {
        return i;
      }
    }
    return buckets.length - 1;
  }, [currentDate, buckets]);

  // Handle resize
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: 60,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Playback timer
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      advanceFrame();
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, advanceFrame]);

  // Handle seek from histogram
  const handleSeek = React.useCallback(
    (bucketIndex: number) => {
      if (buckets.length === 0) return;

      // Find the first commit in this bucket
      const targetBucket = buckets[bucketIndex];
      if (!targetBucket || targetBucket.commits.length === 0) {
        // Find nearest bucket with commits
        for (let i = bucketIndex; i >= 0; i--) {
          if (buckets[i].commits.length > 0) {
            const commit = buckets[i].commits[0];
            const commitIndex = commits.findIndex((c) => c.sha === commit.sha);
            if (commitIndex >= 0) {
              seekToIndex(commitIndex);
              return;
            }
          }
        }
        return;
      }

      const commit = targetBucket.commits[0];
      const commitIndex = commits.findIndex((c) => c.sha === commit.sha);
      if (commitIndex >= 0) {
        seekToIndex(commitIndex);
      }
    },
    [buckets, commits, seekToIndex]
  );

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          useTimelineStore.getState().togglePlayback();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekToIndex(Math.max(0, currentCommitIndex - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekToIndex(Math.min(commits.length - 1, currentCommitIndex + 1));
          break;
        case "Home":
          e.preventDefault();
          useTimelineStore.getState().seekToStart();
          break;
        case "End":
          e.preventDefault();
          useTimelineStore.getState().seekToEnd();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCommitIndex, commits.length, seekToIndex]);

  if (commits.length === 0) {
    return (
      <div className={`h-[100px] bg-[var(--card)] border-t border-[var(--border)] flex items-center justify-center ${className}`}>
        <p className="text-sm text-[var(--muted-foreground)]">
          No commits loaded
        </p>
      </div>
    );
  }

  const currentCommit = commits[currentCommitIndex];

  return (
    <div
      className={`bg-[var(--card)]/95 backdrop-blur-sm border-t border-[var(--border)] ${className}`}
    >
      {/* Histogram */}
      <div ref={containerRef} className="px-4 pt-3">
        <DensityHistogram
          buckets={buckets}
          currentIndex={currentBucketIndex}
          width={dimensions.width}
          height={dimensions.height}
          onSeek={handleSeek}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Date info */}
        <div className="flex items-center gap-4 text-sm">
          <TimeInfo label="Start" date={startDate} />
          <div className="h-4 w-px bg-[var(--border)]" />
          <TimeInfo label="Current" date={currentDate} highlight />
          <div className="h-4 w-px bg-[var(--border)]" />
          <TimeInfo label="End" date={endDate} />
        </div>

        {/* Playback controls */}
        <PlaybackControls />

        {/* Commit info */}
        <div className="text-right">
          <p className="text-xs text-[var(--muted-foreground)]">
            Commit {currentCommitIndex + 1} of {commits.length}
          </p>
          {currentCommit && (
            <p className="text-xs text-[var(--foreground)] truncate max-w-[200px]">
              {currentCommit.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeInfo({
  label,
  date,
  highlight,
}: {
  label: string;
  date: Date | null;
  highlight?: boolean;
}) {
  if (!date) return null;

  return (
    <div>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p
        className={`text-sm tabular-nums ${highlight ? "text-[var(--primary)] font-medium" : "text-[var(--foreground)]"}`}
      >
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
