"use client";

import * as React from "react";
import { useRepoStore } from "@/lib/stores/repo-store";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import {
  getRepository,
  getCommits,
  getCommitDetailsBatch,
  getTree,
  getContributors,
} from "@/lib/github/rest-api";
import {
  parseCommitsToTimeline,
  buildFileChangeHistory,
  createFileNodes,
} from "@/lib/processing/commit-parser";
import {
  calculateHotspots,
  applyHotspotScores,
} from "@/lib/processing/complexity-scorer";
import {
  buildContributorNodes,
  buildContributorLinks,
} from "@/lib/processing/contributor-graph";
import type { GitHubCommit } from "@/types/github";
import type { FileNode, FileLink, HotspotData } from "@/types/visualization";

interface UseRepoDataOptions {
  owner: string;
  repo: string;
}

interface UseRepoDataResult {
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  progress: number;
  fileNodes: FileNode[];
  fileLinks: FileLink[];
  hotspots: HotspotData[];
  refetch: () => void;
}

export function useRepoData({
  owner,
  repo,
}: UseRepoDataOptions): UseRepoDataResult {
  const {
    githubToken,
    setCurrentRepo,
    setRepoMetadata,
    setFileNodes,
    setFileLinks,
    setHotspots,
    setContributors,
    setContributorLinks,
    setLoading,
    setError,
    isLoading,
    loadingMessage,
    error,
    fileNodes,
    fileLinks,
    hotspots,
  } = useRepoStore();

  const { setCommits } = useTimelineStore();

  const [progress, setProgress] = React.useState(0);
  const [loadKey, setLoadKey] = React.useState(0);

  const loadData = React.useCallback(async () => {
    setCurrentRepo(owner, repo);
    setLoading(true, "Fetching repository info...");
    setProgress(0);
    setError(null);

    try {
      // 1. Get repository metadata
      const repoData = await getRepository(owner, repo, githubToken);
      setRepoMetadata(repoData);
      setProgress(10);

      // 2. Get basic commits list
      setLoading(true, "Fetching commits...");
      const basicCommits = await getCommits(owner, repo, githubToken, (loaded) => {
        setLoading(true, `Fetching commits... (${loaded})`);
      });
      setProgress(30);

      if (basicCommits.length === 0) {
        setError("No commits found in this repository");
        setLoading(false);
        return;
      }

      // 3. Get detailed commit info (with file changes) - limit to most recent commits
      setLoading(true, "Fetching commit details...");
      const commitsToFetch = basicCommits.slice(0, 200); // Limit for performance
      const detailedCommits = await getCommitDetailsBatch(
        owner,
        repo,
        commitsToFetch.map((c) => c.sha),
        githubToken,
        (loaded, total) => {
          setLoading(true, `Fetching commit details... (${loaded}/${total})`);
          setProgress(30 + (loaded / total) * 30);
        },
        3 // concurrency
      );
      setProgress(60);

      // 4. Get latest tree
      setLoading(true, "Fetching file tree...");
      const latestSha = basicCommits[0].sha;
      const tree = await getTree(owner, repo, latestSha, githubToken);
      setProgress(70);

      // 5. Get contributors
      setLoading(true, "Fetching contributors...");
      const contributors = await getContributors(owner, repo, githubToken);
      setProgress(80);

      // 6. Process data
      setLoading(true, "Processing commit history...");

      // Parse commits to timeline entries
      const timelineEntries = parseCommitsToTimeline(detailedCommits);
      setCommits(timelineEntries);

      // Build file change history
      const changeHistory = buildFileChangeHistory(detailedCommits);

      // Get file paths from tree
      const filePaths = tree.tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path);

      // Create file nodes
      let nodes = createFileNodes(filePaths, changeHistory);
      setProgress(85);

      // 7. Calculate hotspots
      setLoading(true, "Calculating hotspots...");
      const hotspotData = calculateHotspots(nodes, changeHistory);
      nodes = applyHotspotScores(nodes, hotspotData);
      setProgress(90);

      // 8. Build contributor graph
      setLoading(true, "Building contributor graph...");
      const contributorNodes = buildContributorNodes(contributors, changeHistory);
      const contributorLinks = buildContributorLinks(contributorNodes);
      setProgress(95);

      // 9. Build file links (based on directory structure)
      const links = buildDirectoryLinks(nodes);

      // 10. Update store
      setFileNodes(nodes);
      setFileLinks(links);
      setHotspots(hotspotData);
      setContributors(contributorNodes);
      setContributorLinks(contributorLinks);

      setProgress(100);
      setLoading(false);
    } catch (err) {
      console.error("Error loading repository data:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load repository data";
      
      // Check for rate limit
      if (message.includes("rate limit") || message.includes("403")) {
        setError(
          "GitHub API rate limit exceeded. Please add a personal access token to increase your limit."
        );
      } else if (message.includes("404") || message.includes("Not Found")) {
        setError(
          "Repository not found. Please check the owner and repository name."
        );
      } else {
        setError(message);
      }
      setLoading(false);
    }
  }, [
    owner,
    repo,
    githubToken,
    setCurrentRepo,
    setRepoMetadata,
    setFileNodes,
    setFileLinks,
    setHotspots,
    setContributors,
    setContributorLinks,
    setLoading,
    setError,
    setCommits,
  ]);

  // Load data on mount and when loadKey changes
  React.useEffect(() => {
    loadData();
  }, [loadData, loadKey]);

  const refetch = React.useCallback(() => {
    setLoadKey((k) => k + 1);
  }, []);

  return {
    isLoading,
    loadingMessage,
    error,
    progress,
    fileNodes,
    fileLinks,
    hotspots,
    refetch,
  };
}

// Build links between files in the same directory
function buildDirectoryLinks(nodes: FileNode[]): FileLink[] {
  const links: FileLink[] = [];
  const directoryMap = new Map<string, FileNode[]>();

  // Group files by directory
  for (const node of nodes) {
    const existing = directoryMap.get(node.directory);
    if (existing) {
      existing.push(node);
    } else {
      directoryMap.set(node.directory, [node]);
    }
  }

  // Create links within each directory (but limit connections)
  for (const files of directoryMap.values()) {
    if (files.length < 2) continue;

    // Sort by change count (most active files first)
    const sorted = [...files].sort((a, b) => b.changeCount - a.changeCount);
    
    // Link top files to create a spanning structure
    for (let i = 0; i < Math.min(sorted.length - 1, 5); i++) {
      links.push({
        source: sorted[i].id,
        target: sorted[i + 1].id,
        weight: 0.5,
        type: "directory",
      });
    }
  }

  return links;
}
