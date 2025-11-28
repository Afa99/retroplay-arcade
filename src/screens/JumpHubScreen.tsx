interface JumpHubScreenProps {
  onBack: () => void;
  onPlay: () => void;
  onOpenLeaderboard: () => void;
}

export function JumpHubScreen({
  onBack,
  onPlay,
  onOpenLeaderboard,
}: JumpHubScreenProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1e2030, #050509)",
        color: "#fff",
        padding: "16px",
        fontFamily: "Courier New, monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Back */}
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
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          ⬅ Back
        </button>
        <div
          style={{
            fontSize: 12,
            opacity: 0.8,
          }}
        >
          RetroPlay Arcade · Jump
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 6,
            color: "#ffcc33",
          }}
        >
          Jump Coin
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.8,
          }}
        >
          Bounce from platform to platform and collect XP.  
          Simple controls, endless vertical action.
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(0,0,0,0.55)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.15)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                "radial-gradient(circle at 30% 30%, #fff5b0, #f5b800)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            ⬆
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              How to play
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.8,
              }}
            >
              Tap left/right side of the screen to move.  
              Land on new platforms to gain score and XP.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            onClick={onPlay}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, #5bff9c, #00ffcc)",
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            ▶ Play Jump Coin
          </button>

          <button
            onClick={onOpenLeaderboard}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 13,
            }}
          >
            🏆 Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
