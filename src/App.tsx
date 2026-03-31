import { useState } from "react";
import LiveAvatarComponent from "./LiveAvatar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export default function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRequest, setPlaybackRequest] = useState(0);

  const sendMessage = async () => {
    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    setPlaybackRequest((value) => value + 1);
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Backend error");
      }
      setResponse(data.reply ?? "");
      setInput("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Backend error");
      setResponse("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="hero-copy">
          <p className="eyebrow">LiveAvatar + Groq</p>
          <h1>AI Avatar Assistant</h1>
          <p className="subtitle">
            Ask a question, get a Groq response, and have your LiveAvatar speak it
            back in real time.
          </p>
        </div>

        <LiveAvatarComponent
          apiBaseUrl={API_BASE_URL}
          playbackRequest={playbackRequest}
          text={response}
        />

        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void sendMessage();
              }
            }}
            placeholder="Ask something..."
          />

          <button onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </div>

        {error ? <p className="message error">{error}</p> : null}

        <div className="response-card">
          <span>AI response</span>
          <p>{response || "Your Groq response will show up here."}</p>
        </div>
      </section>
    </main>
  );
}
