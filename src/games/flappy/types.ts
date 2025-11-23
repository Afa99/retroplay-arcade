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
  passed: boolean; // чи пролетів пташку (для нарахування score)
}

export interface GameState {
  bird: Bird;
  pipes: Pipe[];
  score: number;
  bestScore: number;
  isRunning: boolean;
  gameOver: boolean;
}
