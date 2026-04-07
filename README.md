# NAVIZ — Pathfinding Visualizer

A 2D pathfinding visualizer built with Vite, React, TypeScript, Tailwind CSS, and Zustand.  
Algorithms are available in two execution engines — **TypeScript (JS)** and **Rust-compiled WebAssembly (WASM)** — so you can compare compute times on the same grid with one click.

![NAVIZ Screenshot](https://github.com/user-attachments/assets/44fd63dc-27c1-460f-9ed5-045016bdbddf)

## Features

- **Four algorithms**: A\*, Dijkstra, BFS, DFS
- **Two execution engines**: JavaScript (default) and WebAssembly (Rust) — toggle with the **WASM** button
- **Weighted terrain**: Plains (×1), Forest (×5), Mountain (×10) — Dijkstra and A\* route around expensive terrain
- **Draw modes**: Wall, Start/End (left-click = start, right-click = end), Erase, Terrain — all support click-and-drag
- **Grid lines toggle**: Show or hide the grid overlay with the **Grid** button
- **Timeline scrubber**: Pre-compute the full exploration history, then scrub with a slider (or `Ctrl + Scroll`) for instant replay
- **Configurable heuristics**: Manhattan or Euclidean for A\*
- **8-directional movement** (always enabled)
- **Keyboard shortcuts**: Full keyboard control — see the **?** button or the [Shortcuts](#keyboard-shortcuts) table below

---

## Architecture

```
src/
├── algorithms/
│   ├── astar.ts          # A* (TypeScript)
│   ├── bfs.ts            # BFS (TypeScript)
│   ├── dfs.ts            # DFS (TypeScript)
│   ├── dijkstra.ts       # Dijkstra (TypeScript)
│   ├── wasm.ts           # WASM adapter + lazy loader
│   └── index.ts          # Algorithm registry
├── components/
│   ├── ControlPanel.tsx  # Top bar: algorithm, heuristic, draw mode, WASM/Grid toggles, actions
│   ├── GridCanvas.tsx    # Canvas-based grid renderer + mouse interactions
│   ├── HelpModal.tsx     # Keyboard & mouse shortcut reference modal
│   ├── StatsPanel.tsx    # Sidebar: cells explored, path length, engine badge
│   ├── TerrainLegend.tsx # Sidebar: terrain colour key
│   └── Timeline.tsx      # Bottom scrubber
├── hooks/
│   └── useKeyboardShortcuts.ts  # Global keyboard + Ctrl+Scroll shortcut handling
├── store/
│   ├── algorithmStore.ts # Algorithm selection, run, animation, WASM state
│   └── gridStore.ts      # Grid cells, interaction mode, start/end
├── utils/
│   ├── bresenham.ts      # Line interpolation for smooth drag-painting
│   └── minHeap.ts        # Binary min-heap used by Dijkstra and A*
├── constants.ts          # Cell size, terrain weights/colours, COLORS
└── types.ts              # Shared TypeScript types

wasm-algorithms/
└── src/lib.rs            # Rust implementations (compiled to src/wasm-pkg/)

src/wasm-pkg/             # Committed compiled WASM + JS glue (wasm-bindgen output)
```

**Data flow:**

```
ControlPanel ──► algorithmStore.runAlgorithm(cells, start, end)
                        │
               useWasm? │
              ┌──────── ┤ ────────┐
              ▼                   ▼
  ALGORITHMS[key] (TS)   WASM_ALGORITHMS[key] (Rust)
              │                   │
              └──────── ┬ ────────┘
                        ▼
               AlgorithmResult
       { exploredOrder, frontierAtStep, path, stats }
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
      GridCanvas (renders)    StatsPanel (stats)
      Timeline (scrubs steps)
```

---

## Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Node.js | ≥ 18 | Dev server + build |
| npm | ≥ 9 | Package management |
| Rust + `rustup` | stable | Rebuilding WASM (optional) |
| `wasm-pack` | ≥ 0.12 | Rebuilding WASM (optional) |

> **Note:** The compiled WASM binary (`src/wasm-pkg/`) is committed to the repository.  
> You **do not** need Rust or wasm-pack to run or build the app — they are only needed if you modify the Rust source (`wasm-algorithms/src/lib.rs`).

---

## Installation

```bash
git clone https://github.com/MichalLopaciuch/naviz.git
cd naviz
npm install
```

---

## Running

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Building

### Web app

```bash
npm run build        # type-check + Vite production build → dist/
npm run preview      # preview the production build locally
```

### WebAssembly (only needed after editing `wasm-algorithms/src/lib.rs`)

1. Install Rust via [rustup.rs](https://rustup.rs)
2. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```
3. Add the WASM compilation target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
4. Build:
   ```bash
   npm run build:wasm   # wasm-pack build → src/wasm-pkg/
   ```
   Commit the updated `src/wasm-pkg/` files alongside your Rust changes.

---

## Linting & Type Checking

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (no emit, type errors only)
```

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server at `http://localhost:5173` |
| `npm run build` | TypeScript check + Vite production build |
| `npm run build:wasm` | Compile Rust → WASM (`src/wasm-pkg/`) via wasm-pack |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm run lint` | ESLint over all source files |

---

## Usage

1. Click **Start/End** mode → **left-click** a cell to place the start point, **right-click** a cell to place the end point
2. Click **Wall** mode and drag to draw obstacles
3. Optionally, click **Terrain** mode to paint weighted terrain
4. Select an algorithm (A\*, Dijkstra, BFS, DFS) and click **▶ Run**
5. Drag the timeline slider to scrub through the exploration history

### JS vs WASM comparison

1. Run any algorithm with WASM **off** — note the Compute Time (`JS` badge in the Stats panel)
2. Click the **WASM** button to enable the Rust engine
3. Click **▶ Run** again — compare Compute Time (`WASM` badge)

Both runs produce identical paths and exploration sequences; only the engine differs.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Run algorithm |
| `W` | Switch to Wall mode |
| `S` | Switch to Start/End mode |
| `E` | Switch to Erase mode |
| `T` | Switch to Terrain mode / cycle terrain type |
| `A` | Cycle to next algorithm |
| `R` | Reset canvas (with confirmation) |
| `/ or ?` | Open keyboard shortcut help |
| `Ctrl + Scroll` | Step through timeline |

Click the **?** button in the top-right corner of the toolbar to see the shortcut reference inside the app.

