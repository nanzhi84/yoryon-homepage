import { describe, expect, it } from "vitest";
import { BLACK, WHITE } from "./types";
import { createBoard } from "./rules";
import { findBestMove } from "./ai";

describe("gomoku ai", () => {
  it("takes an immediate winning move", () => {
    const board = createBoard();

    for (let col = 4; col < 8; col += 1) {
      board[7][col] = WHITE;
    }

    const result = findBestMove(board, WHITE, "sharp");

    expect(result.move.row).toBe(7);
    expect([3, 8]).toContain(result.move.col);
  });

  it("blocks the opponent immediate win", () => {
    const board = createBoard();

    for (let col = 5; col < 9; col += 1) {
      board[8][col] = BLACK;
    }

    const result = findBestMove(board, WHITE, "sharp");

    expect(result.move.row).toBe(8);
    expect([4, 9]).toContain(result.move.col);
  });
});
