"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import type { PlaybackSpeed } from "@/types/visualization";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 4, 8];

export function PlaybackControls() {
  const {
    isPlaying,
    playbackSpeed,
    commits,
    currentCommitIndex,
    togglePlayback,
    setPlaybackSpeed,
    seekToStart,
    seekToEnd,
    seekToIndex,
  } = useTimelineStore();

  const canGoBack = currentCommitIndex > 0;
  const canGoForward = currentCommitIndex < commits.length - 1;

  return (
    <div className="flex items-center gap-2">
      {/* Jump to start */}
      <Button
        variant="ghost"
        size="icon"
        onClick={seekToStart}
        disabled={!canGoBack}
        className="h-8 w-8"
      >
        <ChevronsLeft className="h-4 w-4" />
        <span className="sr-only">Jump to start</span>
      </Button>

      {/* Step back */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => seekToIndex(currentCommitIndex - 1)}
        disabled={!canGoBack}
        className="h-8 w-8"
      >
        <SkipBack className="h-4 w-4" />
        <span className="sr-only">Previous commit</span>
      </Button>

      {/* Play/Pause */}
      <Button
        variant="default"
        size="icon"
        onClick={togglePlayback}
        disabled={commits.length === 0}
        className="h-10 w-10"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
      </Button>

      {/* Step forward */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => seekToIndex(currentCommitIndex + 1)}
        disabled={!canGoForward}
        className="h-8 w-8"
      >
        <SkipForward className="h-4 w-4" />
        <span className="sr-only">Next commit</span>
      </Button>

      {/* Jump to end */}
      <Button
        variant="ghost"
        size="icon"
        onClick={seekToEnd}
        disabled={!canGoForward}
        className="h-8 w-8"
      >
        <ChevronsRight className="h-4 w-4" />
        <span className="sr-only">Jump to end</span>
      </Button>

      {/* Speed selector */}
      <div className="ml-2 flex items-center gap-1">
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              playbackSpeed === speed
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
