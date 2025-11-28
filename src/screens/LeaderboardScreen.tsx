import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface LeaderboardScreenProps {
  onBack: () => void;
  gameKey: string;        // "flappy_coin"
  gameTitle: string;      // "Flappy Coin"
  currentTelegramId?: string;
}

interface LeaderboardRow {
  username: string | null;
  telegram_id: string;
  best_score: number;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  onBack,
  gameKey,
  gameTitle,
  currentTelegramId,
}) => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("game_scores")
          .select(
            `
            best_score,
            user_id,
            users!inner (
              telegram_id,
              username
            )
          `
          )
          .eq("game_key", gameKey)
          .order("best_score", { ascending: false })
          .limit(10);

        if (error) {
          console.error("[Leaderboard] error:", error);
          setRows([]);
          return;
        }

        if (cancelled || !data) return;

        const mapped: LeaderboardRow[] = data.map((row: any) => ({
          username: row.users?.username ?? null,
          telegram_id: row.users?.telegram_id ?? "",
          best_score: Number(row.best_score ?? 0),
        }));

        setRows(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [gameKey]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #252641, #050509)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 16,
        fontFamily: "Courier New, monospace",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {gameTitle} · Leaderboard
        </div>
      </div>

      {/* TABLE */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(0,0,0,0.55)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.15)",
          padding: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 13,
            marginBottom: 8,
            color: "#ffcc33",
          }}
        >
          🏆 Top 10 players
        </div>

        {loading && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
            }}
          >
            Loading...
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
            }}
          >
            No scores yet. Be the first one to play!
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div
            style={{
              marginTop: 4,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {rows.map((row, index) => {
              const isYou =
                currentTelegramId &&
                row.telegram_id === currentTelegramId;

              return (
                <div
                  key={row.telegram_id + index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: isYou
                      ? "linear-gradient(135deg, rgba(91,255,156,0.15), rgba(0,0,0,0.6))"
                      : "rgba(0,0,0,0.4)",
                    border: isYou
                      ? "1px solid rgba(91,255,156,0.7)"
                      : "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        textAlign: "right",
                        fontWeight: 700,
                        color:
                          index === 0
                            ? "#ffcc33"
                            : "rgba(255,255,255,0.9)",
                      }}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {row.username || "Unknown"}
                      </div>
                      {isYou && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#5bff9c",
                          }}
                        >
                          You
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#5bff9c",
                      fontSize: 13,
                    }}
                  >
                    {row.best_score}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
