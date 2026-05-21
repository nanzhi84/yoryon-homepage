import { BLACK, BOARD_SIZE, Board, Cell, EMPTY, Move, Player, Point, WinResult } from "./types";

export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

export function createBoard(size = BOARD_SIZE): Board {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(EMPTY));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isInside(board: Board, point: Point) {
  return point.row >= 0 && point.row < board.length && point.col >= 0 && point.col < board.length;
}

export function getOpponent(player: Player): Player {
  return player === BLACK ? 2 : 1;
}

export function isFull(board: Board) {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
}

export function getMoveCount(board: Board) {
  return board.reduce((total, row) => total + row.filter((cell) => cell !== EMPTY).length, 0);
}

export function rebuildBoard(history: Move[], size = BOARD_SIZE) {
  const board = createBoard(size);

  for (const move of history) {
    board[move.row][move.col] = move.player;
  }

  return board;
}

export function findWin(board: Board, lastMove?: Point): WinResult {
  if (lastMove) {
    const player = board[lastMove.row]?.[lastMove.col];

    if (player !== EMPTY && player !== undefined) {
      return findWinFromPoint(board, lastMove, player);
    }

    return null;
  }

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      const player = board[row][col];

      if (player === EMPTY) {
        continue;
      }

      const result = findWinFromPoint(board, { row, col }, player);

      if (result) {
        return result;
      }
    }
  }

  return null;
}

function findWinFromPoint(board: Board, point: Point, player: Player): WinResult {
  for (const [rowStep, colStep] of DIRECTIONS) {
    const line = [point];

    collectDirection(board, point, player, rowStep, colStep, line);
    collectDirection(board, point, player, -rowStep, -colStep, line);

    if (line.length >= 5) {
      return {
        winner: player,
        line: line
          .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row))
          .slice(0, line.length)
      };
    }
  }

  return null;
}

function collectDirection(
  board: Board,
  point: Point,
  player: Player,
  rowStep: number,
  colStep: number,
  line: Point[]
) {
  let row = point.row + rowStep;
  let col = point.col + colStep;

  while (board[row]?.[col] === player) {
    line.push({ row, col });
    row += rowStep;
    col += colStep;
  }
}

export function formatPoint(point: Point) {
  return `${String.fromCharCode(65 + point.col)}${point.row + 1}`;
}
