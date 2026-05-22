import { Board, EMPTY, Player } from "./types";
import { DIRECTIONS, getOpponent } from "./rules";

export const WIN_SCORE = 100_000_000;

const RUN_SCORES: Record<number, Record<number, number>> = {
  1: { 0: 0, 1: 4, 2: 16 },
  2: { 0: 0, 1: 96, 2: 720 },
  3: { 0: 0, 1: 4_200, 2: 36_000 },
  4: { 0: 0, 1: 210_000, 2: 1_800_000 },
  5: { 0: WIN_SCORE, 1: WIN_SCORE, 2: WIN_SCORE }
};

export function evaluateBoard(board: Board, player: Player) {
  const opponent = getOpponent(player);
  return evaluateForPlayer(board, player) - evaluateForPlayer(board, opponent) * 1.12;
}

export function evaluateForPlayer(board: Board, player: Player) {
  return evaluateRuns(board, player) + evaluateWindows(board, player);
}

function evaluateRuns(board: Board, player: Player) {
  let score = 0;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col] !== player) {
        continue;
      }

      for (const [rowStep, colStep] of DIRECTIONS) {
        const previous = board[row - rowStep]?.[col - colStep];

        if (previous === player) {
          continue;
        }

        let length = 0;
        let scanRow = row;
        let scanCol = col;

        while (board[scanRow]?.[scanCol] === player) {
          length += 1;
          scanRow += rowStep;
          scanCol += colStep;
        }

        const openEnds =
          (previous === EMPTY ? 1 : 0) + (board[scanRow]?.[scanCol] === EMPTY ? 1 : 0);

        score += runScore(length, openEnds);
      }
    }
  }

  return score;
}

function evaluateWindows(board: Board, player: Player) {
  let score = 0;
  const opponent = getOpponent(player);

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      for (const [rowStep, colStep] of DIRECTIONS) {
        let own = 0;
        let rival = 0;
        let empty = 0;

        for (let offset = 0; offset < 5; offset += 1) {
          const cell = board[row + rowStep * offset]?.[col + colStep * offset];

          if (cell === undefined) {
            rival += 1;
            break;
          }

          if (cell === player) {
            own += 1;
          } else if (cell === opponent) {
            rival += 1;
          } else if (cell === EMPTY) {
            empty += 1;
          }
        }

        if (rival > 0 || own === 0) {
          continue;
        }

        if (own === 5) {
          score += WIN_SCORE;
        } else if (own === 4 && empty === 1) {
          score += 120_000;
        } else if (own === 3 && empty === 2) {
          score += 9_000;
        } else if (own === 2 && empty === 3) {
          score += 700;
        } else if (own === 1 && empty === 4) {
          score += 8;
        }
      }
    }
  }

  return score;
}

function runScore(length: number, openEnds: number) {
  if (length >= 5) {
    return WIN_SCORE;
  }

  return RUN_SCORES[length]?.[openEnds] ?? 0;
}
