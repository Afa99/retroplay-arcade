import { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { FlappyScreen } from "./screens/FlappyScreen";

type Screen = "menu" | "flappy";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");

  if (screen === "flappy") {
    return <FlappyScreen onExitToMenu={() => setScreen("menu")} />;
  }

  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #444, #050505)",
        color: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Courier New, monospace",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>🎮 RetroPlay Arcade</h1>
      <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
        Classic mini-games in Telegram. Tap, jump, survive and climb the leaderboard.
      </p>

      <button
        style={{
          padding: "12px 24px",
          background: "#ffcc00",
          borderRadius: 10,
          fontSize: 18,
          border: "none",
          cursor: "pointer",
          marginBottom: 12,
        }}
        onClick={() => setScreen("flappy")}
      >
        ▶ Play Flappy Retro
      </button>

      <button
        style={{
          padding: "8px 18px",
          background: "#333",
          borderRadius: 8,
          fontSize: 14,
          border: "1px solid #555",
          cursor: "pointer",
          marginTop: 8,
        }}
        onClick={() => {
          WebApp.showAlert("Soon: more games, XP, tournaments & rewards.");
        }}
      >
        Coming soon…
      </button>
    </div>
  );
}

export default App;
