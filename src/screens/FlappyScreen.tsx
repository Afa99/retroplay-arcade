import { Flappy } from "../games/flappy/Flappy";

interface FlappyScreenProps {
  onExitToMenu: () => void;
}

export function FlappyScreen({ onExitToMenu }: FlappyScreenProps) {
  return <Flappy onExit={onExitToMenu} />;
}
