import type { FileNode, HotspotData } from "@/types/visualization";
import type { FileChangeHistory } from "./commit-parser";

interface ScoringWeights {
  changeFrequency: number;
  churnRate: number;
  contributorCount: number;
  recency: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  changeFrequency: 0.35,
  churnRate: 0.25,
  contributorCount: 0.2,
  recency: 0.2,
};

export function calculateHotspots(
  files: FileNode[],
  changeHistory: Map<string, FileChangeHistory>,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): HotspotData[] {
  if (files.length === 0) return [];

  // Calculate raw metrics for all files
  const metrics = files.map((file) => {
    const history = changeHistory.get(file.path);
    return {
      file,
      changeCount: history?.changes.length || 0,
      churnRate: calculateChurnRate(history),
      contributorCount: countUniqueContributors(history),
      recencyScore: calculateRecencyScore(history),
    };
  });

  // Find max values for normalization
  const maxChangeCount = Math.max(...metrics.map((m) => m.changeCount), 1);
  const maxChurnRate = Math.max(...metrics.map((m) => m.churnRate), 1);
  const maxContributors = Math.max(...metrics.map((m) => m.contributorCount), 1);

  // Calculate normalized scores
  const hotspots: HotspotData[] = metrics.map((m) => {
    const normalizedChange = m.changeCount / maxChangeCount;
    const normalizedChurn = m.churnRate / maxChurnRate;
    const normalizedContributors = m.contributorCount / maxContributors;

    const score =
      weights.changeFrequency * normalizedChange +
      weights.churnRate * normalizedChurn +
      weights.contributorCount * normalizedContributors +
      weights.recency * m.recencyScore;

    return {
      fileId: m.file.id,
      path: m.file.path,
      score: Math.min(1, Math.max(0, score)),
      changeCount: m.changeCount,
      churnRate: m.churnRate,
      contributorCount: m.contributorCount,
    };
  });

  // Sort by score descending
  return hotspots.sort((a, b) => b.score - a.score);
}

function calculateChurnRate(history: FileChangeHistory | undefined): number {
  if (!history || history.changes.length === 0) return 0;

  const totalChurn = history.changes.reduce(
    (sum, change) => sum + change.additions + change.deletions,
    0
  );

  return totalChurn / history.changes.length;
}

function countUniqueContributors(
  history: FileChangeHistory | undefined
): number {
  if (!history) return 0;
  const authors = new Set(history.changes.map((c) => c.author));
  return authors.size;
}

function calculateRecencyScore(history: FileChangeHistory | undefined): number {
  if (!history || history.changes.length === 0) return 0;

  const now = Date.now();
  const lastChange = history.changes[history.changes.length - 1];
  const ageInDays = (now - lastChange.date.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: recent changes score higher
  // Half-life of 30 days
  return Math.exp(-ageInDays / 30);
}

// Apply hotspot scores to file nodes
export function applyHotspotScores(
  files: FileNode[],
  hotspots: HotspotData[]
): FileNode[] {
  const scoreMap = new Map(hotspots.map((h) => [h.fileId, h.score]));

  return files.map((file) => ({
    ...file,
    hotspotScore: scoreMap.get(file.id) || 0,
  }));
}

// Get top N hotspots
export function getTopHotspots(
  hotspots: HotspotData[],
  n: number = 10
): HotspotData[] {
  return hotspots.slice(0, n);
}

// Calculate directory-level hotspots
export interface DirectoryHotspot {
  path: string;
  score: number;
  fileCount: number;
  totalChanges: number;
}

export function calculateDirectoryHotspots(
  hotspots: HotspotData[]
): DirectoryHotspot[] {
  const directoryMap = new Map<
    string,
    { scores: number[]; changes: number[] }
  >();

  for (const hotspot of hotspots) {
    const parts = hotspot.path.split("/");
    parts.pop(); // Remove filename
    const dirPath = parts.join("/") || "/";

    const existing = directoryMap.get(dirPath);
    if (existing) {
      existing.scores.push(hotspot.score);
      existing.changes.push(hotspot.changeCount);
    } else {
      directoryMap.set(dirPath, {
        scores: [hotspot.score],
        changes: [hotspot.changeCount],
      });
    }
  }

  const directoryHotspots: DirectoryHotspot[] = [];

  for (const [path, data] of directoryMap) {
    const avgScore =
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const totalChanges = data.changes.reduce((a, b) => a + b, 0);

    directoryHotspots.push({
      path,
      score: avgScore,
      fileCount: data.scores.length,
      totalChanges,
    });
  }

  return directoryHotspots.sort((a, b) => b.score - a.score);
}

// Get color for hotspot intensity
export function getHotspotColor(score: number): string {
  // Gradient from transparent to red based on score
  const alpha = Math.pow(score, 1.5); // Non-linear for better visual distinction
  return `rgba(239, 68, 68, ${alpha * 0.8})`; // Using --destructive color
}

// Get glow intensity for visualization
export function getGlowIntensity(score: number): number {
  // Map score to blur radius (0-20px)
  return score * 20;
}
