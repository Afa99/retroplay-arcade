// Розміри канвасу: менші на мобілці, більші на десктопі
export const CANVAS_WIDTH =
  typeof window !== "undefined" && window.innerWidth < 500 ? 240 : 380;

export const CANVAS_HEIGHT =
  typeof window !== "undefined" && window.innerHeight < 700 ? 350 : 520;

// Типи
export interface Bird {
  x: number;
  y: number;
  radius: number;
  velocity: number;
}

export interface Pipe {
  x: number;
  width: number;
  gapY: number;
  gapHeight: number;
  passed: boolean;
}

export interface GameState {
  bird: Bird;
  pipes: Pipe[];
  score: number;
  bestScore: number;
  isRunning: boolean;
  gameOver: boolean;
}

// Початковий стан гри
export function createInitialState(): GameState {
  return {
    bird: {
      x: CANVAS_WIDTH / 3,
      y: CANVAS_HEIGHT / 2,
      radius: 14,
      velocity: 0,
    },
    pipes: [createPipe()],
    score: 0,
    bestScore: 0,
    isRunning: false,
    gameOver: false,
  };
}

// Легкі труби: БІЛЬШИЙ ПРОХІД = простіше грати
export function createPipe(): Pipe {
  // було 80 / 110 → робимо ширший прохід
  const gapHeight = CANVAS_HEIGHT < 400 ? 110 : 140;

  return {
    x: CANVAS_WIDTH,
    width: 40,
    gapY: Math.random() * (CANVAS_HEIGHT - gapHeight),
    gapHeight,
    passed: false,
  };
}

// Перевірка зіткнення
export function checkCollision(bird: Bird, pipe: Pipe): boolean {
  if (
    bird.x + bird.radius > pipe.x &&
    bird.x - bird.radius < pipe.x + pipe.width
  ) {
    if (bird.y - bird.radius < pipe.gapY) return true;
    if (bird.y + bird.radius > pipe.gapY + pipe.gapHeight) return true;
  }
  return false;
}

// Рестарт гри, зберігаємо bestScore
export function resetGame(state: GameState): GameState {
  const newState = createInitialState();
  newState.bestScore = state.bestScore;
  return newState;
}
