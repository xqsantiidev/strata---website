import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";

export interface FileNode extends SimulationNodeDatum {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  directory: string;
  // Visualization properties
  hotspotScore: number;
  changeCount: number;
  lastModified: string;
  lastAuthor: string;
  // State
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface FileLink extends SimulationLinkDatum<FileNode> {
  source: string | FileNode;
  target: string | FileNode;
  weight: number;
  type: "directory" | "cochange" | "import";
}

export interface ContributorNode extends SimulationNodeDatum {
  id: string;
  login: string;
  avatar_url: string;
  contributions: number;
  filesAuthored: string[];
}

export interface ContributorLink extends SimulationLinkDatum<ContributorNode> {
  source: string | ContributorNode;
  target: string | ContributorNode;
  sharedFiles: number;
  weight: number;
}

export interface HotspotData {
  fileId: string;
  path: string;
  score: number;
  changeCount: number;
  churnRate: number;
  contributorCount: number;
}

export interface CommitTimelineEntry {
  sha: string;
  date: Date;
  message: string;
  author: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface TimelineBucket {
  date: Date;
  count: number;
  commits: CommitTimelineEntry[];
}

export interface ProcessedRepoData {
  commits: CommitTimelineEntry[];
  fileNodes: Map<string, FileNode>;
  fileLinks: FileLink[];
  hotspots: HotspotData[];
  contributors: ContributorNode[];
  contributorLinks: ContributorLink[];
  timelineBuckets: TimelineBucket[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

export type PlaybackSpeed = 1 | 2 | 4 | 8;

export interface CanvasTransform {
  x: number;
  y: number;
  k: number; // zoom scale
}
