export const DIRS_CARDINAL: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const DIRS_DIAGONAL: [number, number][] = [
  ...DIRS_CARDINAL,
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function getDirections(allowDiagonals: boolean): [number, number][] {
  return allowDiagonals ? DIRS_DIAGONAL : DIRS_CARDINAL;
}
