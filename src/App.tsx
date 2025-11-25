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
} from "./api/backend";

type Screen = "menu" | "flappyHub" | "flappyPlay" | "flappyLeaderboard" | "vip";

interface ProfileInfo {
  id: string;
  name: string;
  avatarInitial: string;
  avatarUrl: string | null;
}

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

  const [userId, setUserId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  // 1) локальний XP (кеш) – читаємо з localStorage
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

  // 2) при зміні XP — пишемо в localStorage (кеш)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(XP_KEY, String(xp));
      } catch {
        // ignore
      }
    }
  }, [xp, XP_KEY]);

  // 3) синхронізація з бекендом (Supabase)
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      setSyncing(true);
      try {
        const { userId, profile: backend } = await syncUserWithBackend({
          telegramId: profile.id,
          name: profile.name,
        });

        if (cancelled) return;

        setUserId(userId);

        // бекенд → основне джерело XP
        setXp(backend?.xp ?? 0);
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

  const { level, progress, nextLevelXp } = calcLevel(xp);

  // викликається, коли Flappy закінчує гру
  const handleGameOver = async (sessionScore: number) => {
    const gainedXp = sessionScore * 10;

    // локально зберігаємо найкращий score цього юзера в Flappy Coin
    addScoreToLeaderboard(profile.id, profile.name, "flappy_coin", sessionScore);

    if (gainedXp > 0) {
      // оптимістично оновлюємо XP в UI
      setXp((prev) => prev + gainedXp);
      setLastGain(gainedXp);
    }

    // оновлюємо бекенд, якщо є userId
    if (userId && userId > 0) {
      try {
        const updated = await submitFlappyScoreToBackend({
          userId,
          score: sessionScore,
          xpDelta: gainedXp,
          gameKey: "flappy_coin",
        });

        if (updated) {
          setXp(updated.xp); // синхронізуємося з тим, що в базі
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

  // ==== ГОЛОВНА (MENU) З XP / ПРОФІЛЕМ ====
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

      {/* GLOBAL XP PREVIEW */}
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
          🏆 Global XP Leaderboard (preview)
        </div>
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "8px 10px",
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
                  fontWeight: 700,
                  color: "#ffcc33",
                }}
              >
                #1
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {profile.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.75,
                  }}
                >
                  Your current XP (stored in cloud)
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
              {xp} XP
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            opacity: 0.65,
            marginTop: 4,
          }}
        >
          Now XP is stored in Supabase. Later this block will show real global
          ranking between all players.
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

      {/* LIST */}
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
