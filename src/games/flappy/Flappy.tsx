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

// 🔧 ФІЗИКА — трішки легше для Telegram
// Було: GRAVITY = 0.42; JUMP_FORCE = -8.5
const GRAVITY = 0.32;
const JUMP_FORCE = -9; // слабший стрибок ~ -10%
const PIPE_SPEED = 1.8;

const BEST_KEY = "flappyBestScore";

export function Flappy({ onExit, onGameOver }: FlappyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const gameRef = useRef<GameState>(createInitialState());

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Завантажуємо bestScore з localStorage
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
    } catch {}
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

    if (onGameOver) {
      console.log("[Flappy] onGameOver → score:", game.score);
      onGameOver(game.score);
    }
  };

  const drawScene = (ctx: CanvasRenderingContext2D, game: GameState) => {
    ctx.imageSmoothingEnabled = false;

    // фон
    ctx.fillStyle = "#02040a";
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

    // монетка-пташка
    ctx.beginPath();
    ctx.arc(game.bird.x, game.bird.y, game.bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd84a";
    ctx.fill();
    ctx.strokeStyle = "#8c6a00";
    ctx.stroke();
    ctx.closePath();

    // ₿ на монетці
    ctx.fillStyle = "#663300";
    ctx.font = "13px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("₿", game.bird.x, game.bird.y + 1);

    // початок / рестарт
    ctx.fillStyle = "#fff";
    ctx.font = "16px Courier New";

    if (!game.isRunning && !game.gameOver) {
      ctx.fillText("Tap to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    if (game.gameOver) {
      ctx.fillStyle = "#ff6666";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillStyle = "#fff";
      ctx.fillText("Tap to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
  };

  // Основний геймлуп
  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = gameRef.current;

    const last = lastTimeRef.current ?? timestamp;
    let delta = (timestamp - last) / (1000 / 60); // нормалізація до FPS
    if (delta > 2) delta = 2;
    lastTimeRef.current = timestamp;

    if (game.isRunning && !game.gameOver) {
      // фізика
      game.bird.velocity += GRAVITY * delta;
      game.bird.y += game.bird.velocity * delta;

      // зіткнення з землею/стелею
      if (game.bird.y + game.bird.radius >= CANVAS_HEIGHT) {
        game.bird.y = CANVAS_HEIGHT - game.bird.radius;
        endGame();
      }
      if (game.bird.y - game.bird.radius <= 0) {
        game.bird.y = game.bird.radius;
        endGame();
      }

      // рух труб
      for (let pipe of game.pipes) {
        pipe.x -= PIPE_SPEED * delta;
      }

      // нові труби
      if (game.pipes[0].x + game.pipes[0].width < 0) {
        game.pipes.shift();
        game.pipes.push(createPipe());
      }

      // колізії + рахунок
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
            } catch {}
          }
        }
      }
    }

    drawScene(ctx, game);

    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Ініціалізація канвасу + старт циклу
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
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
        }}
      />

      {/* SCORE BAR */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.35)",
          padding: "6px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          fontSize: 14,
          fontFamily: "Courier New",
        }}
      >
        Score: {score} · Best: {bestScore}
      </div>

      {/* КНОПКИ після програшу */}
      {gameOver && (
        <div
          style={{
            position: "absolute",
            bottom: 25,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 12,
            width: "90%",
            maxWidth: 420,
          }}
        >
          <button
            onClick={startNewGame}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 999,
              border: "none",
              background: "#2ecc71",
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            🔁 Restart
          </button>

          <button
            onClick={onExit}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 999,
              border: "none",
              background: "#555",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            ⬅ Menu
          </button>
        </div>
      )}
    </div>
  );
}
