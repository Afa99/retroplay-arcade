import { useEffect, useRef, useState } from "react";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  createInitialState,
  createPipe,
  resetGame,
  checkCollision,
} from "./utils";
import type { GameState } from "./types";

interface FlappyProps {
  onExit: () => void;
  onGameOver?: (sessionScore: number) => void;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -9;
const PIPE_SPEED = 2.4;
const BEST_KEY = "flappyBestScore";

export function Flappy({ onExit, onGameOver }: FlappyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const gameRef = useRef<GameState>(createInitialState());

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // завантажуємо bestScore з localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(BEST_KEY);
        if (saved) {
          const val = Number(saved);
          if (!Number.isNaN(val) && val > 0) {
            setBestScore(val);
            gameRef.current.bestScore = val;
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // TAP по canvas: старт / стрибок / рестарт
  const handleTap = () => {
    const game = gameRef.current;

    // якщо гра закінчена – повний restart + миттєвий старт
    if (game.gameOver) {
      const restarted = resetGame(game);
      restarted.isRunning = true;
      restarted.bird.velocity = JUMP_FORCE;

      gameRef.current = restarted;

      setScore(restarted.score);
      setBestScore(restarted.bestScore);
      setGameOver(false);
      setIsRunning(true);
      return;
    }

    // якщо ще не стартували – запускаємо гру
    if (!game.isRunning) {
      game.isRunning = true;
      setIsRunning(true);
    }

    // стрибок
    game.bird.velocity = JUMP_FORCE;
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = gameRef.current;

    // фон
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#060821");
    gradient.addColorStop(1, "#020308");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // зорі
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    for (let i = 0; i < 25; i++) {
      const x = (i * 57) % CANVAS_WIDTH;
      const y = (i * 103) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }

    const active = game.isRunning && !game.gameOver;

    if (active) {
      // фізика монетки
      game.bird.velocity += GRAVITY;
      game.bird.y += game.bird.velocity;

      // межі
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
        pipe.x -= PIPE_SPEED;
      }

      // додаємо нові труби
      if (game.pipes.length > 0 && game.pipes[0].x + game.pipes[0].width < 0) {
        game.pipes.shift();
        game.pipes.push(createPipe());
      }

      // зіткнення + рахунок
      for (let pipe of game.pipes) {
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

            if (typeof window !== "undefined") {
              try {
                window.localStorage.setItem(BEST_KEY, String(game.bestScore));
              } catch {
                // ignore
              }
            }
          }
        }
      }
    }

    // малюємо труби + монету + HUD
    drawScene(ctx, game);

    // цикл завжди крутиться
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = () => {
    const game = gameRef.current;

    if (game.gameOver) return; // захист

    game.gameOver = true;
    game.isRunning = false;

    setGameOver(true);
    setIsRunning(false);

    if (onGameOver) {
      onGameOver(game.score);
    }
  };

  const drawScene = (ctx: CanvasRenderingContext2D, game: GameState) => {
    // труби
    for (const pipe of game.pipes) {
      const pipeGradient = ctx.createLinearGradient(
        pipe.x,
        0,
        pipe.x + pipe.width,
        0
      );
      pipeGradient.addColorStop(0, "#02ff7b");
      pipeGradient.addColorStop(1, "#00b24f");

      ctx.fillStyle = pipeGradient;
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapY);
      ctx.fillRect(
        pipe.x,
        pipe.gapY + pipe.gapHeight,
        pipe.width,
        CANVAS_HEIGHT - (pipe.gapY + pipe.gapHeight)
      );
    }

    // монетка
    ctx.save();
    ctx.beginPath();
    ctx.arc(game.bird.x, game.bird.y, game.bird.radius, 0, Math.PI * 2);
    const coinGradient = ctx.createRadialGradient(
      game.bird.x - 4,
      game.bird.y - 4,
      4,
      game.bird.x,
      game.bird.y,
      game.bird.radius
    );
    coinGradient.addColorStop(0, "#fff5b0");
    coinGradient.addColorStop(0.5, "#ffd84a");
    coinGradient.addColorStop(1, "#f5b800");
    ctx.fillStyle = coinGradient;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b8860b";
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = "#7a4b00";
    ctx.font = "14px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₿", game.bird.x, game.bird.y + 1);
    ctx.restore();

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "20px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${game.score}`, 16, 32);
    ctx.fillText(`Best: ${game.bestScore}`, 16, 56);

    ctx.textAlign = "center";
    if (!game.isRunning && !game.gameOver) {
      ctx.font = "18px Courier New";
      ctx.fillText("Tap to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
    if (game.gameOver) {
      ctx.font = "22px Courier New";
      ctx.fillStyle = "#ff6666";
      ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.font = "16px Courier New";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Tap to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = () => {
      handleTap();
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleClick);

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "Courier New",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: 380,
          padding: "8px 16px",
        }}
      >
        <button
          onClick={onExit}
          style={{
            padding: "6px 12px",
            background: "#444",
            color: "#fff",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          ⬅ Back
        </button>
        <div style={{ fontSize: 14, opacity: 0.8 }}>Flappy Coin</div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 12,
          border: "2px solid #333",
          maxWidth: "100%",
        }}
      />

      <div
        style={{
          fontSize: 14,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        Score: <b>{score}</b> · Best: <b>{bestScore}</b>{" "}
        {gameOver && <span style={{ color: "#ff6666" }}>· Game over</span>}
        {!isRunning && !gameOver && <span> · Tap canvas to start</span>}
      </div>
    </div>
  );
}
