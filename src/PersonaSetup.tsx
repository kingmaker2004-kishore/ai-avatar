import { useEffect, useState } from "react";
import {
  fetchApi,
  type BootstrapResponse,
  type Participant,
  type PersonaSummary,
  type SavedPersona
} from "./api";

type Props = {
  onReady: (persona: PersonaSummary) => void;
  onError: (message: string) => void;
  compactOnly?: boolean;
};

type SetupState = "needs-upload" | "choose-person";

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Recently";
  }
  const diffMs = Date.now() - timestamp;
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Date(value).toLocaleDateString();
}

export default function PersonaSetup({ onReady, onError, compactOnly = false }: Props) {
  const [setupState, setSetupState] = useState<SetupState>("needs-upload");
  const [setupFile, setSetupFile] = useState<File | null>(null);
  const [chatImportId, setChatImportId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSavedPersonas = async () => {
      try {
        const { response, data } = await fetchApi("/api/persona/bootstrap");
        if (!response.ok || !isMounted) {
          return;
        }
        const bootstrap = data as BootstrapResponse;
        setSavedPersonas(bootstrap.personas ?? []);
      } catch (error) {
        if (isMounted) {
          onError(error instanceof Error ? error.message : "Unable to load saved personas.");
        }
      }
    };

    void loadSavedPersonas();

    return () => {
      isMounted = false;
    };
  }, [onError]);

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

      setChatImportId(typeof data.chatImportId === "string" ? data.chatImportId : "");
      setParticipants((data.participants ?? []) as Participant[]);
      setSetupState("choose-person");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to read that WhatsApp export.");
    } finally {
      setIsLoading(false);
    }
  };

  const choosePersonaPerson = async (selectedPerson: string) => {
    if (!chatImportId || isLoading) {
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
          chatImportId,
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

  const openSavedPersona = async (personaId: string) => {
    if (!personaId || isLoading) {
      return;
    }

    setIsLoading(true);
    onError("");

    try {
      const { response, data } = await fetchApi("/api/persona/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ personaId })
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to open that persona.");
      }

      onReady(data.persona as PersonaSummary);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to open that persona.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPersonas = savedPersonas.filter((persona) => {
    const haystack = `${persona.name} ${persona.preview} ${persona.styleTags.join(" ")}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <main className="persona-library-shell">
      {!compactOnly ? (
      <aside className="persona-library-sidebar">
        <div className="library-topbar">
          <h1>Saved Personas</h1>
          <button
            className="primary-action"
            onClick={() => {
              setSetupState("needs-upload");
              setSetupFile(null);
              setChatImportId("");
              setParticipants([]);
            }}
            disabled={isLoading}
          >
            + Create New Persona
          </button>
        </div>

        <label className="library-search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search personas"
          />
        </label>

        <div className="saved-persona-list">
          {filteredPersonas.length > 0 ? (
            filteredPersonas.map((persona) => (
              <button
                key={persona.id}
                className="saved-persona-card"
                onClick={() => void openSavedPersona(persona.id)}
                disabled={isLoading}
              >
                <div className="saved-persona-avatar">{persona.avatarInitials || "PA"}</div>
                <div className="saved-persona-copy">
                  <strong>{persona.name}</strong>
                  <span>Last active: {formatRelativeTime(persona.lastActive)}</span>
                  <p>{persona.chatCount} chats</p>
                  <small>{persona.preview}</small>
                </div>
              </button>
            ))
          ) : (
            <p className="empty-library-copy">No saved personas yet.</p>
          )}
        </div>
      </aside>
      ) : null}

      <section className="persona-library-main">
        <div className="hero-copy">
          <p className="eyebrow">WhatsApp Persona Workspace</p>
          <h2>Create or reopen a persona</h2>
          <p className="subtitle">
            Personas persist with their own chat histories, uploaded files, and conversation context.
          </p>
        </div>

        <section className="setup-card">
          <div className="setup-steps" aria-label="Setup progress">
            <div className={`setup-step ${setupState === "needs-upload" ? "active" : "done"}`}>
              <span>1</span>
              <p>Upload Chat</p>
            </div>
            <div className={`setup-step ${setupState === "choose-person" ? "active" : ""}`}>
              <span>2</span>
              <p>Choose Persona</p>
            </div>
          </div>

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
                {setupFile ? `Selected file: ${setupFile.name}` : "Use the exported WhatsApp .txt file."}
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
                    setChatImportId("");
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
    </main>
  );
}
