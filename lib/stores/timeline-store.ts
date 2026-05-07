import { create } from "zustand";
import type { PlaybackSpeed, CommitTimelineEntry } from "@/types/visualization";

interface TimelineState {
  // Timeline data
  commits: CommitTimelineEntry[];
  currentCommitIndex: number;
  
  // Playback state
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  
  // Date range
  startDate: Date | null;
  endDate: Date | null;
  currentDate: Date | null;
  
  // Actions
  setCommits: (commits: CommitTimelineEntry[]) => void;
  setCurrentCommitIndex: (index: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  seekToStart: () => void;
  seekToEnd: () => void;
  seekToIndex: (index: number) => void;
  seekToDate: (date: Date) => void;
  advanceFrame: () => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // Initial state
  commits: [],
  currentCommitIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  startDate: null,
  endDate: null,
  currentDate: null,
  
  // Actions
  setCommits: (commits) => {
    if (commits.length === 0) {
      set({
        commits: [],
        startDate: null,
        endDate: null,
        currentDate: null,
        currentCommitIndex: 0,
      });
      return;
    }
    
    // Sort commits by date (oldest first)
    const sorted = [...commits].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    
    set({
      commits: sorted,
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      currentDate: sorted[0].date,
      currentCommitIndex: 0,
    });
  },
  
  setCurrentCommitIndex: (index) => {
    const { commits } = get();
    if (index >= 0 && index < commits.length) {
      set({
        currentCommitIndex: index,
        currentDate: commits[index].date,
      });
    }
  },
  
  play: () => set({ isPlaying: true }),
  
  pause: () => set({ isPlaying: false }),
  
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  seekToStart: () => {
    const { commits } = get();
    if (commits.length > 0) {
      set({
        currentCommitIndex: 0,
        currentDate: commits[0].date,
        isPlaying: false,
      });
    }
  },
  
  seekToEnd: () => {
    const { commits } = get();
    if (commits.length > 0) {
      set({
        currentCommitIndex: commits.length - 1,
        currentDate: commits[commits.length - 1].date,
        isPlaying: false,
      });
    }
  },
  
  seekToIndex: (index) => {
    const { commits } = get();
    const clampedIndex = Math.max(0, Math.min(index, commits.length - 1));
    if (commits.length > 0) {
      set({
        currentCommitIndex: clampedIndex,
        currentDate: commits[clampedIndex].date,
      });
    }
  },
  
  seekToDate: (date) => {
    const { commits } = get();
    if (commits.length === 0) return;
    
    // Find the closest commit to the given date
    let closestIndex = 0;
    let closestDiff = Math.abs(commits[0].date.getTime() - date.getTime());
    
    for (let i = 1; i < commits.length; i++) {
      const diff = Math.abs(commits[i].date.getTime() - date.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    
    set({
      currentCommitIndex: closestIndex,
      currentDate: commits[closestIndex].date,
    });
  },
  
  advanceFrame: () => {
    const { commits, currentCommitIndex, isPlaying } = get();
    if (!isPlaying || commits.length === 0) return;
    
    const nextIndex = currentCommitIndex + 1;
    if (nextIndex >= commits.length) {
      // Reached the end, stop playing
      set({ isPlaying: false });
      return;
    }
    
    set({
      currentCommitIndex: nextIndex,
      currentDate: commits[nextIndex].date,
    });
  },
  
  reset: () =>
    set({
      commits: [],
      currentCommitIndex: 0,
      isPlaying: false,
      playbackSpeed: 1,
      startDate: null,
      endDate: null,
      currentDate: null,
    }),
}));
