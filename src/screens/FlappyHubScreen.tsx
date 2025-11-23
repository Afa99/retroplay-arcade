interface FlappyHubScreenProps {
  onBack: () => void;
  onPlay: () => void;
  onOpenLeaderboard: () => void;
}

export function FlappyHubScreen({
  onBack,
  onPlay,
  onOpenLeaderboard,
}: FlappyHubScreenProps) {
  return (
    <div
      style={{
        height: "100vh",
        background: "radial-gradient(circle at top, #252641, #050509)",
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
            color: "#ffcc33",
          }}
        >
          Flappy Coin
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(0,0,0,0.55)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "12px 14px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
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
            ₿
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
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
              Retro arcade where a golden coin flies through pipes. Earn
              XP and compete in the leaderboard.
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          Tap to jump, don&apos;t hit the pipes. Each point = XP boost. Your
          best score is saved and used in tournaments and airdrops in the future.
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          onClick={onPlay}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(91,255,156,0.6)",
            background:
              "linear-gradient(135deg, rgba(20,40,30,0.95), rgba(10,20,15,0.95))",
            color: "#5bff9c",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>▶ Play Flappy Coin</span>
          <span style={{ fontSize: 11, opacity: 0.9 }}>earn XP</span>
        </button>

        <button
          onClick={onOpenLeaderboard}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "linear-gradient(135deg, #0b1510, #050908)",
            color: "#ffcc66",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>🏆 View Flappy Leaderboard</span>
          <span style={{ fontSize: 11, opacity: 0.85 }}>best scores only</span>
        </button>
      </div>
    </div>
  );
}
