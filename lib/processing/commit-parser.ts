import type { GitHubCommit, GitHubFile } from "@/types/github";
import type {
  CommitTimelineEntry,
  FileNode,
  TimelineBucket,
} from "@/types/visualization";

export function parseCommitsToTimeline(
  commits: GitHubCommit[]
): CommitTimelineEntry[] {
  return commits.map((commit) => ({
    sha: commit.sha,
    date: new Date(commit.author.date),
    message: commit.message.split("\n")[0], // First line only
    author: commit.author.login || commit.author.name,
    filesChanged: commit.files?.length || 0,
    additions: commit.stats?.additions || 0,
    deletions: commit.stats?.deletions || 0,
  }));
}

export function bucketCommitsByTime(
  commits: CommitTimelineEntry[],
  bucketSize: "day" | "week" | "month" = "day"
): TimelineBucket[] {
  if (commits.length === 0) return [];

  const buckets = new Map<string, TimelineBucket>();

  for (const commit of commits) {
    const key = getBucketKey(commit.date, bucketSize);
    const existing = buckets.get(key);

    if (existing) {
      existing.count++;
      existing.commits.push(commit);
    } else {
      buckets.set(key, {
        date: getBucketDate(commit.date, bucketSize),
        count: 1,
        commits: [commit],
      });
    }
  }

  // Fill in missing buckets with zero counts
  const sortedBuckets = Array.from(buckets.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  if (sortedBuckets.length < 2) return sortedBuckets;

  const filled: TimelineBucket[] = [];
  const startDate = sortedBuckets[0].date;
  const endDate = sortedBuckets[sortedBuckets.length - 1].date;

  let currentDate = new Date(startDate);
  let bucketIndex = 0;

  while (currentDate <= endDate) {
    const key = getBucketKey(currentDate, bucketSize);
    const existingBucket = buckets.get(key);

    if (existingBucket) {
      filled.push(existingBucket);
      bucketIndex++;
    } else {
      filled.push({
        date: new Date(currentDate),
        count: 0,
        commits: [],
      });
    }

    currentDate = advanceDate(currentDate, bucketSize);
  }

  return filled;
}

function getBucketKey(date: Date, bucketSize: "day" | "week" | "month"): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (bucketSize) {
    case "month":
      return `${year}-${month}`;
    case "week":
      const weekStart = new Date(date);
      weekStart.setDate(day - date.getDay());
      return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
    case "day":
    default:
      return `${year}-${month}-${day}`;
  }
}

function getBucketDate(date: Date, bucketSize: "day" | "week" | "month"): Date {
  const result = new Date(date);

  switch (bucketSize) {
    case "month":
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      break;
    case "week":
      result.setDate(result.getDate() - result.getDay());
      result.setHours(0, 0, 0, 0);
      break;
    case "day":
    default:
      result.setHours(0, 0, 0, 0);
      break;
  }

  return result;
}

function advanceDate(date: Date, bucketSize: "day" | "week" | "month"): Date {
  const result = new Date(date);

  switch (bucketSize) {
    case "month":
      result.setMonth(result.getMonth() + 1);
      break;
    case "week":
      result.setDate(result.getDate() + 7);
      break;
    case "day":
    default:
      result.setDate(result.getDate() + 1);
      break;
  }

  return result;
}

// Build file change history from commits with file details
export interface FileChangeHistory {
  path: string;
  changes: {
    sha: string;
    date: Date;
    author: string;
    status: GitHubFile["status"];
    additions: number;
    deletions: number;
  }[];
}

export function buildFileChangeHistory(
  commits: GitHubCommit[]
): Map<string, FileChangeHistory> {
  const history = new Map<string, FileChangeHistory>();

  // Process commits oldest to newest
  const sorted = [...commits].sort(
    (a, b) =>
      new Date(a.author.date).getTime() - new Date(b.author.date).getTime()
  );

  for (const commit of sorted) {
    if (!commit.files) continue;

    for (const file of commit.files) {
      const path = file.filename;
      const entry = history.get(path);

      const change = {
        sha: commit.sha,
        date: new Date(commit.author.date),
        author: commit.author.login || commit.author.name,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
      };

      if (entry) {
        entry.changes.push(change);
      } else {
        history.set(path, {
          path,
          changes: [change],
        });
      }

      // Handle renames
      if (file.status === "renamed" && file.previous_filename) {
        const oldEntry = history.get(file.previous_filename);
        if (oldEntry) {
          // Mark the old path as having its final change be a rename
          oldEntry.changes.push({
            sha: commit.sha,
            date: new Date(commit.author.date),
            author: commit.author.login || commit.author.name,
            status: "removed",
            additions: 0,
            deletions: 0,
          });
        }
      }
    }
  }

  return history;
}

// Create FileNode objects from tree and change history
export function createFileNodes(
  treePaths: string[],
  changeHistory: Map<string, FileChangeHistory>
): FileNode[] {
  return treePaths
    .filter((path) => !path.endsWith("/")) // Filter out directories
    .map((path) => {
      const parts = path.split("/");
      const name = parts[parts.length - 1];
      const directory = parts.slice(0, -1).join("/") || "/";
      const extension = name.includes(".") ? name.split(".").pop() || "" : "";

      const history = changeHistory.get(path);
      const changeCount = history?.changes.length || 0;
      const lastChange = history?.changes[history.changes.length - 1];

      return {
        id: path,
        path,
        name,
        extension,
        size: 100, // Default size, can be updated with actual file size
        directory,
        hotspotScore: 0, // Will be calculated by complexity scorer
        changeCount,
        lastModified: lastChange?.date.toISOString() || new Date().toISOString(),
        lastAuthor: lastChange?.author || "Unknown",
      };
    });
}

// Get files that exist at a specific commit
export function getFilesAtCommit(
  allFiles: FileNode[],
  changeHistory: Map<string, FileChangeHistory>,
  targetDate: Date
): FileNode[] {
  return allFiles.filter((file) => {
    const history = changeHistory.get(file.path);
    if (!history) return false;

    // Find changes up to the target date
    const relevantChanges = history.changes.filter(
      (c) => c.date.getTime() <= targetDate.getTime()
    );

    if (relevantChanges.length === 0) return false;

    // Check if the last relevant change was a deletion
    const lastChange = relevantChanges[relevantChanges.length - 1];
    return lastChange.status !== "removed";
  });
}
