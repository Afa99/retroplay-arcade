import { Merge2048 } from "../games/merge/Merge2048";

interface MergeScreenProps {
  onExitToMenu: () => void;
  onGameOver: (sessionScore: number) => void;
}

export function MergeScreen({ onExitToMenu, onGameOver }: MergeScreenProps) {
  return <Merge2048 onExit={onExitToMenu} onGameOver={onGameOver} />;
}
