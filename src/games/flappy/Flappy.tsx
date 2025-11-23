import { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  createPipe,
  resetGame,
  checkCollision,
} from "./utils";
import type { GameState } from "./utils";

interface FlappyProps {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

const GRAVITY = 0.8;
const JUMP_FORCE = -10.5;
const PIPE_SPEED = 3.5;

const BEST_KEY = "flappyBestScore";

export function Flappy({ onExit, onGameOver }: FlappyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>(createInitialState());

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Завантажуємо найкращий результат з localStorage
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
      // якщо localStorage недоступний — пропускаємо
    }
  }, []);

  const handleTap = () => {
    const game = gameRef.current;

    // Якщо гра закінчена — тап = повний рестарт
    if (game.gameOver) {
      const restarted = resetGame(game);
      restarted.isRunning = true;
      restarted.bird.velocity = JUMP_FORCE;
      gameRef.current = restarted;

      setScore(0);
      setGameOver(false);
      return;
    }

    // Перший старт
    if (!game.isRunning) {
      game.isRunning = true;
    }

    // Стрибок
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

    // Простий фон — максимально легкий для мобілок
    ctx.fillStyle = "#03050f";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Труби (однотонні, без важких градієнтів)
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

    // Монетка (гравець)
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

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "16px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${game.score}`, 10, 24);
    ctx.fillText(`Best: ${game.bestScore}`, 10, 44);

    ctx.textAlign = "center";
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

  // ⚡ Без обмеження FPS — повний requestAnimationFrame
  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = gameRef.current;

    if (game.isRunning && !game.gameOver) {
      // Фізика
      game.bird.velocity += GRAVITY;
      game.bird.y += game.bird.velocity;

      if (game.bird.y + game.bird.radius >= CANVAS_HEIGHT) endGame();
      if (game.bird.y - game.bird.radius <= 0) endGame();

      // Труби
      for (let pipe of game.pipes) {
        pipe.x -= PIPE_SPEED;
      }

      if (game.pipes[0].x + game.pipes[0].width < 0) {
        game.pipes.shift();
        game.pipes.push(createPipe());
      }

      for (const pipe of game.pipes) {
        if (checkCollision(game.bird, pipe)) endGame();

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

  // Ініціалізація canvas + старт циклу
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Кліки / тапи по canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tap = () => handleTap();

    canvas.addEventListener("click", tap);
    canvas.addEventListener("touchstart", tap);

    return () => {
      canvas.removeEventListener("click", tap);
      canvas.removeEventListener("touchstart", tap);
    };
  }, []);

  // Пауза, коли webview / вкладка сховані
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      } else {
        animationRef.current = requestAnimationFrame(gameLoop);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 0",
        fontFamily: "Courier New",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 12,
          border: "2px solid #333",
          maxWidth: "100%",
          touchAction: "none",
        }}
      />

      <div style={{ color: "#fff", fontSize: 14 }}>
        Score: {score} | Best: {bestScore} {gameOver ? "· Game over" : ""}
      </div>

      <button
        onClick={onExit}
        style={{
          padding: "8px 16px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "#444",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ⬅ Вийти в меню
      </button>
    </div>
  );
}
