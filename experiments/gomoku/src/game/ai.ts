import { AiCandidate, AiResult, Board, Difficulty, EMPTY, Player, Point } from "./types";
import { findWin, getMoveCount, getOpponent, isFull } from "./rules";
import { evaluateBoard, WIN_SCORE } from "./scoring";

type SearchOptions = {
  depth: number;
  maxCandidates: number;
  timeLimitMs: number;
};

const DIFFICULTY_OPTIONS: Record<Difficulty, SearchOptions> = {
  calm: { depth: 1, maxCandidates: 10, timeLimitMs: 350 },
  sharp: { depth: 2, maxCandidates: 14, timeLimitMs: 750 },
  deep: { depth: 3, maxCandidates: 18, timeLimitMs: 1_350 }
};

type SearchContext = {
  rootPlayer: Player;
  startTime: number;
  timeLimitMs: number;
  nodes: number;
  timedOut: boolean;
};

type RankedCandidate = {
  move: Point;
  score: number;
};

export function previewCandidates(
  board: Board,
  player: Player,
  difficulty: Difficulty = "sharp"
): AiCandidate[] {
  const options = DIFFICULTY_OPTIONS[difficulty];
  return toAiCandidates(rankCandidates(board, player, options.maxCandidates));
}

export function findBestMove(
  board: Board,
  player: Player,
  difficulty: Difficulty = "sharp"
): AiResult {
  const options = DIFFICULTY_OPTIONS[difficulty];
  const startTime = performance.now();
  const context: SearchContext = {
    rootPlayer: player,
    startTime,
    timeLimitMs: options.timeLimitMs,
    nodes: 0,
    timedOut: false
  };

  if (getMoveCount(board) === 0) {
    const move = centerPoint(board);

    return {
      move,
      score: 0,
      nodes: 1,
      depth: 0,
      timedOut: false,
      candidates: [{ ...move, rank: 1, score: 0 }]
    };
  }

  const rankedCandidates = rankCandidates(board, player, options.maxCandidates);
  const candidatePreview = toAiCandidates(rankedCandidates);
  const candidates = rankedCandidates.map(({ move }) => move);
  const winningMove = findImmediateMove(board, player, candidates);

  if (winningMove) {
    return {
      move: winningMove,
      score: WIN_SCORE,
      nodes: candidates.length,
      depth: 1,
      timedOut: false,
      candidates: promoteCandidate(candidatePreview, winningMove, WIN_SCORE)
    };
  }

  const blockMove = findImmediateMove(board, getOpponent(player), candidates);

  if (blockMove) {
    return {
      move: blockMove,
      score: WIN_SCORE / 2,
      nodes: candidates.length,
      depth: 1,
      timedOut: false,
      candidates: promoteCandidate(candidatePreview, blockMove, WIN_SCORE / 2)
    };
  }

  let bestMove = candidates[0] ?? firstEmpty(board) ?? centerPoint(board);
  let bestScore = Number.NEGATIVE_INFINITY;
  let alpha = Number.NEGATIVE_INFINITY;

  for (const move of candidates) {
    if (isTimeUp(context)) {
      break;
    }

    board[move.row][move.col] = player;
    const score = minimax(
      board,
      options.depth - 1,
      alpha,
      Number.POSITIVE_INFINITY,
      getOpponent(player),
      false,
      context,
      options.maxCandidates
    );
    board[move.row][move.col] = EMPTY;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    alpha = Math.max(alpha, bestScore);
  }

  return {
    move: bestMove,
    score: bestScore,
    nodes: context.nodes,
    depth: options.depth,
    timedOut: context.timedOut,
    candidates: promoteCandidate(candidatePreview, bestMove, bestScore)
  };
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: Player,
  maximizing: boolean,
  context: SearchContext,
  maxCandidates: number
): number {
  context.nodes += 1;

  if (isTimeUp(context)) {
    return evaluateBoard(board, context.rootPlayer);
  }

  const winner = findWin(board);

  if (winner) {
    return winner.winner === context.rootPlayer ? WIN_SCORE + depth : -WIN_SCORE - depth;
  }

  if (depth === 0 || isFull(board)) {
    return evaluateBoard(board, context.rootPlayer);
  }

  const candidates = rankCandidates(board, currentPlayer, maxCandidates).map(({ move }) => move);

  if (maximizing) {
    let value = Number.NEGATIVE_INFINITY;

    for (const move of candidates) {
      board[move.row][move.col] = currentPlayer;
      value = Math.max(
        value,
        minimax(
          board,
          depth - 1,
          alpha,
          beta,
          getOpponent(currentPlayer),
          false,
          context,
          maxCandidates
        )
      );
      board[move.row][move.col] = EMPTY;

      alpha = Math.max(alpha, value);

      if (alpha >= beta) {
        break;
      }
    }

    return value;
  }

  let value = Number.POSITIVE_INFINITY;

  for (const move of candidates) {
    board[move.row][move.col] = currentPlayer;
    value = Math.min(
      value,
      minimax(
        board,
        depth - 1,
        alpha,
        beta,
        getOpponent(currentPlayer),
        true,
        context,
        maxCandidates
      )
    );
    board[move.row][move.col] = EMPTY;

    beta = Math.min(beta, value);

    if (alpha >= beta) {
      break;
    }
  }

  return value;
}

