import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { FlappyScreen } from "./screens/FlappyScreen";

type Screen = "menu" | "flappy";

const XP_KEY = "retroplay_xp";

interface ProfileInfo {
  name: string;
  avatarInitial: string;
  avatarUrl: string | null;
}

function getProfileFromTelegram(): ProfileInfo {
  try {
    const user = WebApp.initDataUnsafe?.user;

    if (user) {
      const name =
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        "Player";

      const initial = (user.first_name || user.username || "P")
        .charAt(0)
        .toUpperCase();

      const avatarUrl = user.photo_url ?? null;

      return { name, avatarInitial: initial, avatarUrl };
    }
  } catch {
    // якщо не в Telegram (локальний браузер) – просто вертаємо Guest
  }

  return {
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
  const [screen, setScreen] = useState<Screen>("menu");
  const [xp, setXp] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const profile = getProfileFromTelegram();

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
        // ігнор
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(XP_KEY, String(xp));
      } catch {
        // ігнор
      }
    }
  }, [xp]);

  const { level, progress, nextLevelXp } = calcLevel(xp);

  const handleGameOver = (sessionScore: number) => {
    const gainedXp = sessionScore * 10;
    if (gainedXp <= 0) {
      setScreen("menu");
      return;
    }
    setXp((prev) => prev + gainedXp);
    setLastGain(gainedXp);
    setScreen("menu");
  };

  if (screen === "flappy") {
    return (
      <FlappyScreen
        onExitToMenu={() => setScreen("menu")}
        onGameOver={handleGameOver}
      />
    );
  }

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
                background:
                  "linear-gradient(135deg, #ffcc00, #ff8800)",
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
          marginBottom: 18,
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
              background:
                "linear-gradient(90deg, #5bff9c, #00ffcc)",
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
          🎮 Games
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.65,
          }}
        >
          Play games, earn XP and climb to the top of RetroPlay.
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
        {/* Flappy Coin */}
        <button
          onClick={() => setScreen("flappy")}
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
                  color: "#ffcc33", // 🟡 ЗОЛОТИЙ ТЕКСТ НАЗВИ ГРИ
                }}
              >
                Flappy Coin
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.8,
                  color: "#b8ffd2", // мʼякий зелений опис
                }}
              >
                Dodge pipes, collect coins, farm XP.
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
            Play
          </div>
        </button>

        {/* Placeholder games */}
        <div
          style={{
            opacity: 0.5,
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.15)",
            padding: "9px 12px",
            fontSize: 11,
          }}
        >
          More retro games (Dino Run, 2048, Stack Tower...) coming soon.
        </div>
      </div>
    </div>
  );
}

export default App;
