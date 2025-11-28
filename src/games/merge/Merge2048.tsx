import React, { useEffect, useRef, useState } from "react";

interface Merge2048Props {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

type Board = number[][];

const SIZE = 4;
const BEST_KEY = "merge2048BestScore";

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function getEmptyCells(board: Board): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === 0) cells.push({ x, y });
    }
  }
  return cells;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function addRandomTile(board: Board): Board {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return board;

  const idx = Math.floor(Math.random() * empty.length);
  const { x, y } = empty[idx];

  const value = Math.random() < 0.9 ? 2 : 4;
  const newBoard = cloneBoard(board);
  newBoard[y][x] = value;
  return newBoard;
}

function initBoard(): Board {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

function compressAndMergeLine(line: number[]): { newLine: number[]; gained: number; moved: boolean } {
  const filtered = line.filter((v) => v !== 0);
  const result: number[] = [];
  let gained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      gained += merged;
      i++; // пропускаємо наступний, бо вже змерджили
    } else {
      result.push(filtered[i]);
    }
  }

  while (result.length < SIZE) {
    result.push(0);
  }

  const moved = result.some((v, idx) => v !== line[idx]);
  return { newLine: result, gained, moved };
}

function moveLeft(board: Board): { board: Board; gained: number; moved: boolean } {
  let moved = false;
  let gained = 0;
  const newBoard: Board = [];

  for (let y = 0; y < SIZE; y++) {
    const row = board[y];
    const { newLine, gained: g, moved: m } = compressAndMergeLine(row);
    newBoard.push(newLine);
    if (m) moved = true;
    gained += g;
  }

  return { board: newBoard, gained, moved };
}

function moveRight(board: Board): { board: Board; gained: number; moved: boolean } {
  let moved = false;
  let gained = 0;
  const newBoard: Board = [];

  for (let y = 0; y < SIZE; y++) {
    const row = [...board[y]].reverse();
    const { newLine, gained: g, moved: m } = compressAndMergeLine(row);
    const restored = [...newLine].reverse();
    newBoard.push(restored);
    if (m) moved = true;
    gained += g;
  }

  return { board: newBoard, gained, moved };
}

function moveUp(board: Board): { board: Board; gained: number; moved: boolean } {
  let moved = false;
  let gained = 0;
  const newBoard = cloneBoard(board);

  for (let x = 0; x < SIZE; x++) {
    const col: number[] = [];
    for (let y = 0; y < SIZE; y++) col.push(board[y][x]);

    const { newLine, gained: g, moved: m } = compressAndMergeLine(col);
    if (m) moved = true;
    gained += g;

    for (let y = 0; y < SIZE; y++) {
      newBoard[y][x] = newLine[y];
    }
  }

  return { board: newBoard, gained, moved };
}

function moveDown(board: Board): { board: Board; gained: number; moved: boolean } {
  let moved = false;
  let gained = 0;
  const newBoard = cloneBoard(board);

  for (let x = 0; x < SIZE; x++) {
    const col: number[] = [];
    for (let y = 0; y < SIZE; y++) col.push(board[y][x]);
    const reversed = [...col].reverse();

    const { newLine, gained: g, moved: m } = compressAndMergeLine(reversed);
    const restored = [...newLine].reverse();
    if (m) moved = true;
    gained += g;

    for (let y = 0; y < SIZE; y++) {
      newBoard[y][x] = restored[y];
    }
  }

  return { board: newBoard, gained, moved };
}

function hasMoves(board: Board): boolean {
  if (getEmptyCells(board).length > 0) return true;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = board[y][x];
      if (x < SIZE - 1 && board[y][x + 1] === v) return true;
      if (y < SIZE - 1 && board[y + 1][x] === v) return true;
    }
  }
  return false;
}

