import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ textAlign: "center" }}>
      <h1>AI Avatar Assistant</h1>

      <iframe
        src="https://embed.liveavatar.com/v1/2a982ccb-30d8-4b56-b750-37b8f6541e29"
        allow="microphone"
        title="LiveAvatar"
        style={{
          width: "800px",
          height: "450px",
          border: "none"
        }}
      ></iframe>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);