function findImmediateMove(board: Board, player: Player, candidates: Point[]) {
  for (const move of candidates) {
    board[move.row][move.col] = player;
    const hasWin = Boolean(findWin(board, move));
    board[move.row][move.col] = EMPTY;

    if (hasWin) {
      return move;
    }
  }

  return null;
}

function rankCandidates(board: Board, player: Player, limit: number): RankedCandidate[] {
  const radius = 2;
  const seen = new Set<string>();
  const moves: Point[] = [];

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col] === EMPTY) {
        continue;
      }

      for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
        for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
          const nextRow = row + rowOffset;
          const nextCol = col + colOffset;
          const key = `${nextRow}:${nextCol}`;

          if (
            nextRow < 0 ||
            nextCol < 0 ||
            nextRow >= board.length ||
            nextCol >= board.length ||
            board[nextRow][nextCol] !== EMPTY ||
            seen.has(key)
          ) {
            continue;
          }

          seen.add(key);
          moves.push({ row: nextRow, col: nextCol });
        }
      }
    }
  }

  if (moves.length === 0) {
    return [{ move: centerPoint(board), score: 0 }];
  }

  const opponent = getOpponent(player);

  return moves
    .map((move) => {
      board[move.row][move.col] = player;
      const attack = evaluateBoard(board, player);
      board[move.row][move.col] = opponent;
      const defense = evaluateBoard(board, opponent);
      board[move.row][move.col] = EMPTY;

      return {
        move,
        score: attack + defense * 0.92 + centerBias(board, move)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function isTimeUp(context: SearchContext) {
  if (performance.now() - context.startTime > context.timeLimitMs) {
    context.timedOut = true;
    return true;
  }

  return false;
}

function centerPoint(board: Board): Point {
  const center = Math.floor(board.length / 2);
  return { row: center, col: center };
}

function firstEmpty(board: Board): Point | null {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col] === EMPTY) {
        return { row, col };
      }
    }
  }

  return null;
}

function centerBias(board: Board, point: Point) {
  const center = Math.floor(board.length / 2);
  const distance = Math.abs(point.row - center) + Math.abs(point.col - center);
  return Math.max(0, 22 - distance * 2);
}

function toAiCandidates(candidates: RankedCandidate[]): AiCandidate[] {
  return candidates.map(({ move, score }, index) => ({
    ...move,
    rank: index + 1,
    score
  }));
}

function promoteCandidate(
  candidates: AiCandidate[],
  move: Point,
  score: number
): AiCandidate[] {
  const promoted: AiCandidate = {
    ...move,
    rank: 1,
    score
  };
  const rest = candidates
    .filter((candidate) => candidate.row !== move.row || candidate.col !== move.col)
    .slice(0, Math.max(0, candidates.length - 1));

  return [promoted, ...rest].map((candidate, index) => ({
    ...candidate,
    rank: index + 1
  }));
}
