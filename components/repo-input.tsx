"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GitBranch, ArrowRight, Loader2 } from "lucide-react";

export function RepoInput() {
  const router = useRouter();
  const [input, setInput] = React.useState("");
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parseRepoInput = (value: string): { owner: string; repo: string } | null => {
    const trimmed = value.trim();
    
    // Handle full GitHub URLs
    const urlMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s#?]+)/i
    );
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
    }
    
    // Handle owner/repo format
    const slashMatch = trimmed.match(/^([^\/\s]+)\/([^\/\s]+)$/);
    if (slashMatch) {
      return { owner: slashMatch[1], repo: slashMatch[2].replace(/\.git$/, "") };
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const parsed = parseRepoInput(input);
    if (!parsed) {
      setError("Please enter a valid repository (e.g., owner/repo or GitHub URL)");
      return;
    }
    
    setIsNavigating(true);
    router.push(`/visualize/${parsed.owner}/${parsed.repo}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (error) setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <GitBranch className="h-4 w-4 text-[var(--muted-foreground)]" />
        Repository
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="owner/repo or GitHub URL"
          value={input}
          onChange={handleInputChange}
          className="flex-1"
          disabled={isNavigating}
        />
        <Button type="submit" disabled={!input.trim() || isNavigating}>
          {isNavigating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Visualize
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-xs text-[var(--muted-foreground)]">Try:</span>
        {["facebook/react", "vercel/next.js", "microsoft/vscode"].map((repo) => (
          <button
            key={repo}
            type="button"
            onClick={() => setInput(repo)}
            className="text-xs px-2 py-1 rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/80 transition-colors"
          >
            {repo}
          </button>
        ))}
      </div>
    </form>
  );
}
