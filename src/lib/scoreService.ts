// src/lib/scoreService.ts
import { supabase } from "./supabaseClient";

export type GameId =
  | "runner"
  | "tetris"
  | "snake"
  | "pong"
  | "flappy"
  | "memory"
  | "2048"
  | "breakout"
  | "pacman"
  | "space-invaders";

export interface SubmitScoreParams {
  telegramId?: string;
  username?: string | null;
  gameId: GameId;
  score: number;
}

export async function submitScore(params: SubmitScoreParams) {
  const { telegramId, username, gameId, score } = params;

  const { error } = await supabase.from("leaderboard").insert({
    telegram_id: telegramId ?? null,
    username: username ?? null,
    game_id: gameId,
    score,
  });

  if (error) {
    console.error("Error submitting score:", error);
    throw error;
  }
}

export async function fetchLeaderboard(gameId: GameId) {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, username, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }

  return data ?? [];
}
