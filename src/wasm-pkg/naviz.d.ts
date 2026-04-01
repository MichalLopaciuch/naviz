/* tslint:disable */
/* eslint-disable */

/**
 * `heuristic`: 0 = Manhattan, 1 = Euclidean
 */
export function run_astar(weights: Float64Array, rows: number, cols: number, start_r: number, start_c: number, end_r: number, end_c: number, allow_diagonals: boolean, heuristic: number): any;

/**
 * `weights`: flat row-major Float64Array — 0.0 means wall, positive = terrain cost.
 */
export function run_bfs(weights: Float64Array, rows: number, cols: number, start_r: number, start_c: number, end_r: number, end_c: number, allow_diagonals: boolean): any;

export function run_dfs(weights: Float64Array, rows: number, cols: number, start_r: number, start_c: number, end_r: number, end_c: number, allow_diagonals: boolean): any;

export function run_dijkstra(weights: Float64Array, rows: number, cols: number, start_r: number, start_c: number, end_r: number, end_c: number, allow_diagonals: boolean): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly run_astar: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => any;
    readonly run_bfs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly run_dfs: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly run_dijkstra: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
