import { supabase } from "../lib/supabaseClient";
import WebApp from "@twa-dev/sdk";

export interface BackendProfile {
  xp: number;
  total_games: number;
  total_score: number;
}

/**
 * Стягуємо/створюємо user + profile.
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

  console.log("[backend] syncUserWithBackend start", {
    telegramId,
    username,
    first_name,
    last_name,
  });

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
    console.error("[backend] users upsert error:", userError);
    return {
      userId: 0,
      profile: { xp: 0, total_games: 0, total_score: 0 },
    };
  }

  const userId = Number(userRow.id);
  console.log("[backend] userId:", userId);

  // 2) читаємо профіль
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("xp,total_games,total_score")
    .eq("user_id", userId)
    .maybeSingle();

  let profile: BackendProfile = {
    xp: 0,
    total_games: 0,
    total_score: 0,
  };

  if (profileError) {
    console.error("[backend] profiles select error:", profileError);
  }

  if (profileRow) {
    profile = {
      xp: Number(profileRow.xp ?? 0),
      total_games: Number(profileRow.total_games ?? 0),
      total_score: Number(profileRow.total_score ?? 0),
    };
  } else {
    // якщо профіля нема — створюємо
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, xp: 0, total_games: 0, total_score: 0 })
      .select("xp,total_games,total_score")
      .single();

    if (insertError || !inserted) {
      console.error("[backend] profiles insert error:", insertError);
    } else {
      profile = {
        xp: Number(inserted.xp ?? 0),
        total_games: Number(inserted.total_games ?? 0),
        total_score: Number(inserted.total_score ?? 0),
      };
    }
  }

  console.log("[backend] profile loaded:", profile);

  return {
    userId,
    profile,
  };
}

/**
 * Записуємо результат по грі + оновлюємо профіль (xp, total_games, total_score).
 */
export async function submitFlappyScoreToBackend(params: {
  userId: number;
  score: number;
  xpDelta: number;
  gameKey: string;
}): Promise<BackendProfile | null> {
  const { userId, score, xpDelta, gameKey } = params;

  console.log("[backend] submitFlappyScoreToBackend start:", {
    userId,
    score,
    xpDelta,
    gameKey,
  });

  if (!userId || userId <= 0) {
    console.warn("[backend] invalid userId, skip");
    return null;
  }

  // 1) читаємо поточний профіль
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("xp,total_games,total_score")
    .eq("user_id", userId)
    .maybeSingle();

  let currentXp = 0;
  let currentGames = 0;
  let currentTotalScore = 0;

  if (profileError) {
    console.error("[backend] profiles select error:", profileError);
  }

  if (profileRow) {
    currentXp = Number(profileRow.xp ?? 0);
    currentGames = Number(profileRow.total_games ?? 0);
    currentTotalScore = Number(profileRow.total_score ?? 0);
  }

  const newProfile: BackendProfile = {
    xp: currentXp + xpDelta,
    total_games: currentGames + 1,
    total_score: currentTotalScore + score,
  };

  // 2) upsert профілю
  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        xp: newProfile.xp,
        total_games: newProfile.total_games,
        total_score: newProfile.total_score,
      },
      { onConflict: "user_id" }
    );

  if (profileUpsertError) {
    console.error("[backend] profiles upsert error:", profileUpsertError);
  } else {
    console.log("[backend] profiles upsert OK");
  }

  // 3) game_scores — best_score / last_score
   // 3) game_scores — best_score / last_score
  const { data: existingScoreRow, error: scoreSelectError } = await supabase
    .from("game_scores")
    .select("best_score")
    .eq("user_id", userId)
    .eq("game_key", gameKey)
    .maybeSingle();

  if (scoreSelectError) {
    console.error("[backend] game_scores select error:", scoreSelectError);
  }

  const bestScore = existingScoreRow
    ? Math.max(Number(existingScoreRow.best_score ?? 0), score)
    : score;

  const { error: scoreUpsertError } = await supabase
    .from("game_scores")
    .upsert(
      {
        user_id: userId,
        game_key: gameKey,
        last_score: score,
        best_score: bestScore,
      },
      { onConflict: "user_id,game_key" }
    );

  if (scoreUpsertError) {
    console.error("[backend] game_scores upsert error:", scoreUpsertError);
  } else {
    console.log("[backend] game_scores upsert OK");
  }

  console.log("[backend] profile after game:", newProfile);

  return newProfile;
}
