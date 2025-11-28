import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { FlappyScreen } from "./screens/FlappyScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { VipTournamentsScreen } from "./screens/VipTournamentsScreen";
import { FlappyHubScreen } from "./screens/FlappyHubScreen";
import { addScoreToLeaderboard } from "./leaderboard/storage";
import {
  syncUserWithBackend,
  submitFlappyScoreToBackend,
  type BackendProfile,
} from "./api/backend";
import { supabase } from "./lib/supabaseClient";

type Screen =
  | "menu"
  | "flappyHub"
  | "flappyPlay"
  | "flappyLeaderboard"
  | "vip";

interface ProfileInfo {
  id: string;
  name: string;
  avatarInitial: string;
  avatarUrl: string | null;
}

interface XpLeaderboardRow {
  xp: number;
  username: string | null;
  telegram_id: string;
}

// ===== TELEGRAM PROFILE =====

function getProfileFromTelegram(): ProfileInfo {
  try {
    const user = WebApp.initDataUnsafe?.user;

    if (user) {
      const id = String(user.id);
      const name =
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        "Player";

      const initial = (user.first_name || user.username || "P")
        .charAt(0)
        .toUpperCase();

      const avatarUrl = user.photo_url ?? null;

      return { id, name, avatarInitial: initial, avatarUrl };
    }
  } catch {
    // не в Telegram / initData недоступний
  }

  return {
    id: "guest",
    name: "Guest Player",
    avatarInitial: "G",
    avatarUrl: null,
  };
}

