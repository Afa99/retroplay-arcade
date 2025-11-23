const KEY = "retroplay_leaderboard_v1";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  gameKey: string; // наприклад "flappy_coin"
  score: number;   // найкращий результат
  updatedAt: string; // ISO дата останнього оновлення
}

// зчитати всі записи з localStorage
function loadAll(): LeaderboardEntry[] {
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

// зберегти всі записи
function saveAll(entries: LeaderboardEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

// лідерборд для конкретної гри
export function loadLeaderboardForGame(gameKey: string): LeaderboardEntry[] {
  const all = loadAll();
  return all
    .filter((e) => e.gameKey === gameKey)
    .sort((a, b) => b.score - a.score);
}

// додаємо результат для гри
// ❗ Зберігається тільки НАЙВИЩИЙ score для (userId + gameKey)
export function addScoreToLeaderboard(
  userId: string,
  name: string,
  gameKey: string,
  score: number
): LeaderboardEntry[] {
  if (score <= 0) return loadLeaderboardForGame(gameKey);

  const nowIso = new Date().toISOString();
  const all = loadAll();

  const idx = all.findIndex(
    (e) => e.userId === userId && e.gameKey === gameKey
  );

  if (idx >= 0) {
    // вже є запис для цього юзера в цій грі
    if (score > all[idx].score) {
      // оновлюємо тільки якщо новий score кращий
      all[idx] = {
        ...all[idx],
        score,
        name,
        updatedAt: nowIso,
      };
    } else if (all[idx].name !== name) {
      // якщо імʼя змінилось (наприклад, ти поміняв username)
      all[idx] = {
        ...all[idx],
        name,
      };
    }
  } else {
    // нового юзера додаємо
    all.push({
      userId,
      name,
      gameKey,
      score,
      updatedAt: nowIso,
    });
  }

  // підчищаємо: для кожної гри лишаємо топ-100
  const byGame: Record<string, LeaderboardEntry[]> = {};
  for (const entry of all) {
    if (!byGame[entry.gameKey]) byGame[entry.gameKey] = [];
    byGame[entry.gameKey].push(entry);
  }

  const trimmedAll: LeaderboardEntry[] = [];
  const MAX_PER_GAME = 100;

  for (const key of Object.keys(byGame)) {
    const sorted = byGame[key].sort((a, b) => b.score - a.score);
    trimmedAll.push(...sorted.slice(0, MAX_PER_GAME));
  }

  saveAll(trimmedAll);

  return loadLeaderboardForGame(gameKey);
}
