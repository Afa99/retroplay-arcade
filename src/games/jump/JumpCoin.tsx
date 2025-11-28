import { useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../flappy/utils";

interface JumpCoinProps {
  onExit: () => void;
  onGameOver?: (score: number) => void;
}

interface Player {
  x: number;
  y: number;
  vy: number;
  radius: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  used: boolean; // чи вже давала очки
}

interface JumpState {
  player: Player;
  platforms: Platform[];
  score: number;
  bestScore: number;
  isRunning: boolean;
  gameOver: boolean;
}

const GRAVITY = 0.35;
const JUMP_VELOCITY = -9; // сила стрибка
const PLATFORM_GAP = 65; // відстань між платформами
const PLATFORM_HEIGHT = 10;
const PLATFORM_MIN_WIDTH = 55;
const PLATFORM_MAX_WIDTH = 95;
const PLATFORM_COUNT = 9;

const BEST_KEY = "jumpCoinBestScore";

// рандом в діапазоні
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createInitialState(): JumpState {
  const platforms: Platform[] = [];

  const baseY = CANVAS_HEIGHT - 40;

  for (let i = 0; i < PLATFORM_COUNT; i++) {
    const y = baseY - i * PLATFORM_GAP;
    const width = rand(PLATFORM_MIN_WIDTH, PLATFORM_MAX_WIDTH);
    const x = rand(10, CANVAS_WIDTH - width - 10);

    platforms.push({
      x,
      y,
      width,
      height: PLATFORM_HEIGHT,
      used: i === 0, // нижня платформа не дає очків
    });
  }

  const startPlatform = platforms[0];

  const player: Player = {
    x: startPlatform.x + startPlatform.width / 2,
    y: startPlatform.y - 18,
    vy: 0,
    radius: 12,
  };

  return {
    player,
    platforms,
    score: 0,
    bestScore: 0,
    isRunning: false,
    gameOver: false,
  };
}

export function JumpCoin({ onExit, onGameOver }: JumpCoinProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const stateRef = useRef<JumpState>(createInitialState());

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [, setGameOver] = useState(false);

  // завантажуємо bestScore
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BEST_KEY);
      if (saved) {
        const val = Number(saved);
        if (!Number.isNaN(val)) {
          stateRef.current.bestScore = val;
          setBestScore(val);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const restartGame = () => {
    const prevBest = stateRef.current.bestScore;
    const nextState = createInitialState();
    nextState.bestScore = prevBest;
    stateRef.current = nextState;

    setScore(0);
    setGameOver(false);
    setBestScore(prevBest);
  };

  const endGame = () => {
    const state = stateRef.current;
    if (state.gameOver) return;

    state.gameOver = true;
    state.isRunning = false;
    setGameOver(true);

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      setBestScore(state.bestScore);
      try {
        localStorage.setItem(BEST_KEY, String(state.bestScore));
      } catch {
        // ignore
      }
    }

    if (onGameOver) {
      onGameOver(state.score);
    }
  };

  const handleTap = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const x = clientX - rect.left;
    const center = rect.width / 2;

    const state = stateRef.current;

    // якщо гра закінчилась — tap = рестарт
    if (state.gameOver) {
      restartGame();
      return;
    }

    // перший tap → старт
    if (!state.isRunning) {
      state.isRunning = true;
      state.player.vy = JUMP_VELOCITY;
      return;
    }

    // керування: tap зліва/справа → стрибки по x
    const shift = 42; // пікселів вліво/вправо
    if (x < center) {
      state.player.x -= shift;
    } else {
      state.player.x += shift;
    }

    // wrap по краям
    if (state.player.x < -state.player.radius) {
      state.player.x = CANVAS_WIDTH + state.player.radius;
    }
    if (state.player.x > CANVAS_WIDTH + state.player.radius) {
      state.player.x = -state.player.radius;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, state: JumpState) => {
    ctx.imageSmoothingEnabled = false;

    // фон
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#050712");
    gradient.addColorStop(1, "#02030a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // платформи
    ctx.fillStyle = "#35d07f";
    for (const p of state.platforms) {
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }

    // гравець — монетка
    ctx.beginPath();
    ctx.arc(
      state.player.x,
      state.player.y,
      state.player.radius,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#ffd84a";
    ctx.fill();
    ctx.strokeStyle = "#8c6a00";
    ctx.stroke();
    ctx.closePath();

    // ₿
    ctx.fillStyle = "#663300";
    ctx.font = "13px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("₿", state.player.x, state.player.y + 2);

    // текст підказок / game over
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "15px Courier New";

    if (!state.isRunning && !state.gameOver) {
      ctx.fillText(
        "Tap to start",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 10
      );
      ctx.font = "11px Courier New";
      ctx.fillText(
        "Tap left/right to move",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 12
      );
    }

    if (state.gameOver) {
      ctx.fillStyle = "#ff7777";
      ctx.font = "18px Courier New";
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = "13px Courier New";
      ctx.fillText(
        "Tap to restart",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 14
      );
    }
  };

  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;

    const last = lastTimeRef.current ?? timestamp;
    let delta = (timestamp - last) / (1000 / 60);
    if (delta > 2) delta = 2;
    lastTimeRef.current = timestamp;

    if (state.isRunning && !state.gameOver) {
      const player = state.player;

      const prevY = player.y;

      // фізика
      player.vy += GRAVITY * delta;
      player.y += player.vy * delta;

      // прокрутка світу вгору (ефект endless jump)
      if (player.y < CANVAS_HEIGHT * 0.4 && player.vy < 0) {
        const shift = CANVAS_HEIGHT * 0.4 - player.y;
        player.y = CANVAS_HEIGHT * 0.4;

        for (const p of state.platforms) {
          p.y += shift;
        }
      }

      // wrap по x
      if (player.x < -player.radius) {
        player.x = CANVAS_WIDTH + player.radius;
      }
      if (player.x > CANVAS_WIDTH + player.radius) {
        player.x = -player.radius;
      }

      // падіння вниз — програш
      if (player.y - player.radius > CANVAS_HEIGHT) {
        endGame();
      }

      // колізії з платформами (тільки коли падаємо)
      if (player.vy > 0) {
        const currBottom = player.y + player.radius;
        const prevBottom = prevY + player.radius;

        for (const p of state.platforms) {
          const withinX =
            player.x > p.x - player.radius &&
            player.x < p.x + p.width + player.radius;

          const crossedPlatform =
            prevBottom <= p.y && currBottom >= p.y;

          if (withinX && crossedPlatform) {
            // приземлились
            player.y = p.y - player.radius;
            player.vy = JUMP_VELOCITY;

            if (!p.used) {
              p.used = true;
              state.score += 1;
              setScore(state.score);
              if (state.score > state.bestScore) {
                state.bestScore = state.score;
                setBestScore(state.bestScore);
                try {
                  localStorage.setItem(
                    BEST_KEY,
                    String(state.bestScore)
                  );
                } catch {
                  // ignore
                }
              }
            }
            break;
          }
        }
      }

      // чистимо та додаємо платформи
      state.platforms = state.platforms.filter(
        (p) => p.y < CANVAS_HEIGHT + 30
      );

      while (state.platforms.length < PLATFORM_COUNT) {
        const topMostY = state.platforms.reduce(
          (min, p) => (p.y < min ? p.y : min),
          CANVAS_HEIGHT
        );
        const y = topMostY - PLATFORM_GAP;
        const width = rand(PLATFORM_MIN_WIDTH, PLATFORM_MAX_WIDTH);
        const x = rand(10, CANVAS_WIDTH - width - 10);

        state.platforms.push({
          x,
          y,
          width,
          height: PLATFORM_HEIGHT,
          used: false,
        });
      }
    }

    draw(ctx, state);

    animationRef.current = requestAnimationFrame(gameLoop);
  };

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tapHandler = (e: Event) => {
      handleTap(e as MouseEvent | TouchEvent);
    };

    canvas.addEventListener("click", tapHandler);
    canvas.addEventListener("touchstart", tapHandler, { passive: false });

    return () => {
      canvas.removeEventListener("click", tapHandler);
      canvas.removeEventListener("touchstart", tapHandler);
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
          background: "rgba(0,0,0,0.4)",
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

      {/* КНОПКА виходу в меню */}
      <button
        onClick={onExit}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          padding: "6px 10px",
          borderRadius: 999,
          border: "none",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        ⬅ Menu
      </button>
    </div>
  );
}
