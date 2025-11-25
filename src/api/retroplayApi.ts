import { supabase } from "../lib/supabaseClient";

export type TelegramUserInfo = {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

const FLAPPY_GAME_KEY = "flappy_coin";

export async function syncUser(user: TelegramUserInfo) {
  // 1. upsert у users
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .upsert(
      {
        telegram_id: user.telegramId,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
      },
      { onConflict: "telegram_id" }
    )
    .select("id")
    .single();

  if (userErr || !userRow) {
    console.error("syncUser error:", userErr);
    throw userErr;
  }

  const userId = userRow.id as number;

  // 2. створити профіль, якщо ще нема
  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
      },
      { onConflict: "user_id" }
    );

  if (profileErr) {
    console.error("profile upsert error:", profileErr);
    // не критично для гри, можемо не падати
  }

  return userId;
}

export async function submitFlappyScore(params: {
  userId: number;
  score: number;
}) {
  const { userId, score } = params;

  // 1. оновити game_scores (best_score, last_score)
  const { data: existing, error: getErr } = await supabase
    .from("game_scores")
    .select("id, best_score")
    .eq("user_id", userId)
    .eq("game_key", FLAPPY_GAME_KEY)
    .maybeSingle();

  if (getErr) {
    console.error("game_scores fetch error:", getErr);
  }

  let bestScore = score;

  if (existing) {
    bestScore = Math.max(existing.best_score ?? 0, score);
  }

  const { error: upsertErr } = await supabase.from("game_scores").upsert(
    {
      id: existing?.id,
      user_id: userId,
      game_key: FLAPPY_GAME_KEY,
      best_score: bestScore,
      last_score: score,
    },
    { onConflict: "user_id,game_key" }
  );

  if (upsertErr) {
    console.error("game_scores upsert error:", upsertErr);
  }

  // 2. оновити загальний профіль (xp, total_games, total_score)
  const xpEarned = score; // для старту: 1 XP = 1 point

  const { error: profileUpdateErr } = await supabase.rpc(
    "increment_profile_stats",
    {
      p_user_id: userId,
      p_xp_delta: xpEarned,
      p_score_delta: score,
    }
  );

  if (profileUpdateErr) {
    console.error("increment_profile_stats error:", profileUpdateErr);
  }

  return { bestScore };
}
