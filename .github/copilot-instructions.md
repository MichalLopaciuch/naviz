# NAVIZ — Copilot Coding Agent Instructions

## Repository Summary

NAVIZ is a 2D pathfinding visualizer built with **Vite + React 19 + TypeScript + Tailwind CSS + Zustand**. It runs entirely in the browser with no backend. Users place start/end points, draw walls and weighted terrain on a grid, select an algorithm, and scrub through an animated replay of the exploration history.

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 8 |
| UI framework | React 19 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3 + `clsx` / `tailwind-merge` |
| State management | Zustand 5 |
| Component primitives | Radix UI (Select, Slider, Tabs, ToggleGroup) |
| Icons | `lucide-react` |
| Linter | ESLint 9 (flat config, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) |

No testing framework is currently configured in this repository.

## Project Layout

```
naviz/
├── .github/
│   └── copilot-instructions.md   # this file
├── public/                        # static assets served by Vite
├── src/
│   ├── algorithms/                # pure pathfinding implementations
│   │   ├── index.ts               # algorithm registry (maps AlgorithmType → AlgorithmFn)
│   │   ├── astar.ts
│   │   ├── bfs.ts
│   │   ├── dfs.ts
│   │   ├── dijkstra.ts
│   │   └── utils.ts               # shared helpers (getNeighbors, reconstructPath, heuristics)
│   ├── components/
│   │   ├── ControlPanel.tsx       # top toolbar (mode buttons, algorithm picker, Run button, settings)
│   │   ├── GridCanvas.tsx         # main canvas — renders the grid, handles mouse interaction
│   │   ├── StatsPanel.tsx         # right sidebar — shows cells explored, path length, time
│   │   ├── TerrainLegend.tsx      # right sidebar — terrain colour key
│   │   └── Timeline.tsx           # bottom slider — scrubs through the exploration replay
│   ├── store/
│   │   ├── gridStore.ts           # Zustand store: grid cells, start/end, interaction mode, terrain
│   │   └── algorithmStore.ts      # Zustand store: selected algorithm, result, replay step
│   ├── utils/
│   │   ├── bresenham.ts           # line/rectangle rasterisation for drag-to-draw
│   │   └── minHeap.ts             # generic min-heap used by A* and Dijkstra
│   ├── types.ts                   # shared TypeScript interfaces and type aliases
│   ├── constants.ts               # TERRAIN_COSTS, colour maps, grid defaults
│   ├── App.tsx                    # root component — composes ControlPanel, GridCanvas, panels, Timeline
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Tailwind base / global styles
├── eslint.config.js               # ESLint flat config
├── tsconfig.json                  # references tsconfig.app.json and tsconfig.node.json
├── tsconfig.app.json              # browser / src tsconfig
├── tsconfig.node.json             # vite.config.ts tsconfig
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── index.html
└── package.json
```

## Key Architectural Patterns

- **Adding a new algorithm**: implement `AlgorithmFn` (see `src/types.ts`) and register it in `src/algorithms/index.ts`. The rest of the UI picks it up automatically.
- **Grid state** lives in `useGridStore` (`src/store/gridStore.ts`). Cell mutations go through `setCellBatch` for performance — avoid mutating cells directly.
- **Algorithm result / replay state** lives in `useAlgorithmStore` (`src/store/algorithmStore.ts`).
- **Terrain weights** are defined in `src/constants.ts` (`TERRAIN_COSTS`). The `Cell.weight` field is always derived from terrain (or `Infinity` for walls).
- Components consume Zustand stores directly via hooks; no prop-drilling.

## Commands

Always run `npm install` before building or linting in a fresh environment.

| Purpose | Command |
|---|---|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` (serves at http://localhost:5173) |
| Production build | `npm run build` (runs `tsc -b` then `vite build`) |
| Type-check only | `npm run typecheck` |
| Lint | `npm run lint` |

**Build order**: `npm install` → `npm run typecheck` → `npm run lint` → `npm run build`.

There are **no automated tests** in this repository. Validate changes by running `npm run typecheck` and `npm run lint`, then confirming the dev server renders correctly with `npm run dev`.

## CI / Validation

There are currently no GitHub Actions workflows. The validation pipeline is:

1. `npm run typecheck` — must exit 0
2. `npm run lint` — must exit 0
3. `npm run build` — must exit 0

Always fix TypeScript errors and lint warnings before submitting a PR.

> **Known pre-existing warning**: `src/components/GridCanvas.tsx` has one `react-hooks/exhaustive-deps` warning for a `useEffect` that intentionally omits `cols` and `rows` from its dependency array. This warning existed before your changes and should not be introduced into other files.

## Coding Conventions

- All source files use TypeScript (`.ts` / `.tsx`). Do not add plain `.js` files under `src/`.
- Use Tailwind utility classes for all styling. Do not add external CSS files for component styles.
- Prefer named exports. `App.tsx` uses a default export by convention only.
- State updates use Zustand `set` — keep stores focused; do not store derived data that can be computed from existing state.
- Use `clsx` + `tailwind-merge` (via a `cn()` helper if present) for conditional class names.

## Keeping Docs Up to Date

At the end of every session, check whether your changes require updates to either of these files and update them if so:

- **`README.md`** — update if you added, removed, or renamed features, scripts, or usage steps visible to end users.
- **`.github/copilot-instructions.md`** — update if you changed the tech stack, project layout, architectural patterns, build commands, or coding conventions so that future sessions start with accurate context.

Also check:

- **Keyboard shortcuts** — if you added a new feature, consider whether it warrants a keyboard shortcut. If it does, implement the shortcut and add it to the in-app keyboard shortcut helper dialog so users can discover it.
