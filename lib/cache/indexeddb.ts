import { get, set, del, keys } from "idb-keyval";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = {
  commits: 60 * 60 * 1000, // 1 hour
  tree: 60 * 60 * 1000, // 1 hour
  contributors: 24 * 60 * 60 * 1000, // 24 hours
  metadata: 24 * 60 * 60 * 1000, // 24 hours
  commitDetails: 7 * 24 * 60 * 60 * 1000, // 7 days (commit details don't change)
};

export type CacheType = keyof typeof DEFAULT_TTL;

function getCacheKey(
  owner: string,
  repo: string,
  type: CacheType,
  identifier?: string
): string {
  const base = `ctm:${owner}/${repo}:${type}`;
  return identifier ? `${base}:${identifier}` : base;
}

export async function getCached<T>(
  owner: string,
  repo: string,
  type: CacheType,
  identifier?: string
): Promise<T | null> {
  try {
    const key = getCacheKey(owner, repo, type, identifier);
    const entry = await get<CacheEntry<T>>(key);
    
    if (!entry) return null;
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired, delete and return null
      await del(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

export async function setCache<T>(
  owner: string,
  repo: string,
  type: CacheType,
  data: T,
  identifier?: string
): Promise<void> {
  try {
    const key = getCacheKey(owner, repo, type, identifier);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: DEFAULT_TTL[type],
    };
    await set(key, entry);
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

export async function invalidateCache(
  owner: string,
  repo: string,
  type?: CacheType
): Promise<void> {
  try {
    const allKeys = await keys();
    const prefix = type
      ? getCacheKey(owner, repo, type)
      : `ctm:${owner}/${repo}:`;
    
    const keysToDelete = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith(prefix)
    );
    
    await Promise.all(keysToDelete.map((key) => del(key)));
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await keys();
    const ctmKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith("ctm:")
    );
    await Promise.all(ctmKeys.map((key) => del(key)));
  } catch (error) {
    console.error("Cache clear error:", error);
  }
}

// Helper to get cache stats
export async function getCacheStats(): Promise<{
  totalEntries: number;
  repos: string[];
}> {
  try {
    const allKeys = await keys();
    const ctmKeys = allKeys.filter(
      (key) => typeof key === "string" && key.startsWith("ctm:")
    ) as string[];
    
    const repos = new Set<string>();
    ctmKeys.forEach((key) => {
      const match = key.match(/^ctm:([^:]+):/) ;
      if (match) repos.add(match[1]);
    });
    
    return {
      totalEntries: ctmKeys.length,
      repos: Array.from(repos),
    };
  } catch (error) {
    console.error("Cache stats error:", error);
    return { totalEntries: 0, repos: [] };
  }
}