function calcLevel(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const progress = Math.min(
    1,
    (xp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  );
  return { level, progress, currentLevelXp, nextLevelXp };
}

function App() {
  const profile = getProfileFromTelegram();
  const XP_KEY = `retroplay_xp_${profile.id}`;

  const [screen, setScreen] = useState<Screen>("menu");
  const [xp, setXp] = useState(0);
  const [lastGain, setLastGain] = useState(0);

  const [,setBackendProfile] = useState<BackendProfile | null>(
    null
  );
  const [userId, setUserId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  // GLOBAL XP LEADERBOARD
  const [xpLeaders, setXpLeaders] = useState<XpLeaderboardRow[]>([]);
  const [xpLbLoading, setXpLbLoading] = useState(false);
  const [xpReloadTick, setXpReloadTick] = useState(0);

  // Telegram WebApp ready + expand (фулл-екран)
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      console.log("[App] Telegram WebApp ready");
    } catch {
      // звичайний браузер
    }
  }, []);

  // 1) XP кеш: читаємо з localStorage як fallback
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(XP_KEY);
        if (saved) {
          const val = Number(saved);
          if (!Number.isNaN(val) && val >= 0) {
            setXp(val);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [XP_KEY]);

  // 2) XP кеш: пишемо в localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(XP_KEY, String(xp));
      } catch {
        // ignore
      }
    }
  }, [xp, XP_KEY]);

  // 3) sync з бекендом: users + profiles
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      setSyncing(true);
      try {
        console.log("[App] syncUserWithBackend call for", profile);
        const { userId, profile: backend } = await syncUserWithBackend({
          telegramId: profile.id,
          name: profile.name,
        });

        if (cancelled) return;

        setUserId(userId);
        setBackendProfile(backend);
        setXp(backend.xp);
        console.log("[App] sync done, userId:", userId, "xp:", backend.xp);
      } catch (e) {
        console.error("Backend sync error:", e);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.name]);

  // 4) GLOBAL XP LEADERBOARD: profiles + users (TOP 10)
  useEffect(() => {
    if (!userId) return; // чекаємо, поки юзер зʼявиться в базі

    let cancelled = false;

    async function loadXpLeaderboard() {
      setXpLbLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            xp,
            user_id,
            users!inner (
              telegram_id,
              username
            )
          `
          )
          .order("xp", { ascending: false })
          .limit(10);

        if (error) {
          console.error("[App] XP leaderboard error:", error);
          return;
        }
        if (!data || cancelled) return;

        const mapped: XpLeaderboardRow[] = data.map((row: any) => ({
          xp: Number(row.xp ?? 0),
          username: row.users?.username ?? null,
          telegram_id: row.users?.telegram_id ?? "",
        }));

        setXpLeaders(mapped);
      } finally {
        if (!cancelled) setXpLbLoading(false);
      }
    }

    loadXpLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [userId, xpReloadTick]);

  const { level, progress, nextLevelXp } = calcLevel(xp);

  // Коли Flappy закінчив гру
  const handleGameOver = async (sessionScore: number) => {
    console.log("[App] handleGameOver, score:", sessionScore);
    const gainedXp = sessionScore * 10;

    // локальний лідерборд по грі (in-memory)
    addScoreToLeaderboard(profile.id, profile.name, "flappy_coin", sessionScore);

    if (gainedXp > 0) {
      setXp((prev) => prev + gainedXp);
      setLastGain(gainedXp);
    }

    if (userId) {
      try {
        const updated = await submitFlappyScoreToBackend({
          userId,
          score: sessionScore,
          xpDelta: gainedXp,
          gameKey: "flappy_coin",
        });

        if (updated) {
          console.log("[App] backend updated profile:", updated);
          setBackendProfile(updated);
          setXp(updated.xp);
          // перезавантажити глобальний XP-лідерборд після нової гри
          setXpReloadTick((t) => t + 1);
        }
      } catch (e) {
        console.error("submitFlappyScoreToBackend error:", e);
      }
    }
  };

  // ===== ЕКРАНИ =====

  if (screen === "flappyPlay") {
    return (
      <FlappyScreen
        onExitToMenu={() => setScreen("flappyHub")}
        onGameOver={handleGameOver}
      />
    );
  }

  if (screen === "flappyLeaderboard") {
    return (
      <LeaderboardScreen
        onBack={() => setScreen("flappyHub")}
        gameKey="flappy_coin"
        gameTitle="Flappy Coin"
        currentTelegramId={profile.id}
      />
    );
  }

  if (screen === "flappyHub") {
    return (
      <FlappyHubScreen
        onBack={() => setScreen("menu")}
        onPlay={() => setScreen("flappyPlay")}
        onOpenLeaderboard={() => setScreen("flappyLeaderboard")}
      />
    );
  }

  if (screen === "vip") {
    return <VipTournamentsScreen onBack={() => setScreen("menu")} />;
  }

  // ===== ГОЛОВНА: ПРОФІЛЬ + GLOBAL XP LEADERBOARD + СПИСОК ІГОР =====

  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #252641, #050509)",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        fontFamily: "Courier New, monospace",
      }}
    >
      {/* HEADER / PROFILE */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                objectFit: "cover",
                boxShadow: "0 0 12px rgba(0,0,0,0.45)",
                border: "2px solid rgba(255, 204, 0, 0.8)",
              }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ffcc00, #ff8800)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 20,
                color: "#222",
                boxShadow: "0 0 12px rgba(0,0,0,0.35)",
              }}
            >
              {profile.avatarInitial}
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {profile.name}
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.8,
              }}
            >
              Level {level} · {xp} XP
              {syncing && " · syncing..."}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.2)",
            opacity: 0.85,
          }}
        >
          RetroPlay Arcade
        </div>
      </div>

      {/* XP BAR */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 10,
          padding: "8px 10px 10px",
          marginBottom: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.8,
            marginBottom: 4,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>XP Progress</span>
          <span>
            {Math.floor(progress * 100)}% to L{level + 1}
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #5bff9c, #00ffcc)",
              transition: "width 0.3s ease-out",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            opacity: 0.75,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Next level at {nextLevelXp} XP</span>
          {lastGain > 0 && (
            <span style={{ color: "#5bff9c" }}>+{lastGain} XP</span>
          )}
        </div>
      </div>

      {/* GLOBAL XP LEADERBOARD */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 14,
            marginBottom: 4,
            color: "#ffcc33",
          }}
        >
          🏆 Global XP Leaderboard
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "8px 10px",
            fontSize: 12,
            minHeight: 40,
          }}
        >
          {xpLbLoading && <div>Loading...</div>}

          {!xpLbLoading && xpLeaders.length === 0 && (
            <div style={{ opacity: 0.8 }}>
              No players yet. Play a game to appear in the global ranking.
            </div>
          )}

          {!xpLbLoading && xpLeaders.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {xpLeaders.map((row, index) => {
                const isYou = row.telegram_id === profile.id;
                return (
                  <div
                    key={row.telegram_id + index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 6px",
                      borderRadius: 8,
                      background: isYou
                        ? "linear-gradient(135deg, rgba(91,255,156,0.18), rgba(0,0,0,0.7))"
                        : "rgba(0,0,0,0.4)",
                      border: isYou
                        ? "1px solid rgba(91,255,156,0.7)"
                        : "1px solid rgba(255,255,255,0.08)",
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
                      {row.xp} XP
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 10,
            opacity: 0.65,
            marginTop: 4,
          }}
        >
          XP is stored in Supabase and shared between all Telegram players.
        </div>
      </div>

      {/* TITLE */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 14,
            opacity: 0.95,
            marginBottom: 4,
            color: "#5bff9c",
          }}
        >
          🎮 Games & Events
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.65,
          }}
        >
          Open a game hub, play to earn XP, check leaderboards or join VIP
          tournaments.
        </div>
      </div>

      {/* GAMES LIST */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Flappy hub */}
        <button
          onClick={() => setScreen("flappyHub")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(20,40,30,0.9), rgba(10,20,15,0.9))",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background:
                  "radial-gradient(circle at 30% 30%, #fff5b0, #f5b800)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ₿
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 2,
                  color: "#ffcc33",
                }}
              >
                Flappy Coin
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                  color: "#b8ffd2",
                }}
              >
                Open hub: play or see leaderboard.
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(91,255,156,0.6)",
              color: "#5bff9c",
            }}
          >
            Open
          </div>
        </button>

        {/* VIP Tournaments */}
        <button
          onClick={() => setScreen("vip")}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,204,0,0.3)",
            background: "linear-gradient(135deg, #2b1c16, #0e0805)",
            color: "#ffcc66",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>💎 VIP Weekly Tournaments</span>
          <span
            style={{
              fontSize: 11,
              opacity: 0.9,
            }}
          >
            coming soon
          </span>
        </button>
      </div>
    </div>
  );
}

export default App;
