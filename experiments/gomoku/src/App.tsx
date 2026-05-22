import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Circle,
  Gauge,
  Orbit,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Undo2
} from "lucide-react";
import {
  AiCandidate,
  AiResult,
  BLACK,
  BOARD_SIZE,
  Board,
  Difficulty,
  EMPTY,
  Move,
  Player,
  Point,
  WHITE
} from "./game/types";
import {
  cloneBoard,
  createBoard,
  findWin,
  formatPoint,
  getMoveCount,
  getOpponent,
  isFull,
  rebuildBoard
} from "./game/rules";

type GameState = {
  board: Board;
  current: Player;
  human: Player;
  ai: Player;
  difficulty: Difficulty;
  history: Move[];
  winner: Player | "draw" | null;
  winningLine: Point[];
  isThinking: boolean;
  thinkingCandidates: AiCandidate[];
  lastAi: AiResult | null;
};

type WorkerMessage =
  | {
      id: number;
      phase: "preview";
      candidates: AiCandidate[];
    }
  | {
      id: number;
      phase: "result";
      result: AiResult;
    };

const difficultyLabels: Record<Difficulty, string> = {
  calm: "轻量",
  sharp: "稳健",
  deep: "深算"
};

const difficultyTone: Record<Difficulty, string> = {
  calm: "1 层",
  sharp: "2 层",
  deep: "3 层"
};

function freshGame(human: Player = BLACK, difficulty: Difficulty = "sharp"): GameState {
  return {
    board: createBoard(),
    current: BLACK,
    human,
    ai: getOpponent(human),
    difficulty,
    history: [],
    winner: null,
    winningLine: [],
    isThinking: false,
    thinkingCandidates: [],
    lastAi: null
  };
}

