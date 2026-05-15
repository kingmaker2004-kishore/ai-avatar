import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  API_BASE_URL,
  fetchApi,
  type BootstrapResponse,
  type Conversation,
  type PersonaSummary,
  type SavedPersona,
  type StoredMessage
} from "./api";
import PersonaSetup from "./PersonaSetup";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./Login";

const ENABLE_AVATAR = import.meta.env.VITE_ENABLE_AVATAR === "true";
const CURRENT_CONVERSATION_STORAGE_KEY_PREFIX = "persona-avatar-current-conversation-id";
const LiveAvatarComponent = lazy(() => import("./LiveAvatar"));

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function toChatMessages(messages: StoredMessage[]) {
  return messages.map((message) => ({
    id: crypto.randomUUID(),
    role: message.role as "user" | "assistant",
    text: message.content
  }));
}

function getConversationStorageKey(personaId: string) {
  return `${CURRENT_CONVERSATION_STORAGE_KEY_PREFIX}:${personaId}`;
}

function getStoredConversationId(personaId: string) {
  if (!personaId) {
    return null;
  }
  const existing = window.localStorage.getItem(getConversationStorageKey(personaId));
  return existing ?? null;
}

function uniqueItems(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

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

function formatCompactTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Recent";
  }
  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  personaInitials
}: {
  message: ChatMessage;
  personaInitials: string;
}) {
  return (
    <article className={`chat-row ${message.role === "user" ? "row-user" : "row-ai"}`}>
      {message.role === "assistant" ? <div className="bubble-avatar">{personaInitials}</div> : null}
      <div className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}>
        <p>{message.text}</p>
      </div>
    </article>
  );
});

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppContent() {
  const { isLoggedIn, isSessionLoading } = useAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return (
      <main className="app-shell">
        <section className="panel setup-panel route-fade">
          <div className="hero-copy">
            <p className="eyebrow">Persona Session</p>
            <h1>Restoring Session</h1>
            <p className="subtitle">Checking your saved login and workspace.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="route-fade" key={location.pathname}>
      <Routes location={location}>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/personas" replace /> : <Login />} />
        <Route path="/personas" element={isLoggedIn ? <SavedPersonasPage /> : <Navigate to="/login" replace />} />
        <Route path="/persona/new" element={isLoggedIn ? <NewPersonaPage /> : <Navigate to="/login" replace />} />
        <Route path="/chat/:personaId" element={isLoggedIn ? <ChatPage /> : <Navigate to="/login" replace />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/personas" : "/login"} replace />} />
        <Route path="*" element={<Navigate to={isLoggedIn ? "/personas" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

function SavedPersonasPage() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<SavedPersona[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { response, data } = await fetchApi("/api/persona/bootstrap");
        if (!response.ok || !mounted) {
          return;
        }
        const bootstrap = data as BootstrapResponse;
        setPersonas(bootstrap.personas ?? []);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load personas.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const openPersona = async (personaId: string) => {
    const { response, data } = await fetchApi("/api/persona/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId })
    });
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to open persona.");
    }
    navigate(`/chat/${personaId}`);
  };

  const filtered = personas.filter((persona) => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return `${persona.name} ${persona.preview} ${persona.summary}`.toLowerCase().includes(q);
  });

  return (
    <main className="persona-library-shell">
      <section className="persona-library-main">
        <div className="library-topbar">
          <h1>Saved Personas</h1>
          <button className="primary-action" onClick={() => navigate("/persona/new")}>
            New Persona
          </button>
        </div>
        <label className="library-search">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search personas" />
        </label>
        <div className="saved-persona-list">
          {isLoading ? <p className="empty-library-copy">Loading personas...</p> : null}
          {!isLoading && filtered.length === 0 ? <p className="empty-library-copy">No saved personas yet.</p> : null}
          {filtered.map((persona) => (
            <button key={persona.id} className="saved-persona-card" onClick={() => void openPersona(persona.id)}>
              <div className="saved-persona-avatar">{persona.avatarInitials || "PA"}</div>
              <div className="saved-persona-copy">
                <strong>{persona.name}</strong>
                <span>Last active: {formatCompactTimestamp(persona.lastActive)}</span>
                <p>{persona.chatCount} chats · Uploaded {formatCompactTimestamp(persona.createdAt)}</p>
                <small>{persona.preview || persona.summary}</small>
              </div>
            </button>
          ))}
        </div>
        {error ? <p className="message error">{error}</p> : null}
      </section>
    </main>
  );
}

function NewPersonaPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  return (
    <main className="app-shell">
      <PersonaSetup
        compactOnly
        onError={setError}
        onReady={(persona) => {
          navigate(`/chat/${persona.id}`);
        }}
      />
      {error ? <p className="message error">{error}</p> : null}
    </main>
  );
}

function ChatPage() {
  const { personaId = "" } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const [personaName, setPersonaName] = useState("Persona Avatar");
  const [personaSummary, setPersonaSummary] = useState("");
  const [activePersonaId, setActivePersonaId] = useState("");
  const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);
  const [groundingItems, setGroundingItems] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const personaInitials = getPersonaInitials(personaName);

  const persistSessionState = async (nextState: {
    currentPersonaId?: string;
    currentConversationId?: string | null;
    sidebarHistoryOpen?: boolean;
  }) => {
    try {
      await fetchApi("/api/session/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextState)
      });
    } catch {
      // no-op
    }
  };

  const loadConversations = async () => {
    const { response, data } = await fetchApi("/api/conversations");
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load conversations");
    }
    const nextConversations = (data.conversations ?? []) as Conversation[];
    setConversations(nextConversations);
    return nextConversations;
  };

  const loadCurrentConversation = async (id: string) => {
    const { response, data } = await fetchApi(`/api/conversations/${id}`);
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load conversation");
    }
    setMessages(toChatMessages((data.messages ?? []) as StoredMessage[]));
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const { response, data } = await fetchApi("/api/persona/bootstrap");
        if (!response.ok || !mounted) {
          return;
        }
        const bootstrapData = data as BootstrapResponse;
        setSavedPersonas(bootstrapData.personas ?? []);
        if (!personaId) {
          navigate("/personas", { replace: true });
          return;
        }
        const selectRes = await fetchApi("/api/persona/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personaId })
        });
        if (!selectRes.response.ok) {
          navigate("/personas", { replace: true });
          return;
        }
        const persona = selectRes.data.persona as PersonaSummary;
        setPersonaName(persona.name);
        setPersonaSummary(persona.summary);
        setActivePersonaId(persona.id);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to open persona.");
        }
      } finally {
        if (mounted) {
          setIsBootstrapLoading(false);
        }
      }
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [personaId, navigate]);

  useEffect(() => {
    if (!activePersonaId) {
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        const nextConversations = await loadConversations();
        if (!mounted) {
          return;
        }
        const storedConversationId = getStoredConversationId(activePersonaId);
        const fallbackConversationId = nextConversations[0]?.id ?? null;
        const nextConversationId = storedConversationId || fallbackConversationId;
        if (!nextConversationId) {
          setMessages([]);
          return;
        }
        setConversationId(nextConversationId);
        await loadCurrentConversation(nextConversationId);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load chat.");
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [activePersonaId]);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) {
      return;
    }
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || isLoading || !activePersonaId) {
      return;
    }
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: message };
    const assistantMessageId = crypto.randomUUID();
    const streamAbortController = new AbortController();
    streamAbortRef.current?.abort();
    streamAbortRef.current = streamAbortController;
    setMessages((current) => [...current, userMessage, { id: assistantMessageId, role: "assistant", text: "" }]);
    setInput("");
    setPlaybackRequest((value) => value + 1);
    setIsLoading(true);
    setError("");

    const updateAssistantMessage = (text: string) => {
      setMessages((current) =>
        current.map((currentMessage) =>
          currentMessage.id === assistantMessageId ? { ...currentMessage, text } : currentMessage
        )
      );
    };

    const applyChatSuccess = (data: Record<string, unknown>, fallbackReply = "") => {
      const reply = typeof data.reply === "string" ? data.reply : fallbackReply;
      const nextConversationId = typeof data.conversationId === "string" ? data.conversationId : conversationId;
      const grounding = data.grounding as
        | { knowledge?: string[]; memories?: string[]; documents?: string[]; priorChats?: string[] }
        | undefined;
      updateAssistantMessage(reply);
      setResponse(reply);
      if (nextConversationId) {
        setConversationId(nextConversationId);
        window.localStorage.setItem(getConversationStorageKey(activePersonaId), nextConversationId);
        void persistSessionState({
          currentPersonaId: activePersonaId,
          currentConversationId: nextConversationId,
          sidebarHistoryOpen: showConversationList
        });
      }
      setPersonaName((data.personaName as string) ?? personaName);
      setGroundingItems(
        uniqueItems([
          ...(grounding?.knowledge ?? []),
          ...(grounding?.memories ?? []),
          ...(grounding?.documents ?? []),
          ...(grounding?.priorChats ?? [])
        ])
      );
    };

    const sendWithoutStreaming = async () => {
      const { response, data } = await fetchApi("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId })
      });
      if (!response.ok) {
        throw new Error(data.error ?? "Backend error");
      }
      applyChatSuccess(data as Record<string, unknown>);
    };

    try {
      const streamResponse = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
        signal: streamAbortController.signal
      });
      if (!streamResponse.ok || !streamResponse.body) {
        await sendWithoutStreaming();
      } else {
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedReply = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\n\n/);
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const eventLine = block.split(/\n/).find((line) => line.startsWith("event:"));
            const dataLine = block.split(/\n/).find((line) => line.startsWith("data:"));
            const eventName = eventLine?.slice(6).trim() || "message";
            const rawData = dataLine?.slice(5).trim() || "{}";
            const eventData = JSON.parse(rawData) as Record<string, unknown>;
            if (eventName === "token" && typeof eventData.token === "string") {
              streamedReply += eventData.token;
              updateAssistantMessage(streamedReply);
            }
            if (eventName === "done") {
              applyChatSuccess(eventData, streamedReply);
            }
          }
        }
      }
      void loadConversations();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setMessages((current) => current.filter((currentMessage) => currentMessage.id !== assistantMessageId));
        setError(err instanceof Error ? err.message : "Backend error");
      }
    } finally {
      if (streamAbortRef.current === streamAbortController) {
        streamAbortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const startNewConversation = async () => {
    const { response, data } = await fetchApi("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" })
    });
    if (!response.ok) {
      setError(data.error ?? "Failed to create conversation");
      return;
    }
    setConversationId(data.id);
    window.localStorage.setItem(getConversationStorageKey(activePersonaId), data.id);
    setMessages([]);
    setResponse("");
    setGroundingItems([]);
    setInput("");
    void loadConversations();
  };

  const selectConversation = (convId: string) => {
    setConversationId(convId);
    window.localStorage.setItem(getConversationStorageKey(activePersonaId), convId);
    void persistSessionState({
      currentPersonaId: activePersonaId,
      currentConversationId: convId,
      sidebarHistoryOpen: false
    });
    setShowConversationList(false);
    void loadCurrentConversation(convId);
  };

  const selectSavedPersona = (nextPersonaId: string) => {
    navigate(`/chat/${nextPersonaId}`);
  };

  if (isBootstrapLoading) {
    return (
      <main className="app-shell">
        <section className="panel setup-panel">
          <div className="hero-copy">
            <p className="eyebrow">Persona Session</p>
            <h1>Loading Persona</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell dark-shell">
      <section className="chat-product-shell">
        <header className="top-header">
          <button className="icon-btn" onClick={() => setIsSidebarCollapsed((current) => !current)} title="Toggle sidebar">☰</button>
          <div className="persona-title-wrap">
            <div className="persona-avatar">{personaInitials}</div>
            <div>
              <h1>{personaName}</h1>
              <p>{isLoading ? "Typing..." : "Online"}</p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => navigate("/personas")} title="Personas">⌂</button>
          <button className="icon-btn" onClick={() => void logout()} title="Sign out">⎋</button>
        </header>

        <div className="app-layout">
          <aside className={`side-panel ${isSidebarCollapsed ? "collapsed" : ""}`}>
            <section className="compact-card persona-tags">
              <h3>Persona</h3>
              <p className="persona-mini-summary">{personaSummary}</p>
            </section>

            <section className="compact-card">
              <h3>Personas</h3>
              <div className="mini-list persona-history-list">
                {savedPersonas.slice(0, 8).map((persona) => (
                  <button
                    key={persona.id}
                    className={`persona-history-item ${persona.id === activePersonaId ? "active" : ""}`}
                    onClick={() => selectSavedPersona(persona.id)}
                  >
                    <span className="persona-history-avatar">{persona.avatarInitials || getPersonaInitials(persona.name)}</span>
                    <span className="persona-history-copy">
                      <strong>{persona.name}</strong>
                      <small>{persona.chatCount} chats · {formatCompactTimestamp(persona.lastActive)}</small>
                      <em>{persona.preview || persona.summary}</em>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="compact-card action-row">
              <button className="ghost-btn" onClick={() => void startNewConversation()}>New Chat</button>
              <button className="ghost-btn" onClick={() => setShowConversationList((current) => !current)}>History</button>
            </section>

            {showConversationList ? (
              <section className="compact-card">
                <h3>Conversations</h3>
                <div className="mini-list">
                  {conversations.slice(0, 10).map((conv) => (
                    <button
                      key={conv.id}
                      className={`history-item ${conv.id === conversationId ? "active" : ""}`}
                      onClick={() => selectConversation(conv.id)}
                    >
                      <span>{conv.title || "Untitled"}</span>
                      <em>{conv.last_message || "No messages yet"}</em>
                      <small>{conv.message_count} messages · {formatCompactTimestamp(conv.updated_at)}</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>

          <section className="chat-workspace">
            {ENABLE_AVATAR ? (
              <Suspense fallback={<section className="avatar-strip"><p>Loading avatar...</p></section>}>
                <LiveAvatarComponent apiBaseUrl={API_BASE_URL} playbackRequest={playbackRequest} text={response} />
              </Suspense>
            ) : (
              <section className="avatar-strip"><p>LiveAvatar paused. Chat is active.</p></section>
            )}

            <div ref={transcriptRef} className="transcript">
              {messages.length === 0 ? (
                <p className="transcript-empty">Start chatting with {personaName}.</p>
              ) : (
                messages.map((message) => (
                  <ChatMessageRow key={message.id} message={message} personaInitials={personaInitials} />
                ))
              )}
              {isLoading ? (
                <article className="chat-row row-ai">
                  <div className="bubble-avatar">{personaInitials}</div>
                  <div className="chat-bubble assistant typing-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </article>
              ) : null}
            </div>

            <div className="composer modern-composer">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder={`Message ${personaName}...`}
              />
              <button className="send-btn" onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>➤</button>
            </div>

            <section className="insights">
              <button className="insights-toggle" onClick={() => setShowInsights((current) => !current)}>
                <span>Memory & Context</span>
                <span>{showInsights ? "▾" : "▸"}</span>
              </button>
              {showInsights ? (
                <div className="insights-body">
                  {groundingItems.length > 0 ? (
                    groundingItems.map((item) => (
                      <article key={item} className="insight-card">
                        <p>Related to</p>
                        <strong>{item}</strong>
                      </article>
                    ))
                  ) : (
                    <p className="insight-empty">Conversations, memories, and documents are used to ground responses.</p>
                  )}
                </div>
              ) : null}
            </section>
          </section>
        </div>
        {error ? <p className="message error">{error}</p> : null}
      </section>
    </main>
  );
}
