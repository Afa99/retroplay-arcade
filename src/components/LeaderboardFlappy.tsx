import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface LeaderRow {
  username: string | null;
  best_score: number;
  telegram_id: string;
}

interface Props {
  currentTelegramId: string;
  onBack: () => void;
}

export function LeaderboardFlappy({ currentTelegramId, onBack }: Props) {
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);

      const { data, error } = await supabase
        .from("game_scores")
        .select(
          `
          best_score,
          users (
            telegram_id,
            username
          )
        `
        )
        .order("best_score", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Leaderboard error:", error);
        setLoading(false);
        return;
      }

      const formatted = data.map((row: any) => ({
        best_score: row.best_score,
        username: row.users?.username ?? "Unknown",
        telegram_id: row.users?.telegram_id ?? "",
      }));

      setLeaders(formatted);
      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #030712, #0b0e19)",
        color: "#fff",
        padding: "20px",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: "8px 14px",
          borderRadius: 999,
          border: "none",
          marginBottom: "16px",
          background: "#444",
          color: "#fff",
          fontSize: "14px",
        }}
      >
        ⬅ Назад
      </button>

      <h2
        style={{
          textAlign: "center",
          fontSize: "24px",
          marginBottom: "20px",
          background: "linear-gradient(90deg, #ffcc00, #ffaa00)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        🏆 Top-10 Flappy Coin
      </h2>

      {loading && <p style={{ textAlign: "center" }}>Loading...</p>}

      {!loading && leaders.length === 0 && (
        <p style={{ textAlign: "center", opacity: 0.7 }}>No players yet</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {leaders.map((u, index) => {
          const isYou = u.telegram_id === currentTelegramId;

          return (
            <div
              key={index}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: isYou
                  ? "rgba(255,224,100,0.15)"
                  : "rgba(255,255,255,0.05)",
                border: isYou
                  ? "1px solid rgba(255,224,100,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "15px",
              }}
            >
              <span>
                #{index + 1} — {u.username || "Player"}
              </span>
              <b>{u.best_score}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
