import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchApi,
  type BootstrapResponse,
  type SavedPersona
} from "./api";
import PersonaCard from "./PersonaCard";

type Props = {
  onPersonaSelect: (personaId: string) => void;
  isLoading: boolean;
  logout: () => Promise<void>;
};

function getPersonaInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "PA";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function SavedPersonas({ onPersonaSelect, isLoading, logout }: Props) {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<SavedPersona[]>([]);
  const [search, setSearch] = useState("");
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPersonas = async () => {
      try {
        const { response, data } = await fetchApi("/api/persona/bootstrap");

        if (!response.ok || !isMounted) {
          return;
        }

        const bootstrap = data as BootstrapResponse;
        setPersonas(bootstrap.personas ?? []);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load personas");
        }
      } finally {
        if (isMounted) {
          setIsBootstrapLoading(false);
        }
      }
    };

    void loadPersonas();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePersonaClick = (personaId: string) => {
    if (!isLoading) {
      onPersonaSelect(personaId);
      navigate(`/chat/${personaId}`);
    }
  };

  const handleNewPersona = () => {
    navigate("/persona/new");
  };

  const filteredPersonas = personas.filter((persona) =>
    persona.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isBootstrapLoading) {
    return (
      <main className="app-shell">
        <section className="panel setup-panel route-fade">
          <div className="hero-copy">
            <p className="eyebrow">Persona Library</p>
            <h1>Loading Personas</h1>
            <p className="subtitle">Retrieving your saved personas.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell dark-shell">
      <section className="personas-container">
        <header className="personas-header">
          <div className="personas-header-top">
            <h1>Your Personas</h1>
            <button 
              className="icon-btn logout-btn" 
              onClick={() => void logout()} 
              title="Sign out"
            >
              🚪
            </button>
          </div>
          <p className="personas-subtitle">Select a persona to start chatting or create a new one</p>
        </header>

        <div className="personas-controls">
          <input
            type="text"
            className="personas-search"
            placeholder="Search personas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="personas-new-btn" onClick={handleNewPersona}>
            + New Persona
          </button>
        </div>

        {error ? (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        ) : null}

        <div className="personas-grid">
          {filteredPersonas.length > 0 ? (
            filteredPersonas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                initials={persona.avatarInitials || getPersonaInitials(persona.name)}
                onClick={() => handlePersonaClick(persona.id)}
                disabled={isLoading}
              />
            ))
          ) : (
            <div className="personas-empty">
              <p className="empty-icon">👤</p>
              <p className="empty-title">
                {search ? "No personas found" : "No personas yet"}
              </p>
              <p className="empty-subtitle">
                {search
                  ? "Try a different search term"
                  : "Create your first persona by uploading a WhatsApp chat export"}
              </p>
              {!search ? (
                <button className="personas-new-btn" onClick={handleNewPersona}>
                  Create First Persona
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
