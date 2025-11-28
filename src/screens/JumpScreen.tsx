import { JumpCoin } from "../games/jump/JumpCoin";

interface JumpScreenProps {
  onExitToMenu: () => void;
  onGameOver: (sessionScore: number) => void;
}

export function JumpScreen({ onExitToMenu, onGameOver }: JumpScreenProps) {
  return <JumpCoin onExit={onExitToMenu} onGameOver={onGameOver} />;
}
