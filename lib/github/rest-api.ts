import { getOctokit } from "./client";
import { getCached, setCache } from "../cache/indexeddb";
import type {
  GitHubCommit,
  GitHubTree,
  GitHubRepository,
  GitHubContributor,
} from "@/types/github";

const MAX_COMMITS_PER_PAGE = 100;
const MAX_PAGES = 10; // Limit to 1000 commits for performance

export async function getRepository(
  owner: string,
  repo: string,
  token?: string | null
): Promise<GitHubRepository> {
  // Check cache
  const cached = await getCached<GitHubRepository>(owner, repo, "metadata");
  if (cached) return cached;

  const octokit = getOctokit(token);
  const { data } = await octokit.repos.get({ owner, repo });

  const result: GitHubRepository = {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    description: data.description,
    stargazers_count: data.stargazers_count,
    forks_count: data.forks_count,
    watchers_count: data.watchers_count,
    language: data.language,
    default_branch: data.default_branch,
    created_at: data.created_at,
    updated_at: data.updated_at,
    pushed_at: data.pushed_at,
  };

  await setCache(owner, repo, "metadata", result);
  return result;
}

export async function getCommits(
  owner: string,
  repo: string,
  token?: string | null,
  onProgress?: (loaded: number, total: number | null) => void
): Promise<GitHubCommit[]> {
  // Check cache for all commits
  const cached = await getCached<GitHubCommit[]>(owner, repo, "commits");
  if (cached) {
    onProgress?.(cached.length, cached.length);
    return cached;
  }

  const octokit = getOctokit(token);
  const allCommits: GitHubCommit[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: MAX_COMMITS_PER_PAGE,
      page,
    });

    if (data.length === 0) {
      hasMore = false;
    } else {
      const commits: GitHubCommit[] = data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || "Unknown",
          email: commit.commit.author?.email || "",
          date: commit.commit.author?.date || new Date().toISOString(),
          login: commit.author?.login,
          avatar_url: commit.author?.avatar_url,
        },
        committer: {
          name: commit.commit.committer?.name || "Unknown",
          email: commit.commit.committer?.email || "",
          date: commit.commit.committer?.date || new Date().toISOString(),
        },
        parents: commit.parents.map((p) => ({ sha: p.sha })),
      }));

      allCommits.push(...commits);
      onProgress?.(allCommits.length, null);

      if (data.length < MAX_COMMITS_PER_PAGE) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  // Cache the commits
  if (allCommits.length > 0) {
    await setCache(owner, repo, "commits", allCommits);
  }

  return allCommits;
}

export async function getCommitDetails(
  owner: string,
  repo: string,
  sha: string,
  token?: string | null
): Promise<GitHubCommit> {
  // Check cache
  const cached = await getCached<GitHubCommit>(
    owner,
    repo,
    "commitDetails",
    sha
  );
  if (cached) return cached;

  const octokit = getOctokit(token);
  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });

  const result: GitHubCommit = {
    sha: data.sha,
    message: data.commit.message,
    author: {
      name: data.commit.author?.name || "Unknown",
      email: data.commit.author?.email || "",
      date: data.commit.author?.date || new Date().toISOString(),
      login: data.author?.login,
      avatar_url: data.author?.avatar_url,
    },
    committer: {
      name: data.commit.committer?.name || "Unknown",
      email: data.commit.committer?.email || "",
      date: data.commit.committer?.date || new Date().toISOString(),
    },
    parents: data.parents.map((p) => ({ sha: p.sha })),
    stats: data.stats
      ? {
          additions: data.stats.additions,
          deletions: data.stats.deletions,
          total: data.stats.total,
        }
      : undefined,
    files: data.files?.map((f) => ({
      sha: f.sha || "",
      filename: f.filename || "",
      status: f.status as "added" | "removed" | "modified" | "renamed" | "copied",
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      changes: f.changes || 0,
      patch: f.patch,
      previous_filename: f.previous_filename,
    })),
  };

  await setCache(owner, repo, "commitDetails", result, sha);
  return result;
}

export async function getTree(
  owner: string,
  repo: string,
  sha: string,
  token?: string | null
): Promise<GitHubTree> {
  // Check cache
  const cached = await getCached<GitHubTree>(owner, repo, "tree", sha);
  if (cached) return cached;

  const octokit = getOctokit(token);
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "true",
  });

  const result: GitHubTree = {
    sha: data.sha,
    tree: data.tree
      .filter((item) => item.path && item.type)
      .map((item) => ({
        path: item.path!,
        mode: item.mode || "",
        type: item.type as "blob" | "tree",
        sha: item.sha || "",
        size: item.size,
      })),
    truncated: data.truncated || false,
  };

  await setCache(owner, repo, "tree", result, sha);
  return result;
}

export async function getContributors(
  owner: string,
  repo: string,
  token?: string | null
): Promise<GitHubContributor[]> {
  // Check cache
  const cached = await getCached<GitHubContributor[]>(
    owner,
    repo,
    "contributors"
  );
  if (cached) return cached;

  const octokit = getOctokit(token);
  const allContributors: GitHubContributor[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) {
    // Limit to 500 contributors
    const { data } = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 100,
      page,
    });

    if (data.length === 0) {
      hasMore = false;
    } else {
      const contributors: GitHubContributor[] = data.map((c) => ({
        login: c.login || "unknown",
        avatar_url: c.avatar_url || "",
        contributions: c.contributions || 0,
        html_url: c.html_url || "",
      }));

      allContributors.push(...contributors);

      if (data.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  if (allContributors.length > 0) {
    await setCache(owner, repo, "contributors", allContributors);
  }

  return allContributors;
}

// Batch fetch commit details with rate limiting
export async function getCommitDetailsBatch(
  owner: string,
  repo: string,
  shas: string[],
  token?: string | null,
  onProgress?: (loaded: number, total: number) => void,
  concurrency: number = 5
): Promise<GitHubCommit[]> {
  const results: GitHubCommit[] = [];
  const total = shas.length;

  // Process in batches with concurrency limit
  for (let i = 0; i < shas.length; i += concurrency) {
    const batch = shas.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((sha) => getCommitDetails(owner, repo, sha, token))
    );
    results.push(...batchResults);
    onProgress?.(results.length, total);
  }

  return results;
}
