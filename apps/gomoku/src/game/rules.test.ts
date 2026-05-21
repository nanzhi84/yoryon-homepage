import { describe, expect, it } from "vitest";
import { BLACK, WHITE } from "./types";
import { createBoard, findWin, getOpponent, rebuildBoard } from "./rules";

describe("gomoku rules", () => {
  it("detects a horizontal five-stone line", () => {
    const board = createBoard();

    for (let col = 3; col < 8; col += 1) {
      board[6][col] = BLACK;
    }

    const result = findWin(board, { row: 6, col: 5 });

    expect(result?.winner).toBe(BLACK);
    expect(result?.line).toHaveLength(5);
  });

  it("rebuilds board from move history", () => {
    const board = rebuildBoard([
      { row: 7, col: 7, player: BLACK },
      { row: 7, col: 8, player: WHITE }
    ]);

    expect(board[7][7]).toBe(BLACK);
    expect(board[7][8]).toBe(WHITE);
  });

  it("returns the opposite player", () => {
    expect(getOpponent(BLACK)).toBe(WHITE);
    expect(getOpponent(WHITE)).toBe(BLACK);
  });
});
