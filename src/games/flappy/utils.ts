import type { Bird, Pipe, GameState } from "./types";


export const CANVAS_WIDTH = 360;
export const CANVAS_HEIGHT = 640;

export function createInitialBird(): Bird {
  return {
    x: CANVAS_WIDTH / 4,
    y: CANVAS_HEIGHT / 2,
    radius: 14,
    velocity: 0,
  };
}

export function createPipe(startX?: number): Pipe {
  const gapHeight = 150;
  const minGapY = 80;
  const maxGapY = CANVAS_HEIGHT - 80 - gapHeight;
  const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

  return {
    x: startX ?? CANVAS_WIDTH,
    width: 60,
    gapY,
    gapHeight,
    passed: false,
  };
}

export function createInitialState(): GameState {
  return {
    bird: createInitialBird(),
    pipes: [createPipe(CANVAS_WIDTH + 100), createPipe(CANVAS_WIDTH + 320)],
    score: 0,
    bestScore: 0,
    isRunning: false,
    gameOver: false,
  };
}

export function resetGame(state: GameState): GameState {
  const bestScore = state.bestScore;
  const newState = createInitialState();
  newState.bestScore = bestScore;
  return newState;
}

export function checkCollision(bird: Bird, pipe: Pipe): boolean {
  // зіткнення із землею/стелею буде окремо
  const birdLeft = bird.x - bird.radius;
  const birdRight = bird.x + bird.radius;
  const birdTop = bird.y - bird.radius;
  const birdBottom = bird.y + bird.radius;

  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + pipe.width;

  // якщо не перетинаємося по X – зіткнення немає
  if (birdRight < pipeLeft || birdLeft > pipeRight) {
    return false;
  }

  const gapTop = pipe.gapY;
  const gapBottom = pipe.gapY + pipe.gapHeight;

  // якщо пташка ВИХОДИТЬ за межі gap – то зіткнення
  if (birdTop < gapTop || birdBottom > gapBottom) {
    return true;
  }

  return false;
}
