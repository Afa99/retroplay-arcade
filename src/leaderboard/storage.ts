const KEY = "retroplay_leaderboard_flappy";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  date: string; // ISO
}

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function addScoreToLeaderboard(
  userId: string,
  name: string,
  score: number
): LeaderboardEntry[] {
  if (score <= 0) return loadLeaderboard();

  const now: LeaderboardEntry = {
    userId,
    name,
    score,
    date: new Date().toISOString(),
  };

  const list = [...loadLeaderboard(), now];

  // сортуємо: найкращі зверху
  list.sort((a, b) => b.score - a.score);

  // залишаємо топ-20
  const trimmed = list.slice(0, 20);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }

  return trimmed;
}
