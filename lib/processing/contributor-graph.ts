import type { GitHubContributor } from "@/types/github";
import type {
  ContributorNode,
  ContributorLink,
} from "@/types/visualization";
import type { FileChangeHistory } from "./commit-parser";

export function buildContributorNodes(
  contributors: GitHubContributor[],
  changeHistory: Map<string, FileChangeHistory>
): ContributorNode[] {
  // Build a map of author -> files they've touched
  const authorFiles = new Map<string, Set<string>>();

  for (const [path, history] of changeHistory) {
    for (const change of history.changes) {
      const existing = authorFiles.get(change.author);
      if (existing) {
        existing.add(path);
      } else {
        authorFiles.set(change.author, new Set([path]));
      }
    }
  }

  return contributors.map((contributor) => {
    const files = authorFiles.get(contributor.login) || new Set();

    return {
      id: contributor.login,
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions,
      filesAuthored: Array.from(files),
    };
  });
}

export function buildContributorLinks(
  nodes: ContributorNode[]
): ContributorLink[] {
  const links: ContributorLink[] = [];

  // Compare each pair of contributors
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Find shared files
      const filesA = new Set(nodeA.filesAuthored);
      const sharedFiles = nodeB.filesAuthored.filter((f) => filesA.has(f));

      if (sharedFiles.length > 0) {
        // Calculate weight based on shared files relative to total files
        const totalFiles = new Set([
          ...nodeA.filesAuthored,
          ...nodeB.filesAuthored,
        ]).size;
        const weight = sharedFiles.length / totalFiles;

        links.push({
          source: nodeA.id,
          target: nodeB.id,
          sharedFiles: sharedFiles.length,
          weight,
        });
      }
    }
  }

  // Sort by weight descending
  return links.sort((a, b) => b.weight - a.weight);
}

// Get collaboration strength between two contributors
export function getCollaborationStrength(
  nodeA: ContributorNode,
  nodeB: ContributorNode
): number {
  const filesA = new Set(nodeA.filesAuthored);
  const sharedCount = nodeB.filesAuthored.filter((f) => filesA.has(f)).length;
  const totalFiles = new Set([
    ...nodeA.filesAuthored,
    ...nodeB.filesAuthored,
  ]).size;

  return totalFiles > 0 ? sharedCount / totalFiles : 0;
}

// Get top collaborators for a specific contributor
export function getTopCollaborators(
  targetNode: ContributorNode,
  allNodes: ContributorNode[],
  limit: number = 5
): { node: ContributorNode; strength: number }[] {
  const collaborations = allNodes
    .filter((n) => n.id !== targetNode.id)
    .map((node) => ({
      node,
      strength: getCollaborationStrength(targetNode, node),
    }))
    .filter((c) => c.strength > 0)
    .sort((a, b) => b.strength - a.strength);

  return collaborations.slice(0, limit);
}

// Build contribution timeline (commits over time per contributor)
export interface ContributionTimeline {
  author: string;
  entries: { date: Date; count: number }[];
}

export function buildContributionTimelines(
  changeHistory: Map<string, FileChangeHistory>,
  bucketSize: "day" | "week" | "month" = "week"
): ContributionTimeline[] {
  const authorBuckets = new Map<string, Map<string, number>>();

  // Bucket changes by author and time
  for (const history of changeHistory.values()) {
    for (const change of history.changes) {
      const bucketKey = getBucketKey(change.date, bucketSize);

      let authorMap = authorBuckets.get(change.author);
      if (!authorMap) {
        authorMap = new Map();
        authorBuckets.set(change.author, authorMap);
      }

      const current = authorMap.get(bucketKey) || 0;
      authorMap.set(bucketKey, current + 1);
    }
  }

  // Convert to timeline format
  const timelines: ContributionTimeline[] = [];

  for (const [author, buckets] of authorBuckets) {
    const entries = Array.from(buckets.entries())
      .map(([key, count]) => ({
        date: parseBucketKey(key),
        count,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    timelines.push({ author, entries });
  }

  return timelines.sort(
    (a, b) =>
      b.entries.reduce((sum, e) => sum + e.count, 0) -
      a.entries.reduce((sum, e) => sum + e.count, 0)
  );
}

function getBucketKey(date: Date, bucketSize: "day" | "week" | "month"): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (bucketSize) {
    case "month":
      return `${year}-${month.toString().padStart(2, "0")}`;
    case "week":
      const weekStart = new Date(date);
      weekStart.setDate(day - date.getDay());
      return `${weekStart.getFullYear()}-${weekStart.getMonth().toString().padStart(2, "0")}-${weekStart.getDate().toString().padStart(2, "0")}`;
    case "day":
    default:
      return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }
}

function parseBucketKey(key: string): Date {
  const parts = key.split("-").map(Number);
  if (parts.length === 2) {
    return new Date(parts[0], parts[1], 1);
  }
  return new Date(parts[0], parts[1], parts[2]);
}