export function Merge2048({ onExit, onGameOver }: Merge2048Props) {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // bestScore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BEST_KEY);
      if (saved) {
        const val = Number(saved);
        if (!Number.isNaN(val)) {
          setBestScore(val);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const restart = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
  };

  const handleGameOverInternal = (finalScore: number) => {
    setGameOver(true);
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      try {
        localStorage.setItem(BEST_KEY, String(finalScore));
      } catch {
        // ignore
      }
    }
    if (onGameOver) {
      onGameOver(finalScore);
    }
  };

  const applyMove = (dir: "left" | "right" | "up" | "down") => {
    if (gameOver) return;

    let result;
    switch (dir) {
      case "left":
        result = moveLeft(board);
        break;
      case "right":
        result = moveRight(board);
        break;
      case "up":
        result = moveUp(board);
        break;
      case "down":
        result = moveDown(board);
        break;
    }

    const { board: movedBoard, gained, moved } = result!;
    if (!moved) return;

    let newScore = score + gained;
    setScore(newScore);

    if (newScore > bestScore) {
      setBestScore(newScore);
      try {
        localStorage.setItem(BEST_KEY, String(newScore));
      } catch {
        // ignore
      }
    }

    const withTile = addRandomTile(movedBoard);
    setBoard(withTile);

    if (!hasMoves(withTile)) {
      handleGameOverInternal(newScore);
    }
  };

  // клавіатура (для компа)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          applyMove("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          applyMove("right");
          break;
        case "ArrowUp":
          e.preventDefault();
          applyMove("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          applyMove("down");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, score, bestScore, gameOver]);

  // swipe для мобіли
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 25; // мінімальний рух

    if (absX < threshold && absY < threshold) return;

    if (absX > absY) {
      // горизонтальний swipe
      if (dx > 0) applyMove("right");
      else applyMove("left");
    } else {
      // вертикальний swipe
      if (dy > 0) applyMove("down");
      else applyMove("up");
    }

    touchStartRef.current = null;
  };

  const tileBackground = (value: number): string => {
    switch (value) {
      case 2:
        return "#eee4da";
      case 4:
        return "#ede0c8";
      case 8:
        return "#f2b179";
      case 16:
        return "#f59563";
      case 32:
        return "#f67c5f";
      case 64:
        return "#f65e3b";
      case 128:
        return "#edcf72";
      case 256:
        return "#edcc61";
      case 512:
        return "#edc850";
      case 1024:
        return "#edc53f";
      case 2048:
        return "#edc22e";
      default:
        return "#3c3a32";
    }
  };

  const tileColor = (value: number): string => {
    if (value === 2 || value === 4) return "#776e65";
    return "#f9f6f2";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1b1c28, #050509)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 16,
        color: "#fff",
        fontFamily: "Courier New, monospace",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button
          onClick={onExit}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          ⬅ Menu
        </button>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Merge 2048
        </div>
      </div>

      {/* Scores */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.5)",
            borderRadius: 8,
            padding: "8px 10px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              opacity: 0.8,
              marginBottom: 4,
            }}
          >
            Score
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {score}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.5)",
            borderRadius: 8,
            padding: "8px 10px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              opacity: 0.8,
              marginBottom: 4,
            }}
          >
            Best
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {bestScore}
          </div>
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          aspectRatio: "1/1",
          background: "#bbada0",
          borderRadius: 12,
          padding: 10,
          display: "grid",
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${SIZE}, 1fr)`,
          gap: 10,
          boxShadow: "0 0 18px rgba(0,0,0,0.45)",
        }}
      >
        {board.map((row, y) =>
          row.map((value, x) => (
            <div
              key={`${y}-${x}`}
              style={{
                borderRadius: 8,
                background:
                  value === 0 ? "rgba(238, 228, 218, 0.35)" : tileBackground(value),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: value >= 1024 ? 20 : value >= 128 ? 22 : 24,
                fontWeight: 700,
                color: value === 0 ? "transparent" : tileColor(value),
                transition: "background 0.15s ease-out, transform 0.1s ease-out",
              }}
            >
              {value !== 0 ? value : ""}
            </div>
          ))
        )}
      </div>

      {/* Controls hint + restart */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.8,
          }}
        >
          Swipe to move tiles (↑↓←→). Merge numbers to get 2048 and farm XP.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <button
            onClick={restart}
            style={{
              flex: 1,
              padding: "9px 10px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, #5bff9c, #00ffcc)",
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            🔁 Restart
          </button>
        </div>
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              background: "rgba(10,10,20,0.95)",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.25)",
              padding: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8,
                color: "#ffcc33",
              }}
            >
              Game Over
            </div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.9,
                marginBottom: 12,
              }}
            >
              Final score: {score}
            </div>
            <button
              onClick={restart}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg, #5bff9c, #00ffcc)",
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              🔁 Try again
            </button>
            <button
              onClick={onExit}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: 13,
              }}
            >
              ⬅ Back to menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
