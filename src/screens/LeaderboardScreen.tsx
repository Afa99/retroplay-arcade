import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface LeaderboardEntry {
  telegramId: string;
  username: string | null;
  bestScore: number;
  lastScore: number;
}

interface LeaderboardScreenProps {
  onBack: () => void;
  gameKey: string;
  gameTitle: string;
  currentTelegramId?: string;
}

export function LeaderboardScreen({
  onBack,
  gameKey,
  gameTitle,
  currentTelegramId,
}: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("game_scores")
        .select(
          `
          best_score,
          last_score,
          users (
            telegram_id,
            username
          )
        `
        )
        .eq("game_key", gameKey)
        .order("best_score", { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        console.error("Leaderboard error:", error);
        setErrorMsg("Не вдалося завантажити лідерборд");
        setLoading(false);
        return;
      }

      const formatted: LeaderboardEntry[] = (data ?? []).map((row: any) => ({
        bestScore: row.best_score ?? 0,
        lastScore: row.last_score ?? 0,
        telegramId: row.users?.telegram_id ?? "",
        username: row.users?.username ?? null,
      }));

      setEntries(formatted);
      setLoading(false);
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [gameKey]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #252641, #050509)",
        color: "#fff",
        padding: "16px",
        fontFamily: "Courier New, monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "none",
            background: "#444",
            color: "#fff",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ⬅ Назад
        </button>

        <div
          style={{
            textAlign: "right",
            fontSize: 11,
            opacity: 0.8,
          }}
        >
          Global leaderboard
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 22,
            marginBottom: 4,
            background: "linear-gradient(90deg, #ffcc00, #ffaa00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          🏆 {gameTitle}
        </h2>
        <p
          style={{
            fontSize: 12,
            opacity: 0.8,
            marginBottom: 16,
          }}
        >
          Top гравців за найкращим результатом
        </p>
      </div>

      {loading && (
        <p style={{ textAlign: "center", fontSize: 13, opacity: 0.8 }}>
          Завантаження...
        </p>
      )}

      {!loading && errorMsg && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#ff7777" }}>
          {errorMsg}
        </p>
      )}

      {!loading && !errorMsg && entries.length === 0 && (
        <p style={{ textAlign: "center", fontSize: 13, opacity: 0.8 }}>
          Ще ніхто не грав у цю гру. Будь першим! 🚀
        </p>
      )}

      {!loading && !errorMsg && entries.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 8,
          }}
        >
          {entries.map((entry, index) => {
            const isYou = currentTelegramId &&
              entry.telegramId === currentTelegramId;

            const place = index + 1;

            return (
              <div
                key={`${entry.telegramId}-${index}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isYou
                    ? "rgba(255, 224, 100, 0.12)"
                    : "rgba(0,0,0,0.45)",
                  border: isYou
                    ? "1px solid rgba(255, 224, 100, 0.7)"
                    : "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      textAlign: "right",
                      fontWeight: 700,
                      color:
                        place === 1
                          ? "#ffd700"
                          : place === 2
                          ? "#c0c0c0"
                          : place === 3
                          ? "#cd7f32"
                          : "#ffcc66",
                    }}
                  >
                    #{place}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {entry.username || "Player"}
                      {isYou && (
                        <span style={{ color: "#5bff9c", marginLeft: 6 }}>
                          (you)
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.75,
                      }}
                    >
                      Best: {entry.bestScore} · Last: {entry.lastScore}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#5bff9c",
                  }}
                >
                  {entry.bestScore}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
