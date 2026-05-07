import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GitHubRepository, RateLimitInfo } from "@/types/github";
import type {
  FileNode,
  FileLink,
  HotspotData,
  ContributorNode,
  ContributorLink,
} from "@/types/visualization";

interface RepoState {
  // Auth
  githubToken: string | null;
  
  // Current repo
  owner: string | null;
  repo: string | null;
  repoMetadata: GitHubRepository | null;
  
  // Processed data
  fileNodes: FileNode[];
  fileLinks: FileLink[];
  hotspots: HotspotData[];
  contributors: ContributorNode[];
  contributorLinks: ContributorLink[];
  
  // Loading state
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  
  // Rate limiting
  rateLimit: RateLimitInfo | null;
  
  // Actions
  setGithubToken: (token: string | null) => void;
  setCurrentRepo: (owner: string, repo: string) => void;
  setRepoMetadata: (metadata: GitHubRepository) => void;
  setFileNodes: (nodes: FileNode[]) => void;
  setFileLinks: (links: FileLink[]) => void;
  setHotspots: (hotspots: HotspotData[]) => void;
  setContributors: (contributors: ContributorNode[]) => void;
  setContributorLinks: (links: ContributorLink[]) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setRateLimit: (rateLimit: RateLimitInfo) => void;
  reset: () => void;
}

const initialState = {
  githubToken: null,
  owner: null,
  repo: null,
  repoMetadata: null,
  fileNodes: [],
  fileLinks: [],
  hotspots: [],
  contributors: [],
  contributorLinks: [],
  isLoading: false,
  loadingMessage: "",
  error: null,
  rateLimit: null,
};

export const useRepoStore = create<RepoState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setGithubToken: (token) => set({ githubToken: token }),
      
      setCurrentRepo: (owner, repo) =>
        set({
          owner,
          repo,
          // Reset data when repo changes
          fileNodes: [],
          fileLinks: [],
          hotspots: [],
          contributors: [],
          contributorLinks: [],
          repoMetadata: null,
          error: null,
        }),
      
      setRepoMetadata: (metadata) => set({ repoMetadata: metadata }),
      
      setFileNodes: (nodes) => set({ fileNodes: nodes }),
      
      setFileLinks: (links) => set({ fileLinks: links }),
      
      setHotspots: (hotspots) => set({ hotspots: hotspots }),
      
      setContributors: (contributors) => set({ contributors: contributors }),
      
      setContributorLinks: (links) => set({ contributorLinks: links }),
      
      setLoading: (isLoading, message = "") =>
        set({ isLoading, loadingMessage: message }),
      
      setError: (error) => set({ error, isLoading: false }),
      
      setRateLimit: (rateLimit) => set({ rateLimit }),
      
      reset: () => set(initialState),
    }),
    {
      name: "codebase-time-machine-repo",
      partialize: (state) => ({
        githubToken: state.githubToken,
      }),
    }
  )
);
