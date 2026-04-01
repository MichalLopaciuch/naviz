use std::collections::{BinaryHeap, VecDeque};

use js_sys::Date;
use serde::Serialize;
use wasm_bindgen::prelude::*;

// ─── Result types (mirror src/types.ts AlgorithmResult) ──────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AlgorithmStats {
    cells_explored: usize,
    path_length: Option<usize>,
    compute_time_ms: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AlgorithmResult {
    explored_order: Vec<[usize; 2]>,
    frontier_at_step: Vec<Vec<[usize; 2]>>,
    path: Option<Vec<[usize; 2]>>,
    stats: AlgorithmStats,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIRS_CARDINAL: [[i32; 2]; 4] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIRS_DIAGONAL: [[i32; 2]; 8] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
];

#[inline]
fn cell_idx(r: usize, c: usize, cols: usize) -> usize {
    r * cols + c
}

fn reconstruct_path(
    came_from: &[Option<usize>],
    start_idx: usize,
    end_idx: usize,
    cols: usize,
) -> Vec<[usize; 2]> {
    let mut path = Vec::new();
    let mut cur = end_idx;
    loop {
        path.push([cur / cols, cur % cols]);
        if cur == start_idx {
            break;
        }
        match came_from[cur] {
            Some(prev) => cur = prev,
            None => break,
        }
    }
    path.reverse();
    path
}

// ─── Min-heap entry for Dijkstra / A* ────────────────────────────────────────

#[derive(PartialEq)]
struct HeapEntry {
    /// Stored as bits of a non-negative f64 so that the standard integer
    /// comparison gives correct ascending order (no NaN in practice).
    cost_bits: u64,
    idx: usize,
}

impl HeapEntry {
    fn new(cost: f64, idx: usize) -> Self {
        HeapEntry {
            cost_bits: cost.to_bits(),
            idx,
        }
    }
}

impl Eq for HeapEntry {}

/// BinaryHeap is a max-heap; we flip the ordering to get a min-heap.
impl Ord for HeapEntry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        other
            .cost_bits
            .cmp(&self.cost_bits)
            .then(self.idx.cmp(&other.idx))
    }
}

impl PartialOrd for HeapEntry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

// ─── BFS ─────────────────────────────────────────────────────────────────────

