import { useEffect, useState } from "react";
import {
  loadLeaderboard,
  type LeaderboardEntry,
} from "../leaderboard/storage";

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(loadLeaderboard());
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        background: "radial-gradient(circle at top, #151626, #050509)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        fontFamily: "Courier New, monospace",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "6px 12px",
            background: "#444",
            color: "#fff",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          ⬅ Back
        </button>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#5bff9c",
          }}
        >
          Leaderboard
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "10px 12px",
          fontSize: 12,
        }}
      >
        {entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              opacity: 0.7,
              padding: "16px 0",
            }}
          >
            No scores yet. Play Flappy Coin and set the first record!
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {entries.map((entry, index) => {
              const date = new Date(entry.date);
              const dateLabel = date.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "2-digit",
              });

              const isTop1 = index === 0;
              const isTop3 = index < 3;

              return (
                <div
                  key={`${entry.userId}-${entry.date}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: isTop1
                      ? "linear-gradient(90deg, rgba(255,204,0,0.15), rgba(255,136,0,0.05))"
                      : "rgba(255,255,255,0.03)",
                    border: isTop3
                      ? "1px solid rgba(255,204,0,0.5)"
                      : "1px solid rgba(255,255,255,0.06)",
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
                        width: 22,
                        textAlign: "right",
                        fontWeight: isTop3 ? 700 : 500,
                        color: isTop3 ? "#ffcc33" : "#ddd",
                      }}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isTop3 ? 600 : 500,
                        }}
                      >
                        {entry.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.75,
                        }}
                      >
                        {dateLabel}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isTop3 ? "#5bff9c" : "#ffffff",
                    }}
                  >
                    {entry.score}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          opacity: 0.65,
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        This leaderboard is local for now. Later we&apos;ll sync it globally by
        Telegram user id and use it for weekly VIP tournaments & airdrops.
      </div>
    </div>
  );
}
