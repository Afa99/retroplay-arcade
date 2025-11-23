import WebApp from "@twa-dev/sdk";

function App() {
  return (
    <div
      style={{
        background: "#111",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Courier New",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        🎮 RetroPlay Arcade
      </h1>

      <button
        style={{
          padding: "12px 24px",
          background: "#ffcc00",
          borderRadius: "8px",
          fontSize: "18px",
          border: "none",
          cursor: "pointer",
        }}
        onClick={() => {
          WebApp.showAlert("RetroPlay стартує!");
        }}
      >
        Start Arcade
      </button>
    </div>
  );
}

export default App;
