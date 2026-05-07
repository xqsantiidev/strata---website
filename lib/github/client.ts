import { Octokit } from "@octokit/rest";
import type { RateLimitInfo } from "@/types/github";

let octokitInstance: Octokit | null = null;
let currentToken: string | null = null;

export function getOctokit(token?: string | null): Octokit {
  // If token changed, create new instance
  if (token !== currentToken || !octokitInstance) {
    currentToken = token || null;
    octokitInstance = new Octokit({
      auth: token || undefined,
      userAgent: "codebase-time-machine/1.0",
      throttle: {
        onRateLimit: (retryAfter, options) => {
          console.warn(
            `Rate limit hit for ${options.method} ${options.url}. Retrying after ${retryAfter}s`
          );
          return true; // retry
        },
        onSecondaryRateLimit: (retryAfter, options) => {
          console.warn(
            `Secondary rate limit hit for ${options.method} ${options.url}`
          );
          return false; // don't retry
        },
      },
    });
  }
  return octokitInstance;
}

export async function getRateLimit(token?: string | null): Promise<RateLimitInfo> {
  const octokit = getOctokit(token);
  const { data } = await octokit.rateLimit.get();
  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: data.rate.reset,
    used: data.rate.used,
  };
}

export function parseRateLimitFromHeaders(headers: {
  "x-ratelimit-limit"?: string;
  "x-ratelimit-remaining"?: string;
  "x-ratelimit-reset"?: string;
  "x-ratelimit-used"?: string;
}): RateLimitInfo | null {
  const limit = headers["x-ratelimit-limit"];
  const remaining = headers["x-ratelimit-remaining"];
  const reset = headers["x-ratelimit-reset"];
  const used = headers["x-ratelimit-used"];
  
  if (!limit || !remaining || !reset) return null;
  
  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
    used: used ? parseInt(used, 10) : 0,
  };
}
