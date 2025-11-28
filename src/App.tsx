import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

import { FlappyScreen } from "./screens/FlappyScreen";
import { JumpScreen } from "./screens/JumpScreen";
import { MergeScreen } from "./screens/MergeScreen";

import { FlappyHubScreen } from "./screens/FlappyHubScreen";
import { JumpHubScreen } from "./screens/JumpHubScreen";
import { MergeHubScreen } from "./screens/MergeHubScreen";

import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { VipTournamentsScreen } from "./screens/VipTournamentsScreen";

import { addScoreToLeaderboard } from "./leaderboard/storage";

import {
  syncUserWithBackend,
  submitFlappyScoreToBackend,
  type BackendProfile,
} from "./api/backend";

import { supabase } from "./lib/supabaseClient";

// Усі екрани, між якими ми перемикаємось
type Screen =
  | "menu"
  | "flappyHub"
  | "flappyPlay"
  | "flappyLeaderboard"
  | "jumpHub"
  | "jumpPlay"
  | "jumpLeaderboard"
  | "mergeHub"
  | "mergePlay"
  | "mergeLeaderboard"
  | "vip";

interface ProfileInfo {
  id: string;
  name: string;
  avatarInitial: string;
  avatarUrl: string | null;
}

// рядок з глобального XP-топа
interface GlobalXpRow {
  user_id: number;
  xp: number;
  users?: {
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
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

      const avatarUrl = (user as any).photo_url ?? null;

      return { id, name, avatarInitial: initial, avatarUrl };
    }
  } catch {
    // не в Telegram або initData недоступний
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

function getNameFromGlobalRow(row: GlobalXpRow): string {
  const u = row.users;
  if (!u) return `Player #${row.user_id}`;

  const full =
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;
  return full || `Player #${row.user_id}`;
}

function App() {
  const profile = getProfileFromTelegram();
  const XP_KEY = `retroplay_xp_${profile.id}`;

  const [screen, setScreen] = useState<Screen>("menu");
  const [xp, setXp] = useState(0);
  const [lastGain, setLastGain] = useState(0);

  // перший елемент нам не потрібен – ми не читаємо backendProfile напряму
  const [, setBackendProfile] = useState<BackendProfile | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [globalXp, setGlobalXp] = useState<GlobalXpRow[]>([]);
  const [xpReloadTick, setXpReloadTick] = useState(0);

  // Telegram WebApp ready + expand
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      console.log("[App] Telegram WebApp ready");
    } catch (e) {
      console.log("[App] Telegram WebApp not in WebView", e);
    }
  }, []);

  // 1) читаємо локальний кеш XP
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

  // 2) пишемо XP в localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(XP_KEY, String(xp));
      } catch {
        // ignore
      }
    }
  }, [xp, XP_KEY]);

  // 3) синхронізація з Supabase (users + profiles)
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

        if (backend) {
          console.log("[App] sync done, userId:", userId, "xp:", backend.xp);
          setBackendProfile(backend);
          setXp(backend.xp);
          setXpReloadTick((t) => t + 1);
        }
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

  // 4) завантаження глобального XP leaderboard (топ-10)
  useEffect(() => {
    let cancelled = false;

    async function loadGlobalXp() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, xp, users(username, first_name, last_name)")
          .order("xp", { ascending: false })
          .limit(10);

        if (error) {
          console.error("[App] loadGlobalXp error:", error);
          return;
        }

        if (!cancelled && data) {
          // нормалізуємо users: або один об'єкт, або null
          const normalized: GlobalXpRow[] = (data as any[]).map((row) => {
            let u = (row as any).users;
            if (Array.isArray(u)) {
              u = u[0] ?? null;
            }
            return {
              user_id: (row as any).user_id,
              xp: (row as any).xp,
              users: u ?? null,
            };
          });

          setGlobalXp(normalized);
        }
      } catch (e) {
        console.error("[App] loadGlobalXp exception:", e);
      }
    }

    loadGlobalXp();
    return () => {
      cancelled = true;
    };
  }, [xpReloadTick]);

  const { level, progress, nextLevelXp } = calcLevel(xp);

  // ===== FLAPPY: onGameOver =====
  const handleFlappyGameOver = async (sessionScore: number) => {
    console.log("[App] handleFlappyGameOver, score:", sessionScore);

    const gainedXp = sessionScore * 10;

    // локальний leaderboard по грі
    addScoreToLeaderboard(
      profile.id,
      profile.name,
      "flappy_coin",
      sessionScore
    );

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
          console.log("[App] backend updated profile (flappy):", updated);
          setBackendProfile(updated);
          setXp(updated.xp);
          setXpReloadTick((t) => t + 1);
        }
      } catch (e) {
        console.error("submitFlappyScoreToBackend error:", e);
      }
    }
  };

  // ===== JUMP: onGameOver =====
  const handleJumpGameOver = async (sessionScore: number) => {
    console.log("[App] handleJumpGameOver, score:", sessionScore);

    const gainedXp = sessionScore * 5;

    addScoreToLeaderboard(
      profile.id,
      profile.name,
      "jump_coin",
      sessionScore
    );

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
          gameKey: "jump_coin",
        });

        if (updated) {
          console.log("[App] backend updated profile (jump):", updated);
          setBackendProfile(updated);
          setXp(updated.xp);
          setXpReloadTick((t) => t + 1);
        }
      } catch (e) {
        console.error("submitJumpScoreToBackend error:", e);
      }
    }
  };

  // ===== MERGE 2048: onGameOver =====
  const handleMergeGameOver = async (sessionScore: number) => {
    console.log("[App] handleMergeGameOver, score:", sessionScore);

    // у 2048 рахунки великі, мультиплієр менший
    const gainedXp = sessionScore * 2;

    addScoreToLeaderboard(
      profile.id,
      profile.name,
      "merge_2048",
      sessionScore
    );

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
          gameKey: "merge_2048",
        });

        if (updated) {
          console.log("[App] backend updated profile (merge):", updated);
          setBackendProfile(updated);
          setXp(updated.xp);
          setXpReloadTick((t) => t + 1);
        }
      } catch (e) {
        console.error("submitMergeScoreToBackend error:", e);
      }
    }
  };

  // ===== РЕНДЕР ЕКРАНІВ =====

  if (screen === "flappyPlay") {
    return (
      <FlappyScreen
        onExitToMenu={() => setScreen("flappyHub")}
        onGameOver={handleFlappyGameOver}
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

  if (screen === "jumpPlay") {
    return (
      <JumpScreen
        onExitToMenu={() => setScreen("jumpHub")}
        onGameOver={handleJumpGameOver}
      />
    );
  }

  if (screen === "jumpLeaderboard") {
    return (
      <LeaderboardScreen
        onBack={() => setScreen("jumpHub")}
        gameKey="jump_coin"
        gameTitle="Jump Coin"
        currentTelegramId={profile.id}
      />
    );
  }

  if (screen === "jumpHub") {
    return (
      <JumpHubScreen
        onBack={() => setScreen("menu")}
        onPlay={() => setScreen("jumpPlay")}
        onOpenLeaderboard={() => setScreen("jumpLeaderboard")}
      />
    );
  }

  if (screen === "mergePlay") {
    return (
      <MergeScreen
        onExitToMenu={() => setScreen("mergeHub")}
        onGameOver={handleMergeGameOver}
      />
    );
  }

  if (screen === "mergeLeaderboard") {
    return (
      <LeaderboardScreen
        onBack={() => setScreen("mergeHub")}
        gameKey="merge_2048"
        gameTitle="Merge 2048"
        currentTelegramId={profile.id}
      />
    );
  }

  if (screen === "mergeHub") {
    return (
      <MergeHubScreen
        onBack={() => setScreen("menu")}
        onPlay={() => setScreen("mergePlay")}
        onOpenLeaderboard={() => setScreen("mergeLeaderboard")}
      />
    );
  }

  if (screen === "vip") {
    return <VipTournamentsScreen onBack={() => setScreen("menu")} />;
  }

  // ===== ГОЛОВНА (MENU) =====
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
            maxHeight: 190,
            overflowY: "auto",
          }}
        >
          {globalXp.length === 0 ? (
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
                    Your current XP
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
          ) : (
            globalXp.map((row, index) => {
              const isMe = userId != null && row.user_id === userId;
              const name = getNameFromGlobalRow(row);

              return (
                <div
                  key={row.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom:
                      index === globalXp.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,0.07)",
                    background: isMe
                      ? "rgba(91,255,156,0.12)"
                      : "transparent",
                    borderRadius: isMe ? 6 : 0,
                    paddingInline: isMe ? 6 : 0,
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
                        color: isMe ? "#5bff9c" : "#ffcc33",
                      }}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {name}
                        {isMe && " (you)"}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.7,
                        }}
                      >
                        XP: {row.xp}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isMe ? "#5bff9c" : "#ffffff",
                    }}
                  >
                    {row.xp}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            fontSize: 10,
            opacity: 0.65,
            marginTop: 4,
          }}
        >
          XP зберігається в Supabase. Тут показуємо топ-гравців з Telegram.
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
          Відкрий хаб гри, грай за XP, дивись лідерборди та готуйся до VIP
          турнірів.
        </div>
      </div>

      {/* LIST OF GAMES */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 12,
        }}
      >
        {/* Flappy Coin */}
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
                Класика: лети між трубами, фарм XP.
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

        {/* Jump Coin */}
        <button
          onClick={() => setScreen("jumpHub")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(25,30,50,0.9), rgba(10,10,20,0.9))",
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
                  "radial-gradient(circle at 30% 30%, #cce5ff, #3399ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              ↑
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 2,
                  color: "#cce5ff",
                }}
              >
                Jump Coin
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                  color: "#e0f0ff",
                }}
              >
                Стрибай вгору по платформам, не падай вниз.
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(150,200,255,0.6)",
              color: "#e0f0ff",
            }}
          >
            Open
          </div>
        </button>

        {/* Merge 2048 */}
        <button
          onClick={() => setScreen("mergeHub")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(40,30,30,0.9), rgba(20,8,8,0.9))",
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
                  "radial-gradient(circle at 30% 30%, #fff5b0, #ff9966)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              2048
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 2,
                  color: "#ffbb88",
                }}
              >
                Merge 2048
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                  color: "#ffdccc",
                }}
              >
                Класична головоломка: мерж плиток, великий скор, стабільний XP.
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,187,136,0.6)",
              color: "#ffe6cc",
            }}
          >
            Open
          </div>
        </button>
      </div>

      {/* VIP TOURNAMENTS */}
      <button
        onClick={() => setScreen("vip")}
        style={{
          width: "100%",
          maxWidth: 420,
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
          marginBottom: 10,
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
  );
}

export default App;
