# NAVIZ — Pathfinding Visualizer

A 2D pathfinding visualizer built with Vite, React, TypeScript, Tailwind CSS, and Zustand.

![NAVIZ Screenshot](https://github.com/user-attachments/assets/02d4d28b-5a61-4fb6-a558-2260c319376e)

## Features

- **Four algorithms**: A\*, Dijkstra, BFS, DFS
- **Weighted terrain**: Plains (×1), Forest (×3), Swamp (×5), Mountain (×10) — Dijkstra and A\* route around expensive terrain
- **Rectangle obstacle drawing**: Click and drag to draw walls or paint terrain
- **Timeline scrubber**: Pre-compute the full exploration history, then scrub with a slider for instant replay
- **Configurable heuristics**: Manhattan or Euclidean for A\*
- **8-directional movement** (toggleable)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Usage

1. Click **Start** mode and click a cell to place the start point
2. Click **End** mode and click a cell to place the end point
3. Click **Wall** mode and drag to draw obstacles
4. Optionally, click **Terrain** mode to paint weighted terrain
5. Select an algorithm (A\*, Dijkstra, BFS, DFS) and click **▶ Run**
6. Drag the timeline slider to scrub through the exploration history

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
