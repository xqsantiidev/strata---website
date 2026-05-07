import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenInput } from "@/components/controls/token-input";
import { RepoInput } from "@/components/repo-input";
import { GitBranch, Play, Layers, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
            <GitBranch className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] text-balance">
            Codebase Time Machine
          </h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-md mx-auto text-pretty">
            Visualize your repository&apos;s evolution through an interactive force graph with timeline playback
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-[var(--border)]">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Enter a GitHub repository to visualize its history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RepoInput />
            <div className="border-t border-[var(--border)] pt-6">
              <TokenInput />
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4">
          <FeatureCard
            icon={<Play className="w-5 h-5" />}
            title="Timeline Playback"
            description="Scrub through history"
            color="var(--fetch-color)"
          />
          <FeatureCard
            icon={<Layers className="w-5 h-5" />}
            title="Force Graph"
            description="Interactive file nodes"
            color="var(--transform-color)"
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Hotspot Detection"
            description="Find high-churn files"
            color="var(--render-color)"
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Data fetched from GitHub API. Large repositories may take longer to load.
        </p>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-lg bg-[var(--card)] border border-[var(--border)]">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <h3 className="font-medium text-sm text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{description}</p>
    </div>
  );
}
