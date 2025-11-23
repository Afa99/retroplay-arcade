import { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  createPipe,
  resetGame,
  checkCollision,
  type GameState,
} from "./utils";

interface FlappyProps {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

// Трохи спокійніші значення
const GRAVITY = 0.45;      // було 0.55
const JUMP_FORCE = -8.5;   // було -9.5
const PIPE_SPEED = 2.0;    // було 2.6

const BEST_KEY = "flappyBestScore";

export function Flappy({ onExit, onGameOver }: FlappyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const gameRef = useRef<GameState>(createInitialState());

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Завантажуємо bestScore
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BEST_KEY);
      if (saved) {
        const val = Number(saved);
        if (!Number.isNaN(val)) {
          setBestScore(val);
          gameRef.current.bestScore = val;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const startNewGame = () => {
    const restarted = resetGame(gameRef.current);
    restarted.isRunning = true;
    restarted.bird.velocity = JUMP_FORCE;
    gameRef.current = restarted;

    setScore(0);
    setGameOver(false);
  };

  const handleTap = () => {
    const game = gameRef.current;

    if (game.gameOver) {
      startNewGame();
      return;
    }

    if (!game.isRunning) {
      game.isRunning = true;
    }

    game.bird.velocity = JUMP_FORCE;
  };

  const endGame = () => {
    const game = gameRef.current;
    if (game.gameOver) return;

    game.gameOver = true;
    game.isRunning = false;
    setGameOver(true);

    if (onGameOver) onGameOver(game.score);
  };

  const drawScene = (ctx: CanvasRenderingContext2D, game: GameState) => {
    ctx.imageSmoothingEnabled = false;

    // фон на весь канвас
    ctx.fillStyle = "#03050f";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // труби
    ctx.fillStyle = "#00c060";
    for (const pipe of game.pipes) {
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
      ctx.fillRect(
        pipe.x,
        pipe.gapY + pipe.gapHeight,
        pipe.width,
        CANVAS_HEIGHT - (pipe.gapY + pipe.gapHeight)
      );
    }

    // монетка
    ctx.beginPath();
    ctx.arc(game.bird.x, game.bird.y, game.bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd84a";
    ctx.fill();
    ctx.strokeStyle = "#8c6a00";
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = "#663300";
    ctx.font = "13px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("₿", game.bird.x, game.bird.y + 1);

    // текст у центрі (інфа по старту/рестарту)
    ctx.fillStyle = "#fff";
    ctx.font = "16px Courier New";
    ctx.textAlign = "center";

    if (!game.isRunning && !game.gameOver) {
      ctx.fillText("Tap to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    if (game.gameOver) {
      ctx.fillStyle = "#ff6666";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillStyle = "#fff";
      ctx.fillText(
        "Tap to restart",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 22
      );
    }
  };

  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = gameRef.current;

    const last = lastTimeRef.current ?? timestamp;
    let delta = (timestamp - last) / (1000 / 60);
    if (delta > 2) delta = 2;
    lastTimeRef.current = timestamp;

    if (game.isRunning && !game.gameOver) {
      game.bird.velocity += GRAVITY * delta;
      game.bird.y += game.bird.velocity * delta;

      if (game.bird.y + game.bird.radius >= CANVAS_HEIGHT) {
        game.bird.y = CANVAS_HEIGHT - game.bird.radius;
        endGame();
      }
      if (game.bird.y - game.bird.radius <= 0) {
        game.bird.y = game.bird.radius;
        endGame();
      }

      for (let pipe of game.pipes) {
        pipe.x -= PIPE_SPEED * delta;
      }

      if (game.pipes[0].x + game.pipes[0].width < 0) {
        game.pipes.shift();
        game.pipes.push(createPipe());
      }

      for (const pipe of game.pipes) {
        if (checkCollision(game.bird, pipe)) {
          endGame();
        }

        if (!pipe.passed && pipe.x + pipe.width < game.bird.x) {
          pipe.passed = true;
          game.score += 1;
          setScore(game.score);

          if (game.score > game.bestScore) {
            game.bestScore = game.score;
            setBestScore(game.bestScore);
            try {
              localStorage.setItem(BEST_KEY, String(game.bestScore));
            } catch {
              // ignore
            }
          }
        }
      }
    }

    drawScene(ctx, game);

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    lastTimeRef.current = null;
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tap / click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tap = (e: Event) => {
      e.preventDefault();
      handleTap();
    };

    canvas.addEventListener("click", tap);
    canvas.addEventListener("touchstart", tap);

    return () => {
      canvas.removeEventListener("click", tap);
      canvas.removeEventListener("touchstart", tap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // пауза при приховуванні
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      } else {
        if (!animationRef.current) {
          lastTimeRef.current = null;
          animationRef.current = requestAnimationFrame(gameLoop);
        }
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        fontFamily: "Courier New, monospace",
      }}
    >
      {/* CANVAS НА ВЕСЬ ЕКРАН */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          display: "block",
        }}
      />

      {/* SCORE / BEST ЗВЕРХУ */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#fff",
          fontSize: 14,
          background: "rgba(0,0,0,0.35)",
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        Score: {score} · Best: {bestScore}
      </div>

      {/* ДВІ КНОПКИ ПІСЛЯ ПРОГРАШУ */}
      {gameOver && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 10,
            padding: "0 16px",
            width: "100%",
            maxWidth: 420,
            boxSizing: "border-box",
            justifyContent: "center",
          }}
        >
          <button
            onClick={startNewGame}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: "#28a745",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            🔁 Рестарт
          </button>
          <button
            onClick={onExit}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: "#444",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ⬅ В меню
          </button>
        </div>
      )}
    </div>
  );
}
