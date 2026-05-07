"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRepoStore } from "@/lib/stores/repo-store";
import { Eye, EyeOff, Key, Check } from "lucide-react";

export function TokenInput() {
  const { githubToken, setGithubToken } = useRepoStore();
  const [inputValue, setInputValue] = React.useState(githubToken || "");
  const [showToken, setShowToken] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    setGithubToken(trimmed || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <Key className="h-4 w-4 text-[var(--muted-foreground)]" />
        GitHub Personal Access Token
        <span className="text-xs text-[var(--muted-foreground)]">(optional, increases rate limit)</span>
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={showToken ? "text" : "password"}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pr-10 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <Button
          onClick={handleSave}
          variant={saved ? "default" : "secondary"}
          className="min-w-[80px]"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        Create a token at{" "}
        <a
          href="https://github.com/settings/tokens/new?scopes=repo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          github.com/settings/tokens
        </a>{" "}
        with <code className="px-1 py-0.5 bg-[var(--secondary)] rounded text-xs">repo</code> scope.
      </p>
    </div>
  );
}
