"use client";

import * as React from "react";
import * as d3 from "d3";
import type { FileNode, FileLink } from "@/types/visualization";
import { getHotspotColor } from "@/lib/processing/complexity-scorer";

interface ForceGraphProps {
  nodes: FileNode[];
  links: FileLink[];
  width: number;
  height: number;
  selectedNode?: FileNode | null;
  onNodeClick?: (node: FileNode) => void;
  onNodeHover?: (node: FileNode | null) => void;
  showHotspots?: boolean;
}

// File extension to color mapping
const EXTENSION_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#f7df1e",
  jsx: "#f7df1e",
  json: "#cbcb41",
  md: "#083fa1",
  css: "#264de4",
  scss: "#c76494",
  html: "#e34f26",
  py: "#3776ab",
  go: "#00add8",
  rs: "#dea584",
  rb: "#cc342d",
  java: "#b07219",
  default: "#6b7280",
};

function getNodeColor(node: FileNode): string {
  return EXTENSION_COLORS[node.extension] || EXTENSION_COLORS.default;
}

function getNodeRadius(node: FileNode): number {
  // Base size + change count bonus
  const baseSize = 4;
  const changeBonus = Math.min(node.changeCount * 0.5, 8);
  return baseSize + changeBonus;
}

export function ForceGraph({
  nodes,
  links,
  width,
  height,
  selectedNode,
  onNodeClick,
  onNodeHover,
  showHotspots = true,
}: ForceGraphProps) {
  const [simulatedNodes, setSimulatedNodes] = React.useState<FileNode[]>([]);
  const [simulatedLinks, setSimulatedLinks] = React.useState<FileLink[]>([]);
  const simulationRef = React.useRef<d3.Simulation<FileNode, FileLink> | null>(null);

  // Initialize and run force simulation
  React.useEffect(() => {
    if (nodes.length === 0) {
      setSimulatedNodes([]);
      setSimulatedLinks([]);
      return;
    }

    // Create copies of nodes and links for simulation
    const nodesCopy = nodes.map((n) => ({ ...n }));
    const linksCopy = links.map((l) => ({ ...l }));

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create force simulation
    const simulation = d3
      .forceSimulation<FileNode>(nodesCopy)
      .force(
        "link",
        d3
          .forceLink<FileNode, FileLink>(linksCopy)
          .id((d) => d.id)
          .distance(50)
          .strength(0.1)
      )
      .force("charge", d3.forceManyBody().strength(-30))
      .force("center", d3.forceCenter(0, 0))
      .force(
        "collision",
        d3.forceCollide<FileNode>().radius((d) => getNodeRadius(d) + 2)
      )
      .force("x", d3.forceX(0).strength(0.05))
      .force("y", d3.forceY(0).strength(0.05));

    simulationRef.current = simulation;

    // Update state on each tick
    simulation.on("tick", () => {
      setSimulatedNodes([...nodesCopy]);
      setSimulatedLinks([...linksCopy]);
    });

    // Run simulation
    simulation.alpha(1).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  // Handle node drag
  const handleDrag = React.useCallback(
    (event: React.MouseEvent, node: FileNode) => {
      if (!simulationRef.current) return;

      const simulation = simulationRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        node.fx = node.x! + (e.clientX - event.clientX) / 1;
        node.fy = node.y! + (e.clientY - event.clientY) / 1;
        simulation.alpha(0.3).restart();
      };

      const handleMouseUp = () => {
        node.fx = null;
        node.fy = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    []
  );

  return (
    <g className="force-graph">
      {/* Render links */}
      <g className="links">
        {simulatedLinks.map((link, i) => {
          const source = link.source as FileNode;
          const target = link.target as FileNode;
          if (!source.x || !target.x) return null;

          return (
            <line
              key={i}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--border)"
              strokeWidth={Math.max(0.5, link.weight * 2)}
              strokeOpacity={0.3}
            />
          );
        })}
      </g>

      {/* Render nodes */}
      <g className="nodes">
        {simulatedNodes.map((node) => {
          if (node.x === undefined || node.y === undefined) return null;

          const radius = getNodeRadius(node);
          const isSelected = selectedNode?.id === node.id;
          const hotspotColor = showHotspots ? getHotspotColor(node.hotspotScore) : "transparent";

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => onNodeClick?.(node)}
              onMouseEnter={() => onNodeHover?.(node)}
              onMouseLeave={() => onNodeHover?.(null)}
              onMouseDown={(e) => handleDrag(e, node)}
            >
              {/* Hotspot glow */}
              {showHotspots && node.hotspotScore > 0.2 && (
                <circle
                  r={radius + 8}
                  fill={hotspotColor}
                  className="animate-pulse"
                  style={{
                    filter: `blur(${node.hotspotScore * 8}px)`,
                  }}
                />
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle
                  r={radius + 4}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
              )}

              {/* Main node circle */}
              <circle
                r={radius}
                fill={getNodeColor(node)}
                stroke={isSelected ? "var(--primary)" : "var(--background)"}
                strokeWidth={1}
                className="transition-all duration-200"
              />

              {/* New file indicator */}
              {node.isNew && (
                <circle
                  r={radius + 2}
                  fill="none"
                  stroke="var(--fetch-color)"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  className="animate-spin"
                  style={{ animationDuration: "3s" }}
                />
              )}

              {/* Modified indicator */}
              {node.isModified && (
                <circle
                  cx={radius - 2}
                  cy={-radius + 2}
                  r={3}
                  fill="var(--render-color)"
                />
              )}
            </g>
          );
        })}
      </g>
    </g>
  );
}

// Node tooltip component
export function NodeTooltip({
  node,
  x,
  y,
}: {
  node: FileNode;
  x: number;
  y: number;
}) {
  return (
    <div
      className="absolute pointer-events-none z-50 px-3 py-2 rounded-lg bg-[var(--popover)] border border-[var(--border)] shadow-lg"
      style={{
        left: x + 15,
        top: y - 10,
        transform: "translateY(-50%)",
      }}
    >
      <p className="font-mono text-sm text-[var(--foreground)]">{node.path}</p>
      <div className="flex gap-4 mt-1 text-xs text-[var(--muted-foreground)]">
        <span>{node.changeCount} changes</span>
        <span>Last: {node.lastAuthor}</span>
        {node.hotspotScore > 0 && (
          <span className="text-[var(--destructive)]">
            Hotspot: {(node.hotspotScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
