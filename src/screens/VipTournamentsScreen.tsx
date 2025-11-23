interface VipTournamentsScreenProps {
  onBack: () => void;
}

export function VipTournamentsScreen({ onBack }: VipTournamentsScreenProps) {
  return (
    <div
      style={{
        height: "100vh",
        background: "radial-gradient(circle at top, #22161f, #050509)",
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
          VIP Tournaments
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(0,0,0,0.6)",
          borderRadius: 12,
          border: "1px solid rgba(255,204,0,0.35)",
          padding: "12px 14px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 4,
            color: "#ffdd55",
          }}
        >
          Weekly VIP Tournament
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.85,
            marginBottom: 6,
          }}
        >
          Pay a small entry fee, compete for the top score in Flappy Coin during
          the week. Prize pool is formed from fees and rewarded to top players.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 11,
          }}
        >
          <div>
            <b>Mode:</b> Flappy Coin
          </div>
          <div>
            <b>Entry fee:</b> coming soon
          </div>
          <div>
            <b>Prize pool:</b> % of all entries + extra rewards for top players
          </div>
          <div>
            <b>Status:</b> design phase — backend & tokenomics in progress
          </div>
        </div>

        <button
          disabled
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.25)",
            background:
              "linear-gradient(90deg, rgba(255,204,0,0.4), rgba(255,136,0,0.3))",
            color: "#222",
            fontSize: 13,
            fontWeight: 600,
            cursor: "not-allowed",
            opacity: 0.7,
          }}
        >
          Coming soon
        </button>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          fontSize: 11,
          opacity: 0.75,
          lineHeight: 1.4,
        }}
      >
        In the next step we&apos;ll connect a backend, link tournaments to your
        Telegram user id, and use leaderboards & XP to choose the most active
        players for airdrops and special rewards.
      </div>
    </div>
  );
}
