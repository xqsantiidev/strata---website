# Codebase Time Machine

> Watch any GitHub repository evolve as a living, animated force graph — files are born, grow, burn red with churn, and die, all set to the rhythm of real commit history.

![Codebase Time Machine](https://img.shields.io/badge/status-in%20development-7c5cbf?style=for-the-badge&labelColor=0a0a0f)
![Next.js](https://img.shields.io/badge/Next.js-0a0a0f?style=for-the-badge&logo=nextdotjs&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-e85d4a?style=for-the-badge&logo=d3dotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-0d0d1a?style=for-the-badge&logo=typescript&logoColor=7c5cbf)
![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-0a0a0f?style=for-the-badge&logo=vercel&logoColor=white)

---

## What is this?

Codebase Time Machine takes any public GitHub repository and replays its entire commit history as an interactive, animated visualization. Every file is a node. Every commit is a heartbeat. High-churn files glow red. Contributors orbit the files they love most.

It's part developer tool, part data art — and it makes a great conversation starter in any technical interview.

---

## Features

- **Animated force graph** — D3-powered physics simulation where file nodes attract, repel, and cluster based on co-change patterns
- **Time scrubber** — play, pause, and scrub through the entire commit history at 0.5×, 1×, 2×, or 5× speed
- **Hotspot detection** — files with high churn scores pulse with a red glow, surfacing technical debt at a glance
- **Contributor orbits** — contributor avatars orbit their most-edited files as the history plays back
- **God mode heatmap** — toggle between force graph and treemap view with a morphing transition
- **Contributor DNA view** — click any contributor to highlight only the files they touched
- **Commit soundtrack** — optional Web Audio API sound layer: small commits ping, large ones thud, deletions descend
- **Complexity debt clock** — a live counter tracking cumulative churn as you scrub through time
- **Shareable replay links** — encode any repo + time range into the URL and share it
- **Blame storm mode** — draws edges between contributors who edited the same file within 48 hours of each other

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Visualization | D3.js (force simulation, zoom, treemap) |
| Animations | Framer Motion |
| Styling | Tailwind CSS |
| Fonts | Space Grotesk + JetBrains Mono |
| Data source | GitHub REST API + GraphQL API |
| Client cache | IndexedDB |
| Auth | GitHub OAuth |
| Deployment | Vercel |

---

## Getting started

### Prerequisites

- Node.js 18+
- A GitHub personal access token (for 5,000 req/hr instead of 60)

### Installation

```bash
git clone https://github.com/xqsantiidev/codebase-time-machine
cd codebase-time-machine
npm install
```

### Environment variables

Create a `.env.local` file in the root:

```env
GITHUB_TOKEN=your_personal_access_token
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
NEXTAUTH_SECRET=any_random_string
NEXTAUTH_URL=http://localhost:3000
```

To get a GitHub token: go to **Settings → Developer settings → Personal access tokens** and create one with `repo:read` and `user:read` scopes.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste in any public GitHub repo URL.

---

## Deployment

This project is deployed on Vercel. To deploy your own:

1. Push this repo to GitHub
2. Import it at [vercel.com/new](https://vercel.com/new)
3. Add the environment variables from `.env.local` to the Vercel project settings
4. Deploy — Vercel handles the rest

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xqsantiidev/codebase-time-machine)

---

## How it works

### Data pipeline

1. The GitHub REST API is paginated to fetch every commit SHA, author, timestamp, and file diff for the target repo
2. Each file accumulates a **churn score** — the total lines changed across all commits it appears in
3. Co-change pairs are computed: files that appear in the same commits frequently get weighted edges between them
4. Contributors are mapped to the files they touched most, used to position orbiting avatars

### Visualization

- `d3-force` runs a physics simulation with charge, link, and collision forces
- Node radius maps to file size; node color maps to churn score on a gray → amber → coral → red scale
- Each commit played back triggers node enter/update/exit transitions: new files spring in, modified files ripple, deleted files dissolve
- `d3-zoom` handles pan and zoom on the canvas with smooth interpolation

---

## Project structure

```
/
├── app/
│   ├── api/
│   │   ├── commits/        # GitHub REST proxy endpoints
│   │   └── contributors/   # GitHub GraphQL proxy endpoints
│   ├── page.tsx            # Main canvas page
│   └── layout.tsx
├── components/
│   ├── ForceGraph.tsx      # D3 simulation + canvas rendering
│   ├── Timeline.tsx        # Scrubber, playback controls
│   ├── Sidebar.tsx         # Contributor list
│   ├── FileDetail.tsx      # Right panel on node click
│   └── HeatmapView.tsx     # Treemap "god mode"
├── lib/
│   ├── github.ts           # API fetching + pagination
│   ├── metrics.ts          # Churn score, co-change graph
│   └── cache.ts            # IndexedDB wrapper
└── hooks/
    ├── useRepoData.ts
    └── usePlayback.ts
```

---

## Roadmap

- [ ] Support private repos via full OAuth flow
- [ ] Export replay as GIF or MP4
- [ ] Language breakdown ring chart per contributor
- [ ] Branch comparison mode — watch two branches diverge
- [ ] VS Code extension integration

---

## Built by

[xqsanti](https://github.com/xqsantiidev) — CS student building things worth showing off.

---

## License

MIT
