"use client";

import * as React from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import type { CanvasTransform } from "@/types/visualization";

interface InteractiveCanvasProps {
  children: React.ReactNode;
  className?: string;
  onTransformChange?: (transform: CanvasTransform) => void;
  initialTransform?: CanvasTransform;
}

export function InteractiveCanvas({
  children,
  className,
  onTransformChange,
  initialTransform = { x: 0, y: 0, k: 1 },
}: InteractiveCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [transform, setTransform] = React.useState<CanvasTransform>(initialTransform);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  // Handle resize
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Setup D3 zoom
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        const newTransform: CanvasTransform = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        };
        setTransform(newTransform);
        onTransformChange?.(newTransform);
      });

    const selection = d3.select(svg);
    selection.call(zoom);

    // Set initial transform
    selection.call(
      zoom.transform,
      d3.zoomIdentity
        .translate(initialTransform.x || dimensions.width / 2, initialTransform.y || dimensions.height / 2)
        .scale(initialTransform.k)
    );

    return () => {
      selection.on(".zoom", null);
    };
  }, [dimensions, onTransformChange, initialTransform]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-[var(--background)]",
        className
      )}
    >
      {/* Grid background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.1 }}
      >
        <defs>
          <pattern
            id="grid"
            width={40 * transform.k}
            height={40 * transform.k}
            patternUnits="userSpaceOnUse"
            x={transform.x % (40 * transform.k)}
            y={transform.y % (40 * transform.k)}
          >
            <circle
              cx={1}
              cy={1}
              r={1}
              fill="var(--muted-foreground)"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "grab" }}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          {children}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <ZoomButton
          onClick={() => {
            const svg = svgRef.current;
            if (!svg) return;
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            d3.select(svg)
              .transition()
              .duration(300)
              .call(zoom.scaleBy, 1.5);
          }}
        >
          +
        </ZoomButton>
        <ZoomButton
          onClick={() => {
            const svg = svgRef.current;
            if (!svg) return;
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            d3.select(svg)
              .transition()
              .duration(300)
              .call(zoom.scaleBy, 0.67);
          }}
        >
          -
        </ZoomButton>
        <ZoomButton
          onClick={() => {
            const svg = svgRef.current;
            if (!svg) return;
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            d3.select(svg)
              .transition()
              .duration(300)
              .call(
                zoom.transform,
                d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2)
              );
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </ZoomButton>
      </div>

      {/* Transform info */}
      <div className="absolute top-4 right-4 px-2 py-1 rounded bg-[var(--card)]/80 text-xs font-mono text-[var(--muted-foreground)]">
        {(transform.k * 100).toFixed(0)}%
      </div>
    </div>
  );
}

function ZoomButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors text-sm font-medium"
    >
      {children}
    </button>
  );
}
