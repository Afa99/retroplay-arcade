import { Flappy } from "../games/flappy/Flappy";

interface FlappyScreenProps {
  onExitToMenu: () => void;
  onGameOver: (sessionScore: number) => void;
}

export function FlappyScreen({ onExitToMenu, onGameOver }: FlappyScreenProps) {
  return <Flappy onExit={onExitToMenu} onGameOver={onGameOver} />;
}
