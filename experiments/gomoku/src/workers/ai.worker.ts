import { findBestMove, previewCandidates } from "../game/ai";
import { Board, Difficulty, Player } from "../game/types";

type AiRequest = {
  id: number;
  board: Board;
  player: Player;
  difficulty: Difficulty;
};

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, board, player, difficulty } = event.data;
  const candidates = previewCandidates(board, player, difficulty);

  self.postMessage({
    id,
    phase: "preview",
    candidates
  });

  const result = findBestMove(board, player, difficulty);

  self.postMessage({
    id,
    phase: "result",
    result
  });
};

export {};
