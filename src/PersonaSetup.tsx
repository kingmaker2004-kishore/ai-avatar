import { useState } from "react";
import { fetchApi, type Participant, type PersonaSummary } from "./api";

type Props = {
  onReady: (persona: PersonaSummary) => void;
  onError: (message: string) => void;
};

type SetupState = "needs-upload" | "choose-person";

export default function PersonaSetup({ onReady, onError }: Props) {
  const [setupState, setSetupState] = useState<SetupState>("needs-upload");
  const [setupFile, setSetupFile] = useState<File | null>(null);
  const [setupChatText, setSetupChatText] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const previewWhatsAppFile = async () => {
    if (!setupFile || isLoading) {
      return;
    }

    setIsLoading(true);
    onError("");

    try {
      const chatText = await setupFile.text();
      const { response, data } = await fetchApi("/api/persona/preview-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chatText })
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to read that WhatsApp export.");
      }

      setSetupChatText(chatText);
      setParticipants((data.participants ?? []) as Participant[]);
      setSetupState("choose-person");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to read that WhatsApp export.");
    } finally {
      setIsLoading(false);
    }
  };

  const choosePersonaPerson = async (selectedPerson: string) => {
    if (!setupChatText || isLoading) {
      return;
    }

    setIsLoading(true);
    onError("");

    try {
      const { response, data } = await fetchApi("/api/persona/configure-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chatText: setupChatText,
          selectedPerson
        })
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create the persona.");
      }

      onReady(data.persona as PersonaSummary);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to create the persona.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel setup-panel">
      <div className="hero-copy">
        <p className="eyebrow">WhatsApp Persona Setup</p>
        <h1>Create Your Chat Persona</h1>
        <p className="subtitle">
          Upload the exported WhatsApp `.txt` once, pick the person to imitate, and the app
          will reopen directly into that persona next time.
        </p>
      </div>

      <section className="setup-card">
        {setupState === "needs-upload" ? (
          <>
            <label className="file-picker">
              <span>Choose WhatsApp Export</span>
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={(event) => setSetupFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <p className="setup-hint">
              {setupFile
                ? `Selected file: ${setupFile.name}`
                : "Use the regular WhatsApp exported chat text file."}
            </p>
            <button
              className="primary-action"
              onClick={() => void previewWhatsAppFile()}
              disabled={!setupFile || isLoading}
            >
              {isLoading ? "Reading Chat..." : "Read Chat File"}
            </button>
          </>
        ) : (
          <>
            <div className="setup-headline">
              <h2>Choose the person to turn into the AI</h2>
              <button
                className="btn-text"
                onClick={() => {
                  setSetupState("needs-upload");
                  setParticipants([]);
                  setSetupChatText("");
                }}
                disabled={isLoading}
              >
                Change File
              </button>
            </div>
            <div className="participant-list">
              {participants.map((participant) => (
                <button
                  key={participant.name}
                  className="participant-card"
                  onClick={() => void choosePersonaPerson(participant.name)}
                  disabled={isLoading}
                >
                  <div className="participant-title-row">
                    <strong>{participant.name}</strong>
                    <span>{participant.messageCount} messages</span>
                  </div>
                  <p>{participant.preview || "No preview available."}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