/// `weights`: flat row-major Float64Array — 0.0 means wall, positive = terrain cost.
#[wasm_bindgen]
pub fn run_bfs(
    weights: &[f64],
    rows: usize,
    cols: usize,
    start_r: usize,
    start_c: usize,
    end_r: usize,
    end_c: usize,
    allow_diagonals: bool,
) -> JsValue {
    let t0 = Date::now();
    let n = rows * cols;
    let mut visited = vec![false; n];
    let mut came_from: Vec<Option<usize>> = vec![None; n];
    let mut explored_order: Vec<[usize; 2]> = Vec::new();
    let mut frontier_at_step: Vec<Vec<[usize; 2]>> = Vec::new();

    let start_idx = cell_idx(start_r, start_c, cols);
    let end_idx = cell_idx(end_r, end_c, cols);
    let mut queue: VecDeque<usize> = VecDeque::new();
    queue.push_back(start_idx);
    visited[start_idx] = true;

    let dirs: &[[i32; 2]] = if allow_diagonals {
        &DIRS_DIAGONAL
    } else {
        &DIRS_CARDINAL
    };

    while let Some(current) = queue.pop_front() {
        let r = current / cols;
        let c = current % cols;
        explored_order.push([r, c]);

        let frontier: Vec<[usize; 2]> = queue.iter().map(|&i| [i / cols, i % cols]).collect();
        frontier_at_step.push(frontier);

        if current == end_idx {
            let path = reconstruct_path(&came_from, start_idx, end_idx, cols);
            let path_len = path.len();
            let cells_explored = explored_order.len();
            let result = AlgorithmResult {
                explored_order,
                frontier_at_step,
                path: Some(path),
                stats: AlgorithmStats {
                    cells_explored,
                    path_length: Some(path_len),
                    compute_time_ms: Date::now() - t0,
                },
            };
            return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
        }

        for dir in dirs {
            let nr = r as i32 + dir[0];
            let nc = c as i32 + dir[1];
            if nr < 0 || nr >= rows as i32 || nc < 0 || nc >= cols as i32 {
                continue;
            }
            let ni = cell_idx(nr as usize, nc as usize, cols);
            if visited[ni] || weights[ni] == 0.0 {
                continue;
            }
            visited[ni] = true;
            came_from[ni] = Some(current);
            queue.push_back(ni);
        }
    }

    let cells_explored = explored_order.len();
    let result = AlgorithmResult {
        explored_order,
        frontier_at_step,
        path: None,
        stats: AlgorithmStats {
            cells_explored,
            path_length: None,
            compute_time_ms: Date::now() - t0,
        },
    };
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

// ─── DFS ─────────────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn run_dfs(
    weights: &[f64],
    rows: usize,
    cols: usize,
    start_r: usize,
    start_c: usize,
    end_r: usize,
    end_c: usize,
    allow_diagonals: bool,
) -> JsValue {
    let t0 = Date::now();
    let n = rows * cols;
    let mut visited = vec![false; n];
    let mut came_from: Vec<Option<usize>> = vec![None; n];
    let mut explored_order: Vec<[usize; 2]> = Vec::new();
    let mut frontier_at_step: Vec<Vec<[usize; 2]>> = Vec::new();

    let start_idx = cell_idx(start_r, start_c, cols);
    let end_idx = cell_idx(end_r, end_c, cols);
    let mut stack: Vec<usize> = vec![start_idx];

    let dirs: &[[i32; 2]] = if allow_diagonals {
        &DIRS_DIAGONAL
    } else {
        &DIRS_CARDINAL
    };

    while let Some(current) = stack.pop() {
        if visited[current] {
            continue;
        }
        visited[current] = true;
        let r = current / cols;
        let c = current % cols;
        explored_order.push([r, c]);

        let frontier: Vec<[usize; 2]> = stack
            .iter()
            .filter(|&&i| !visited[i])
            .map(|&i| [i / cols, i % cols])
            .collect();
        frontier_at_step.push(frontier);

        if current == end_idx {
            let path = reconstruct_path(&came_from, start_idx, end_idx, cols);
            let path_len = path.len();
            let cells_explored = explored_order.len();
            let result = AlgorithmResult {
                explored_order,
                frontier_at_step,
                path: Some(path),
                stats: AlgorithmStats {
                    cells_explored,
                    path_length: Some(path_len),
                    compute_time_ms: Date::now() - t0,
                },
            };
            return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
        }

        for dir in dirs {
            let nr = r as i32 + dir[0];
            let nc = c as i32 + dir[1];
            if nr < 0 || nr >= rows as i32 || nc < 0 || nc >= cols as i32 {
                continue;
            }
            let ni = cell_idx(nr as usize, nc as usize, cols);
            if visited[ni] || weights[ni] == 0.0 {
                continue;
            }
            if came_from[ni].is_none() && ni != start_idx {
                came_from[ni] = Some(current);
            }
            stack.push(ni);
        }
    }

    let cells_explored = explored_order.len();
    let result = AlgorithmResult {
        explored_order,
        frontier_at_step,
        path: None,
        stats: AlgorithmStats {
            cells_explored,
            path_length: None,
            compute_time_ms: Date::now() - t0,
        },
    };
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

// ─── Dijkstra ────────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub fn run_dijkstra(
    weights: &[f64],
    rows: usize,
    cols: usize,
    start_r: usize,
    start_c: usize,
    end_r: usize,
    end_c: usize,
    allow_diagonals: bool,
) -> JsValue {
    let t0 = Date::now();
    let n = rows * cols;
    let mut dist = vec![f64::INFINITY; n];
    let mut came_from: Vec<Option<usize>> = vec![None; n];
    let mut explored_order: Vec<[usize; 2]> = Vec::new();
    let mut frontier_at_step: Vec<Vec<[usize; 2]>> = Vec::new();
    let mut closed = vec![false; n];
    let mut open_set = vec![false; n];

    let start_idx = cell_idx(start_r, start_c, cols);
    let end_idx = cell_idx(end_r, end_c, cols);
    dist[start_idx] = 0.0;

    let mut heap: BinaryHeap<HeapEntry> = BinaryHeap::new();
    heap.push(HeapEntry::new(0.0, start_idx));
    open_set[start_idx] = true;

    let dirs: &[[i32; 2]] = if allow_diagonals {
        &DIRS_DIAGONAL
    } else {
        &DIRS_CARDINAL
    };

    while let Some(entry) = heap.pop() {
        let current = entry.idx;
        if closed[current] {
            continue;
        }
        closed[current] = true;
        open_set[current] = false;

        let r = current / cols;
        let c = current % cols;
        explored_order.push([r, c]);

        // Frontier: neighbors in open_set
        let mut frontier: Vec<[usize; 2]> = Vec::new();
        for dir in dirs {
            let nr = r as i32 + dir[0];
            let nc = c as i32 + dir[1];
            if nr < 0 || nr >= rows as i32 || nc < 0 || nc >= cols as i32 {
                continue;
            }
            let ni = cell_idx(nr as usize, nc as usize, cols);
            if open_set[ni] {
                frontier.push([nr as usize, nc as usize]);
            }
        }
        frontier_at_step.push(frontier);

        if current == end_idx {
            let path = reconstruct_path(&came_from, start_idx, end_idx, cols);
            let path_len = path.len();
            let cells_explored = explored_order.len();
            let result = AlgorithmResult {
                explored_order,
                frontier_at_step,
                path: Some(path),
                stats: AlgorithmStats {
                    cells_explored,
                    path_length: Some(path_len),
                    compute_time_ms: Date::now() - t0,
                },
            };
            return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
        }

        for dir in dirs {
            let nr = r as i32 + dir[0];
            let nc = c as i32 + dir[1];
            if nr < 0 || nr >= rows as i32 || nc < 0 || nc >= cols as i32 {
                continue;
            }
            let ni = cell_idx(nr as usize, nc as usize, cols);
            if closed[ni] || weights[ni] == 0.0 {
                continue;
            }
            let move_cost = if dir[0].abs() + dir[1].abs() == 2 {
                std::f64::consts::SQRT_2
            } else {
                1.0
            };
            let tentative = dist[current] + move_cost * weights[ni];
            if tentative < dist[ni] {
                dist[ni] = tentative;
                came_from[ni] = Some(current);
                heap.push(HeapEntry::new(tentative, ni));
                open_set[ni] = true;
            }
        }
    }

    let cells_explored = explored_order.len();
    let result = AlgorithmResult {
        explored_order,
        frontier_at_step,
        path: None,
        stats: AlgorithmStats {
            cells_explored,
            path_length: None,
            compute_time_ms: Date::now() - t0,
        },
    };
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

// ─── A* ──────────────────────────────────────────────────────────────────────

/// `heuristic`: 0 = Manhattan, 1 = Euclidean
#[wasm_bindgen]
pub fn run_astar(
    weights: &[f64],
    rows: usize,
    cols: usize,
    start_r: usize,
    start_c: usize,
    end_r: usize,
    end_c: usize,
    allow_diagonals: bool,
    heuristic: u8,
) -> JsValue {
    let t0 = Date::now();
    let n = rows * cols;
    let mut g_score = vec![f64::INFINITY; n];
    let mut came_from: Vec<Option<usize>> = vec![None; n];
    let mut explored_order: Vec<[usize; 2]> = Vec::new();
    let mut frontier_at_step: Vec<Vec<[usize; 2]>> = Vec::new();
    let mut closed = vec![false; n];
    let mut open_set = vec![false; n];

    let start_idx = cell_idx(start_r, start_c, cols);
    let end_idx = cell_idx(end_r, end_c, cols);
    g_score[start_idx] = 0.0;

    let h = |r: usize, c: usize| -> f64 {
        let dr = (r as f64 - end_r as f64).abs();
        let dc = (c as f64 - end_c as f64).abs();
        if heuristic == 0 {
            dr + dc
        } else {
            (dr * dr + dc * dc).sqrt()
        }
    };

    let mut heap: BinaryHeap<HeapEntry> = BinaryHeap::new();
    heap.push(HeapEntry::new(h(start_r, start_c), start_idx));
    open_set[start_idx] = true;

    let dirs: &[[i32; 2]] = if allow_diagonals {
        &DIRS_DIAGONAL
    } else {
        &DIRS_CARDINAL
    };

    while let Some(entry) = heap.pop() {
        let current = entry.idx;
        if closed[current] {
            continue;
        }
        closed[current] = true;
        open_set[current] = false;

        let r = current / cols;
        let c = current % cols;
        explored_order.push([r, c]);

        let mut frontier: Vec<[usize; 2]> = Vec::new();
        for dir in dirs {
            let nr = r as i32 + dir[0];
            let nc = c as i32 + dir[1];
            if nr < 0 || nr >= rows as i32 || nc < 0 || nc >= cols as i32 {
                continue;
            }
            let ni = cell_idx(nr as usize, nc as usize, cols);
            if open_set[ni] {
                frontier.push([nr as usize, nc as usize]);
            }
        }
        frontier_at_step.push(frontier);

        if current == end_idx {
            let path = reconstruct_path(&came_from, start_idx, end_idx, cols);
            let path_len = path.len();
            let cells_explored = explored_order.len();
            let result = AlgorithmResult {
                explored_order,
                frontier_at_step,
                path: Some(path),
                stats: AlgorithmStats {
                    cells_explored,
                    path_length: Some(path_len),
                    compute_time_ms: Date::now() - t0,
                },
            };
            return serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL);
        }

        for dir in dirs {
            let nr = r as i32 + dir[0];
            let nc = c as i32 + dir[1];
            if nr < 0 || nr >= rows as i32 || nc < 0 || nc >= cols as i32 {
                continue;
            }
            let ni = cell_idx(nr as usize, nc as usize, cols);
            if closed[ni] || weights[ni] == 0.0 {
                continue;
            }
            let move_cost = if dir[0].abs() + dir[1].abs() == 2 {
                std::f64::consts::SQRT_2
            } else {
                1.0
            };
            let tentative_g = g_score[current] + move_cost * weights[ni];
            if tentative_g < g_score[ni] {
                g_score[ni] = tentative_g;
                came_from[ni] = Some(current);
                let f = tentative_g + h(nr as usize, nc as usize);
                heap.push(HeapEntry::new(f, ni));
                open_set[ni] = true;
            }
        }
    }

    let cells_explored = explored_order.len();
    let result = AlgorithmResult {
        explored_order,
        frontier_at_step,
        path: None,
        stats: AlgorithmStats {
            cells_explored,
            path_length: None,
            compute_time_ms: Date::now() - t0,
        },
    };
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}