export function App() {
  const [game, setGame] = useState(() => freshGame());
  const gameRef = useRef(game);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const thinkingStartedAtRef = useRef(0);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    const worker = new Worker(new URL("./workers/ai.worker.ts", import.meta.url), {
      type: "module"
    });

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id } = event.data;

      if (id !== requestIdRef.current) {
        return;
      }

      if (event.data.phase === "preview") {
        const candidates = event.data.candidates.slice(0, 8);

        setGame((current) => {
          if (current.winner || current.current !== current.ai || !current.isThinking) {
            return current;
          }

          return {
            ...current,
            thinkingCandidates: candidates
          };
        });
        return;
      }

      const result = event.data.result;
      const elapsed = performance.now() - thinkingStartedAtRef.current;
      const delay = Math.max(0, 520 - elapsed);

      window.setTimeout(() => {
        if (id !== requestIdRef.current) {
          return;
        }

        setGame((current) => {
          if (current.winner || current.current !== current.ai) {
            return { ...current, isThinking: false, thinkingCandidates: [] };
          }

          return applyMove(current, result.move, current.ai, result);
        });
      }, delay);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (game.winner || game.current !== game.ai || game.isThinking) {
      return;
    }

    const id = requestIdRef.current + 1;
    requestIdRef.current = id;

    thinkingStartedAtRef.current = performance.now();
    setGame((current) => ({ ...current, isThinking: true, thinkingCandidates: [] }));

    window.setTimeout(() => {
      const current = gameRef.current;

      if (current.winner || current.current !== current.ai) {
        return;
      }

      workerRef.current?.postMessage({
        id,
        board: cloneBoard(current.board),
        player: current.ai,
        difficulty: current.difficulty
      });
    }, 180);
  }, [game.ai, game.current, game.difficulty, game.isThinking, game.winner]);

  const lastMove = game.history[game.history.length - 1] ?? null;
  const moveCount = game.history.length;
  const status = getStatus(game);

  const handleMove = useCallback((point: Point) => {
    setGame((current) => {
      if (
        current.winner ||
        current.isThinking ||
        current.current !== current.human ||
        current.board[point.row][point.col] !== EMPTY
      ) {
        return current;
      }

      return applyMove(current, point, current.human, null);
    });
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setGame((current) => freshGame(current.human, current.difficulty));
  }, []);

  const undo = useCallback(() => {
    requestIdRef.current += 1;
    setGame((current) => {
      if (current.isThinking || current.history.length === 0) {
        return current;
      }

      const removeCount = current.current === current.human && current.history.length > 1 ? 2 : 1;
      const history = current.history.slice(0, Math.max(0, current.history.length - removeCount));
      const board = rebuildBoard(history);
      const nextCurrent = history.length % 2 === 0 ? BLACK : WHITE;

      return {
        ...current,
        board,
        current: nextCurrent,
        history,
        winner: null,
        winningLine: [],
        lastAi: null,
        thinkingCandidates: [],
        isThinking: false
      };
    });
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    requestIdRef.current += 1;
    setGame((current) => freshGame(current.human, difficulty));
  }, []);

  const setHuman = useCallback((human: Player) => {
    requestIdRef.current += 1;
    setGame((current) => freshGame(human, current.difficulty));
  }, []);

  const aiMeta = useMemo(() => {
    if (game.isThinking) {
      return game.thinkingCandidates.length > 0
        ? `${game.thinkingCandidates.length} 个候选点`
        : "扫描中";
    }

    if (!game.lastAi) {
      return "待机";
    }

    return `${game.lastAi.nodes.toLocaleString("zh-CN")} 节点`;
  }, [game.isThinking, game.lastAi, game.thinkingCandidates.length]);

  const thoughtCandidates = game.isThinking
    ? game.thinkingCandidates
    : (game.lastAi?.candidates.slice(0, 5) ?? []);

  return (
    <main className="app-shell">
      <section className="game-surface" aria-label="五子棋 AI 对战">
        <header className="topbar">
          <div>
            <p className="eyebrow">Gomoku Lab</p>
            <h1>五子棋 AI 对战</h1>
          </div>
          <div className="status-pill" data-state={status.state}>
            {status.icon}
            <span>{status.text}</span>
          </div>
        </header>

        <div className="play-layout">
          <div className="board-zone">
            <BoardView
              board={game.board}
              human={game.human}
              isDisabled={Boolean(game.winner) || game.isThinking || game.current !== game.human}
              lastMove={lastMove}
              thinkingCandidates={game.thinkingCandidates}
              winningLine={game.winningLine}
              onMove={handleMove}
            />
          </div>

          <aside className="control-panel" aria-label="对局控制">
            <section className="panel-block">
              <div className="panel-title">
                <Brain size={18} />
                <span>AI 强度</span>
              </div>
              <div className="segmented">
                {(["calm", "sharp", "deep"] as Difficulty[]).map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    className={game.difficulty === difficulty ? "active" : ""}
                    onClick={() => setDifficulty(difficulty)}
                  >
                    <span>{difficultyLabels[difficulty]}</span>
                    <small>{difficultyTone[difficulty]}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel-block">
              <div className="panel-title">
                <Circle size={18} />
                <span>执棋</span>
              </div>
              <div className="stone-toggle">
                <button
                  type="button"
                  className={game.human === BLACK ? "active" : ""}
                  onClick={() => setHuman(BLACK)}
                >
                  <span className="mini-stone black" />
                  黑棋
                </button>
                <button
                  type="button"
                  className={game.human === WHITE ? "active" : ""}
                  onClick={() => setHuman(WHITE)}
                >
                  <span className="mini-stone white" />
                  白棋
                </button>
              </div>
            </section>

            <section className="panel-block metrics">
              <Metric icon={<Gauge size={18} />} label="手数" value={`${moveCount}`} />
              <Metric icon={<Orbit size={18} />} label="AI 搜索" value={aiMeta} />
              <Metric icon={<Shield size={18} />} label="最近落点" value={lastMove ? formatPoint(lastMove) : "-"} />
            </section>

            <section className="panel-block thought-panel">
              <div className="panel-title">
                <Brain size={18} />
                <span>思考轨迹</span>
              </div>
              <div className="thought-list">
                {thoughtCandidates.length > 0 ? (
                  thoughtCandidates.slice(0, 5).map((candidate) => (
                    <span key={`${candidate.row}-${candidate.col}`} className="thought-chip">
                      <b>{candidate.rank}</b>
                      {formatPoint(candidate)}
                    </span>
                  ))
                ) : (
                  <span className="thought-empty">待命</span>
                )}
              </div>
            </section>

            <div className="action-row">
              <button type="button" className="icon-button primary" onClick={reset} title="重新开始">
                <RotateCcw size={20} />
                <span>重开</span>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={undo}
                disabled={game.history.length === 0 || game.isThinking}
                title="悔棋"
              >
                <Undo2 size={20} />
                <span>悔棋</span>
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function BoardView({
  board,
  human,
  isDisabled,
  lastMove,
  thinkingCandidates,
  winningLine,
  onMove
}: {
  board: Board;
  human: Player;
  isDisabled: boolean;
  lastMove: Move | null;
  thinkingCandidates: AiCandidate[];
  winningLine: Point[];
  onMove: (point: Point) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const viewBox = 640;
  const padding = 44;
  const step = (viewBox - padding * 2) / (BOARD_SIZE - 1);
  const winStart = winningLine[0];
  const winEnd = winningLine[winningLine.length - 1];

  const toCoord = useCallback(
    (point: Point) => ({
      x: padding + point.col * step,
      y: padding + point.row * step
    }),
    [padding, step]
  );

  const getPointFromEvent = useCallback(
    (event: React.PointerEvent<SVGSVGElement>): Point | null => {
      const svg = svgRef.current;

      if (!svg) {
        return null;
      }

      const rect = svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * viewBox;
      const y = ((event.clientY - rect.top) / rect.height) * viewBox;
      const col = Math.round((x - padding) / step);
      const row = Math.round((y - padding) / step);

      if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) {
        return null;
      }

      const coord = toCoord({ row, col });
      const distance = Math.hypot(coord.x - x, coord.y - y);

      if (distance > step * 0.48) {
        return null;
      }

      return { row, col };
    },
    [padding, step, toCoord, viewBox]
  );

  return (
    <svg
      ref={svgRef}
      className="board"
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      role="grid"
      aria-label="15 乘 15 五子棋棋盘"
      onPointerMove={(event) => {
        if (isDisabled) {
          setHover(null);
          return;
        }

        const point = getPointFromEvent(event);
        setHover(point && board[point.row][point.col] === EMPTY ? point : null);
      }}
      onPointerLeave={() => setHover(null)}
      onPointerDown={(event) => {
        const point = getPointFromEvent(event);

        if (!point || isDisabled || board[point.row][point.col] !== EMPTY) {
          return;
        }

        onMove(point);
        setHover(null);
      }}
    >
      <defs>
        <radialGradient id="blackStone" cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="48%" stopColor="#1b1d22" />
          <stop offset="100%" stopColor="#050608" />
        </radialGradient>
        <radialGradient id="whiteStone" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="54%" stopColor="#e7e4dc" />
          <stop offset="100%" stopColor="#bfb8aa" />
        </radialGradient>
        <filter id="stoneShadow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#201408" floodOpacity="0.32" />
        </filter>
      </defs>

      <rect x="0" y="0" width={viewBox} height={viewBox} rx="20" className="board-bg" />
      <rect
        x={padding - 12}
        y={padding - 12}
        width={viewBox - padding * 2 + 24}
        height={viewBox - padding * 2 + 24}
        rx="10"
        className="board-inner"
      />

      {Array.from({ length: BOARD_SIZE }).map((_, index) => {
        const offset = padding + index * step;

        return (
          <g key={index}>
            <line x1={padding} y1={offset} x2={viewBox - padding} y2={offset} className="grid-line" />
            <line x1={offset} y1={padding} x2={offset} y2={viewBox - padding} className="grid-line" />
          </g>
        );
      })}

      {starPoints().map((point) => {
        const coord = toCoord(point);
        return <circle key={`${point.row}-${point.col}`} cx={coord.x} cy={coord.y} r="5.5" className="star" />;
      })}

      {hover ? (
        <circle
          cx={toCoord(hover).x}
          cy={toCoord(hover).y}
          r="15"
          className={human === BLACK ? "ghost black" : "ghost white"}
        />
      ) : null}

      {thinkingCandidates.map((candidate, index) => {
        if (board[candidate.row][candidate.col] !== EMPTY) {
          return null;
        }

        const coord = toCoord(candidate);

        return (
          <g
            key={`${candidate.row}-${candidate.col}`}
            className="ai-candidate"
            style={{ animationDelay: `${index * 85}ms` }}
          >
            <circle cx={coord.x} cy={coord.y} r={23 - index * 0.8} className="ai-candidate-ring" />
            <circle cx={coord.x} cy={coord.y} r={5.2} className="ai-candidate-dot" />
            {index < 3 ? (
              <text x={coord.x} y={coord.y - 27} className="ai-candidate-rank">
                {candidate.rank}
              </text>
            ) : null}
          </g>
        );
      })}

      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (cell === EMPTY) {
            return null;
          }

          const point = { row: rowIndex, col: colIndex };
          const coord = toCoord(point);
          const isLast = lastMove?.row === rowIndex && lastMove.col === colIndex;

          return (
            <g key={`${rowIndex}-${colIndex}`} className="stone-wrap">
              <circle
                cx={coord.x}
                cy={coord.y}
                r="17.5"
                fill={cell === BLACK ? "url(#blackStone)" : "url(#whiteStone)"}
                filter="url(#stoneShadow)"
                className="stone"
              />
              {isLast ? <circle cx={coord.x} cy={coord.y} r="22" className="last-ring" /> : null}
            </g>
          );
        })
      )}

      {winStart && winEnd ? (
        <line
          x1={toCoord(winStart).x}
          y1={toCoord(winStart).y}
          x2={toCoord(winEnd).x}
          y2={toCoord(winEnd).y}
          className="win-line"
        />
      ) : null}
    </svg>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function applyMove(
  game: GameState,
  point: Point,
  player: Player,
  lastAi: AiResult | null
): GameState {
  const board = cloneBoard(game.board);
  board[point.row][point.col] = player;
  const history = [...game.history, { ...point, player }];
  const win = findWin(board, point);
  const draw = !win && isFull(board);

  return {
    ...game,
    board,
    history,
    current: getOpponent(player),
    winner: win?.winner ?? (draw ? "draw" : null),
    winningLine: win?.line ?? [],
    isThinking: false,
    thinkingCandidates: [],
    lastAi
  };
}

function getStatus(game: GameState) {
  if (game.winner === "draw") {
    return {
      text: "平局",
      state: "done",
      icon: <Sparkles size={18} />
    };
  }

  if (game.winner) {
    return {
      text: game.winner === game.human ? "你赢了" : "AI 赢了",
      state: game.winner === game.human ? "win" : "done",
      icon: <Trophy size={18} />
    };
  }

  if (game.isThinking) {
    return {
      text: "AI 思考中",
      state: "thinking",
      icon: <Brain size={18} />
    };
  }

  return {
    text: game.current === game.human ? "轮到你" : "AI 落子",
    state: game.current === game.human ? "ready" : "thinking",
    icon: game.current === game.human ? <Circle size={18} /> : <Brain size={18} />
  };
}

function starPoints() {
  return [3, 7, 11].flatMap((row) => [3, 7, 11].map((col) => ({ row, col })));
}
