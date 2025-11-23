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

// Ці значення задумувались під ~60 FPS,
// але ми будемо масштабувати їх через deltaTime
const GRAVITY = 0.55;
const JUMP_FORCE = -9.5;
const PIPE_SPEED = 2.6;

const BEST_KEY = "flappyBestScore";

export function Flappy({ onExit, onGameOver }: FlappyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const gameRef = useRef<GameState>(createInitialState());

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // ✅ Завантажуємо bestScore з localStorage
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
      // якщо localStorage недоступний — ігноруємо
    }
  }, []);

  // 🔁 Старт нової гри (виклик з рестарту або з тапу по канвасу)
  const startNewGame = () => {
    const restarted = resetGame(gameRef.current);
    restarted.isRunning = true;
    restarted.bird.velocity = JUMP_FORCE;
    gameRef.current = restarted;

    setScore(0);
    setGameOver(false);
  };

  // 🕹️ Обробка тапу по канвасу
  const handleTap = () => {
    const game = gameRef.current;

    // Якщо гра вже закінчена — тап = рестарт гри
    if (game.gameOver) {
      startNewGame();
      return;
    }

    // Перший старт
    if (!game.isRunning) {
      game.isRunning = true;
    }

    // Стрибок
    game.bird.velocity = JUMP_FORCE;
  };

  // ❌ Кінець гри
  const endGame = () => {
    const game = gameRef.current;
    if (game.gameOver) return;

    game.gameOver = true;
    game.isRunning = false;
    setGameOver(true);

    if (onGameOver) onGameOver(game.score);
  };

  // 🎨 Малювання одного кадру
  const drawScene = (ctx: CanvasRenderingContext2D, game: GameState) => {
    ctx.imageSmoothingEnabled = false;

    // фон (простий, але на повний канвас)
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

    // монетка (player)
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
      ctx.fillText("Tap to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 22);
    }
  };

  // ⚙️ Головний цикл гри з deltaTime
  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = gameRef.current;

    // deltaTime в "кількості 60fps-кадрів"
    const last = lastTimeRef.current ?? timestamp;
    let delta = (timestamp - last) / (1000 / 60);
    if (delta > 2) delta = 2; // не даємо грі стрибати при фрізах
    lastTimeRef.current = timestamp;

    if (game.isRunning && !game.gameOver) {
      // фізика
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

      // труби
      for (let pipe of game.pipes) {
        pipe.x -= PIPE_SPEED * delta;
      }

      // нові труби
      if (game.pipes[0].x + game.pipes[0].width < 0) {
        game.pipes.shift();
        game.pipes.push(createPipe());
      }

      // колізії + набір очок
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

  // 🧱 Ініціалізація canvas + старт анімації
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

  // 🖱️/👆 Обробка кліків і тапів по canvas
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

  // ⏸ Пауза, коли webview / вкладка сховані
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
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "8px 0",
        fontFamily: "Courier New, monospace",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 12,
          border: "2px solid #333",
          width: "100%",          // розтягуємо на всю ширину екрану
          maxWidth: 420,
          height: "auto",
          touchAction: "none",
        }}
      />

      <div style={{ color: "#fff", fontSize: 14 }}>
        Score: {score} | Best: {bestScore} {gameOver ? "· Game over" : ""}
      </div>

      {/* 🔘 Після програшу: 2 кнопки — зліва Рестарт, справа Меню */}
      {gameOver && (
        <div
          style={{
            marginTop: 4,
            display: "flex",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            onClick={startNewGame}
            style={{
              flex: 1,
              maxWidth: 160,
              padding: "8px 14px",
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
              maxWidth: 160,
              padding: "8px 14px",
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
