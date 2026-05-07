"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { InteractiveCanvas } from "@/components/canvas/interactive-canvas";
import { ForceGraph, NodeTooltip } from "@/components/canvas/force-graph";
import { HeatmapOverlay } from "@/components/canvas/heatmap-overlay";
import { TimelinePlayer } from "@/components/timeline/timeline-player";
import { useRepoData } from "@/lib/hooks/use-repo-data";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { useRepoStore } from "@/lib/stores/repo-store";
import { getFilesAtCommit } from "@/lib/processing/commit-parser";
import { Button } from "@/components/ui/button";
import { TokenInput } from "@/components/controls/token-input";
import type { FileNode } from "@/types/visualization";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  GitBranch,
  Star,
  GitFork,
} from "lucide-react";

export default function VisualizePage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = React.useState<FileNode | null>(null);
  const [hoveredNode, setHoveredNode] = React.useState<FileNode | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [showHotspots, setShowHotspots] = React.useState(true);

  const { isLoading, loadingMessage, error, progress, fileNodes, fileLinks, hotspots, refetch } =
    useRepoData({ owner, repo });

  const { commits, currentDate } = useTimelineStore();
  const { repoMetadata } = useRepoStore();

  // Build change history for filtering
  const changeHistory = React.useMemo(() => {
    const history = new Map();
    // Simplified - in production you'd store this during loading
    return history;
  }, []);

  // Filter nodes based on current timeline position
  const visibleNodes = React.useMemo(() => {
    if (!currentDate || fileNodes.length === 0) return fileNodes;
    // For now, show all nodes - timeline filtering can be added later
    // return getFilesAtCommit(fileNodes, changeHistory, currentDate);
    return fileNodes;
  }, [fileNodes, currentDate]);

  // Handle resize
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Track mouse position for tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const isRateLimitError = error?.includes("rate limit");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--destructive)]/10">
            <AlertCircle className="w-8 h-8 text-[var(--destructive)]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Failed to Load Repository
            </h1>
            <p className="text-[var(--muted-foreground)]">{error}</p>
          </div>
          
          {isRateLimitError && (
            <div className="text-left p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <TokenInput />
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isRateLimitError ? "Retry with Token" : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto" />
          <p className="text-[var(--foreground)] font-medium">{loadingMessage}</p>
          <div className="w-64 h-2 bg-[var(--secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {owner}/{repo}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]" onMouseMove={handleMouseMove}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="font-medium text-[var(--foreground)]">
              {owner}/{repo}
            </span>
          </div>
          {repoMetadata && (
            <>
              <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                <Star className="w-3.5 h-3.5" />
                {repoMetadata.stargazers_count.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                <GitFork className="w-3.5 h-3.5" />
                {repoMetadata.forks_count.toLocaleString()}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHotspots(!showHotspots)}
          >
            {showHotspots ? (
              <EyeOff className="w-4 h-4 mr-2" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            Hotspots
          </Button>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main visualization area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <InteractiveCanvas>
          <ForceGraph
            nodes={visibleNodes}
            links={fileLinks}
            width={dimensions.width}
            height={dimensions.height}
            selectedNode={selectedNode}
            onNodeClick={setSelectedNode}
            onNodeHover={setHoveredNode}
            showHotspots={showHotspots}
          />
        </InteractiveCanvas>

        {/* Heatmap overlay */}
        <HeatmapOverlay hotspots={hotspots} visible={showHotspots} />

        {/* Node tooltip */}
        {hoveredNode && (
          <NodeTooltip
            node={hoveredNode}
            x={mousePosition.x}
            y={mousePosition.y}
          />
        )}

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-[var(--card)]/90 border border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span className="text-[var(--foreground)] font-medium">{visibleNodes.length}</span> files
          {" | "}
          <span className="text-[var(--foreground)] font-medium">{commits.length}</span> commits
        </div>
      </div>

      {/* Timeline player */}
      <TimelinePlayer />
    </div>
  );
}
