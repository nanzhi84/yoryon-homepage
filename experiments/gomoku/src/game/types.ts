export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Player = typeof BLACK | typeof WHITE;
export type Cell = typeof EMPTY | Player;
export type Board = Cell[][];

export type Point = {
  row: number;
  col: number;
};

export type Move = Point & {
  player: Player;
};

export type Difficulty = "calm" | "sharp" | "deep";

export type AiCandidate = Point & {
  rank: number;
  score: number;
};

export type WinResult = {
  winner: Player;
  line: Point[];
} | null;

export type AiResult = {
  move: Point;
  score: number;
  nodes: number;
  depth: number;
  timedOut: boolean;
  candidates: AiCandidate[];
};
