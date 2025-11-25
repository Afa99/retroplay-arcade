import { supabase } from "../lib/supabaseClient";
import WebApp from "@twa-dev/sdk";

export interface BackendProfile {
  xp: number;
  total_games: number;
  total_score: number;
}

/**
 * Синхронізація Telegram-користувача з таблицями users + profiles.
 */
export async function syncUserWithBackend(params: {
  telegramId: string;
  name: string;
}): Promise<{ userId: number; profile: BackendProfile }> {
  const { telegramId, name } = params;

  const tgUser = WebApp.initDataUnsafe?.user;

  const username = tgUser?.username ?? name ?? "Player";
  const first_name = tgUser?.first_name ?? null;
  const last_name = tgUser?.last_name ?? null;

  // 1) upsert у users
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        telegram_id: telegramId,
        username,
        first_name,
        last_name,
      },
      { onConflict: "telegram_id" }
    )
    .select("id")
    .single();

  if (userError || !userRow) {
    console.error("syncUserWithBackend users error:", userError);
    // хай хоч застосунок лишається живим
    return {
      userId: 0,
      profile: { xp: 0, total_games: 0, total_score: 0 },
    };
  }

  const userId = Number(userRow.id);

  // 2) гарантуємо, що профіль існує
  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert({ user_id: userId }, { onConflict: "user_id" });

  if (profileUpsertError) {
    console.error(
      "syncUserWithBackend profiles upsert error:",
      profileUpsertError
    );
  }

  // 3) читаємо профіль
  const { data: profileRow, error: profileSelectError } = await supabase
    .from("profiles")
    .select("xp,total_games,total_score")
    .eq("user_id", userId)
    .single();

  if (profileSelectError || !profileRow) {
    console.error(
      "syncUserWithBackend profiles select error:",
      profileSelectError
    );
    return {
      userId,
      profile: { xp: 0, total_games: 0, total_score: 0 },
    };
  }

  return {
    userId,
    profile: {
      xp: Number(profileRow.xp ?? 0),
      total_games: Number(profileRow.total_games ?? 0),
      total_score: Number(profileRow.total_score ?? 0),
    },
  };
}

/**
 * Запис результату по грі + оновлення XP.
 * Працює для будь-якої гри з певним gameKey (наприклад 'flappy_coin').
 */
export async function submitFlappyScoreToBackend(params: {
  userId: number;
  score: number;
  xpDelta: number;
  gameKey: string;
}): Promise<BackendProfile | null> {
  const { userId, score, xpDelta, gameKey } = params;

  if (!userId || userId <= 0) {
    // немає валідного юзера в базі
    return null;
  }

  // 1) читаємо попередній рекорд
  const { data: existing, error: selectError } = await supabase
    .from("game_scores")
    .select("id,best_score")
    .eq("user_id", userId)
    .eq("game_key", gameKey)
    .maybeSingle();

  if (selectError) {
    console.error("submitFlappyScoreToBackend select error:", selectError);
  }

  const bestScore = existing
    ? Math.max(Number(existing.best_score ?? 0), score)
    : score;

  // 2) upsert у game_scores
  const payload: {
    id?: number;
    user_id: number;
    game_key: string;
    last_score: number;
    best_score: number;
  } = {
    user_id: userId,
    game_key: gameKey,
    last_score: score,
    best_score: bestScore,
  };

  if (existing?.id) {
    payload.id = existing.id;
  }

  const { error: upsertError } = await supabase
    .from("game_scores")
    .upsert(payload, { onConflict: "user_id,game_key" });

  if (upsertError) {
    console.error("submitFlappyScoreToBackend upsert error:", upsertError);
  }

  // 3) оновлюємо XP та статистику через RPC
  if (xpDelta > 0) {
    const { error: rpcError } = await supabase.rpc("increment_profile_stats", {
      p_user_id: userId,
      p_xp_delta: xpDelta,
      p_score_delta: score,
    });

    if (rpcError) {
      console.error("submitFlappyScoreToBackend rpc error:", rpcError);
    }
  }

  // 4) повертаємо оновлений профіль
  const { data: profileRow, error: profileSelectError } = await supabase
    .from("profiles")
    .select("xp,total_games,total_score")
    .eq("user_id", userId)
    .single();

  if (profileSelectError || !profileRow) {
    console.error(
      "submitFlappyScoreToBackend profile select error:",
      profileSelectError
    );
    return null;
  }

  return {
    xp: Number(profileRow.xp ?? 0),
    total_games: Number(profileRow.total_games ?? 0),
    total_score: Number(profileRow.total_score ?? 0),
  };
}
