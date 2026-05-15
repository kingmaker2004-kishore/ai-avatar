import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  API_BASE_URL,
  fetchApi,
  type BootstrapResponse,
  type Conversation,
  type KnowledgeDocument,
  type SavedPersona,
  type PersonaSummary,
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

function applyPersonaDetails(
  persona: PersonaSummary,
  setPersonaName: (value: string) => void,
  setPersonaSummary: (value: string) => void
) {
  setPersonaName(persona.name || "Persona Avatar");
  setPersonaSummary(
    persona.summary ||
      "Grounded in the current chat, earlier chats, memory videos, and a structured knowledge base."
  );
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
  const { isLoggedIn, logout, isSessionLoading } = useAuth();
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
        <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/*" element={isLoggedIn ? <ChatApp logout={logout} /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
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

function ChatApp({ logout }: { logout: () => Promise<void> }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const [personaName, setPersonaName] = useState("Persona Avatar");
  const [personaSummary, setPersonaSummary] = useState(
    "Grounded in the current chat, earlier chats, memory videos, and a structured knowledge base."
  );
  const [activePersonaId, setActivePersonaId] = useState("");
  const [groundingItems, setGroundingItems] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [isKnowledgeUploading, setIsKnowledgeUploading] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [isPersonaReady, setIsPersonaReady] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const knowledgeFileInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const personaInitials = getPersonaInitials(personaName);

  async function loadConversations() {
    const { response, data } = await fetchApi("/api/conversations");

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load conversations");
    }

    const nextConversations = (data.conversations ?? []) as Conversation[];
    setConversations(nextConversations);
    return nextConversations;
  }

  async function loadKnowledgeDocuments() {
    const { response, data } = await fetchApi("/api/rag/documents");

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load knowledge documents");
    }

    setKnowledgeDocuments((data.documents ?? []) as KnowledgeDocument[]);
  }

  async function loadCurrentConversation(activeConversationId: string) {
    const { response, data } = await fetchApi(`/api/conversations/${activeConversationId}`);

    if (response.status === 404) {
      if (activePersonaId) {
        window.localStorage.removeItem(getConversationStorageKey(activePersonaId));
      }
      setConversationId(null);
      setMessages([]);
      return;
    }

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load conversation");
    }

    setMessages(toChatMessages((data.messages ?? []) as StoredMessage[]));
  }

  async function persistSessionState(nextState: {
    currentPersonaId?: string;
    currentConversationId?: string | null;
    sidebarHistoryOpen?: boolean;
  }) {
    try {
      await fetchApi("/api/session/state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(nextState)
      });
    } catch (err) {
      console.warn("Unable to persist session state:", err);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadBootstrap = async () => {
      try {
        const { response, data } = await fetchApi("/api/persona/bootstrap");

        if (!response.ok || !isMounted) {
          return;
        }

        const bootstrap = data as BootstrapResponse;
        applyPersonaDetails(bootstrap.persona, setPersonaName, setPersonaSummary);
        setSavedPersonas(bootstrap.personas ?? []);
        setActivePersonaId(bootstrap.currentPersonaId ?? bootstrap.persona.id ?? "");
        setConversationId(bootstrap.lastConversationId ?? null);
        setShowConversationList(Boolean(bootstrap.sidebarHistoryOpen));
        setIsPersonaReady(!bootstrap.requiresSetup);
      } catch (err) {
        console.warn("Unable to load bootstrap state:", err);
        setError(err instanceof Error ? err.message : "Unable to load persona setup.");
      } finally {
        if (isMounted) {
          setIsBootstrapLoading(false);
        }
      }
    };

    void loadBootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isPersonaReady) {
      return;
    }

    let isMounted = true;

    const loadChatState = async () => {
      try {
        const [nextConversations] = await Promise.all([loadConversations(), loadKnowledgeDocuments()]);

        if (!isMounted) {
          return;
        }

        const storedConversationId = conversationId || getStoredConversationId(activePersonaId);
        const fallbackConversationId = nextConversations[0]?.id ?? null;
        const nextConversationId = storedConversationId || fallbackConversationId;

        if (!nextConversationId) {
          setMessages([]);
          return;
        }

        if (nextConversationId !== conversationId) {
          setConversationId(nextConversationId);
        }

        await loadCurrentConversation(nextConversationId);
      } catch (err) {
        console.warn("Unable to load chat state:", err);
      }
    };

    void loadChatState();

    return () => {
      isMounted = false;
    };
  }, [conversationId, isPersonaReady, activePersonaId]);

  useEffect(() => {
    const transcript = transcriptRef.current;

    if (!transcript) {
      return;
    }

    transcript.scrollTo({
      top: transcript.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const message = input.trim();

    if (!message || isLoading || !isPersonaReady) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: message
    };
    const assistantMessageId = crypto.randomUUID();
    const streamAbortController = new AbortController();

    streamAbortRef.current?.abort();
    streamAbortRef.current = streamAbortController;
    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        text: ""
      }
    ]);
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
      const nextConversationId =
        typeof data.conversationId === "string" ? data.conversationId : conversationId;
      const grounding = data.grounding as
        | { knowledge?: string[]; memories?: string[]; documents?: string[]; priorChats?: string[] }
        | undefined;

      updateAssistantMessage(reply);
      setResponse(reply);

      if (nextConversationId) {
        setConversationId(nextConversationId);
        if (activePersonaId) {
          window.localStorage.setItem(getConversationStorageKey(activePersonaId), nextConversationId);
          void persistSessionState({
            currentPersonaId: activePersonaId,
            currentConversationId: nextConversationId,
            sidebarHistoryOpen: showConversationList
          });
        }
      }

      setPersonaName((data.personaName as string) ?? "Persona Avatar");
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          conversationId
        })
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          conversationId
        }),
        signal: streamAbortController.signal
      });

      if (!streamResponse.ok || !streamResponse.body) {
        let streamError = `Streaming chat failed (${streamResponse.status})`;
        try {
          const errorData = await streamResponse.clone().json();
          streamError = errorData.error ?? streamError;
        } catch {
          const errorText = await streamResponse.text().catch(() => "");
          streamError = errorText || streamError;
        }

        if (streamResponse.status === 401) {
          throw new Error(streamError);
        }

        console.warn("Streaming unavailable, using non-streaming chat:", streamError);
        await sendWithoutStreaming();
        void refreshConversationsAfterChat();
        return;
      }

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedReply = "";

      const handleStreamEvent = (eventName: string, eventData: Record<string, unknown>) => {
        if (eventName === "meta" && typeof eventData.conversationId === "string") {
          setConversationId(eventData.conversationId);
          if (activePersonaId) {
            window.localStorage.setItem(getConversationStorageKey(activePersonaId), eventData.conversationId);
          }
        }

        if (eventName === "token" && typeof eventData.token === "string") {
          streamedReply += eventData.token;
          updateAssistantMessage(streamedReply);
        }

        if (eventName === "done") {
          applyChatSuccess(eventData, streamedReply);
        }
      };

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

          if (eventName === "error") {
            throw new Error(typeof eventData.error === "string" ? eventData.error : "Backend error");
          }

          handleStreamEvent(eventName, eventData);
        }
      }

      void refreshConversationsAfterChat();
    } catch (err) {
      console.error(err);
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setMessages((current) => current.filter((currentMessage) => currentMessage.id !== assistantMessageId));
      setError(err instanceof Error ? err.message : "Backend error");
      setResponse("");
    } finally {
      if (streamAbortRef.current === streamAbortController) {
        streamAbortRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const refreshConversationsAfterChat = async () => {
    try {
      await loadConversations();
    } catch (err) {
      console.warn("Failed to refresh conversations:", err);
    }
  };

  const uploadKnowledgeFile = async () => {
    if (!knowledgeFile || isKnowledgeUploading) {
      return;
    }

    setIsKnowledgeUploading(true);
    setError("");

    try {
      const content = await knowledgeFile.text();

      if (!content.trim()) {
        throw new Error("That file is empty.");
      }

      const { response, data } = await fetchApi("/api/rag/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: knowledgeFile.name,
          content,
          sourceType: "file-upload"
        })
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload knowledge file");
      }

      setKnowledgeFile(null);
      if (knowledgeFileInputRef.current) {
        knowledgeFileInputRef.current.value = "";
      }
      await loadKnowledgeDocuments();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to upload knowledge file");
    } finally {
      setIsKnowledgeUploading(false);
    }
  };

  const deleteKnowledgeDocument = async (documentId: string) => {
    try {
      const { response, data } = await fetchApi(`/api/rag/documents/${documentId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete knowledge document");
      }

      setKnowledgeDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete knowledge document");
    }
  };

  const startNewConversation = async () => {
    try {
      const { response: res, data } = await fetchApi("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: "Untitled" })
      });

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create conversation");
      }

      setConversationId(data.id);
      if (activePersonaId) {
        window.localStorage.setItem(getConversationStorageKey(activePersonaId), data.id);
        void persistSessionState({
          currentPersonaId: activePersonaId,
          currentConversationId: data.id,
          sidebarHistoryOpen: showConversationList
        });
      }
      setMessages([]);
      setResponse("");
      setGroundingItems([]);
      setInput("");

      void refreshConversationsAfterChat();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  };

  const resetPersona = async () => {
    try {
      const { response, data } = await fetchApi("/api/persona", {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to reset persona");
      }

      setIsPersonaReady(false);
      setIsBootstrapLoading(false);
      setActivePersonaId("");
      setMessages([]);
      setResponse("");
      setGroundingItems([]);
      setInput("");
      setConversations([]);
      setKnowledgeDocuments([]);
      setSavedPersonas([]);
      setKnowledgeFile(null);
      if (knowledgeFileInputRef.current) {
        knowledgeFileInputRef.current.value = "";
      }
      setShowConversationList(false);
      setConversationId(null);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to reset persona");
    }
  };

  const selectConversation = (convId: string) => {
    setConversationId(convId);
    if (activePersonaId) {
      window.localStorage.setItem(getConversationStorageKey(activePersonaId), convId);
      void persistSessionState({
        currentPersonaId: activePersonaId,
        currentConversationId: convId,
        sidebarHistoryOpen: false
      });
    }
    setShowConversationList(false);
    setResponse("");
    setGroundingItems([]);
    setInput("");
  };

  const selectSavedPersona = async (personaId: string) => {
    if (!personaId || personaId === activePersonaId || isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");

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

      const persona = data.persona as PersonaSummary;
      applyPersonaDetails(persona, setPersonaName, setPersonaSummary);
      setSavedPersonas((data.personas ?? []) as SavedPersona[]);
      setActivePersonaId(data.currentPersonaId ?? persona.id ?? personaId);
      setConversationId(getStoredConversationId(personaId));
      void persistSessionState({
        currentPersonaId: data.currentPersonaId ?? persona.id ?? personaId,
        currentConversationId: getStoredConversationId(personaId),
        sidebarHistoryOpen: false
      });
      setMessages([]);
      setResponse("");
      setGroundingItems([]);
      setKnowledgeDocuments([]);
      setConversations([]);
      setInput("");
      setShowConversationList(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to open that persona.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapLoading) {
    return (
      <main className="app-shell">
        <section className="panel setup-panel">
          <div className="hero-copy">
            <p className="eyebrow">WhatsApp Persona Setup</p>
            <h1>Loading Persona</h1>
            <p className="subtitle">Checking whether this browser already has a saved persona.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!isPersonaReady) {
    return (
      <main className="app-shell">
        <PersonaSetup
          onError={setError}
          onReady={(persona) => {
            applyPersonaDetails(persona, setPersonaName, setPersonaSummary);
            setActivePersonaId(persona.id);
            setSavedPersonas((current) => {
              const existing = current.filter((savedPersona) => savedPersona.id !== persona.id);
              return [
                {
                  id: persona.id,
                  name: persona.name,
                  avatarInitials: getPersonaInitials(persona.name),
                  summary: persona.summary,
                  styleTags: persona.styleTags ?? [],
                  createdAt: new Date().toISOString(),
                  lastActive: new Date().toISOString(),
                  chatCount: 0,
                  preview: persona.summary,
                  conversations: [],
                  files: []
                },
                ...existing
              ];
            });
            setError("");
            setIsPersonaReady(true);
            setMessages([]);
            setResponse("");
            setGroundingItems([]);
            setConversations([]);
            setInput("");
            setShowConversationList(false);
            setConversationId(null);
          }}
        />
        {error ? <p className="message error">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="app-shell dark-shell">
      <section className="chat-product-shell">
        <header className="top-header">
          <button
            className="icon-btn"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div className="persona-title-wrap">
            <div className="persona-avatar pulse-avatar">{getPersonaInitials(personaName)}</div>
            <div>
              <h1>{personaName}</h1>
              <p>{isLoading ? "Typing..." : "Online"}</p>
            </div>
          </div>
          <button className="icon-btn" onClick={() => void logout()} title="Sign out">
            🚪
          </button>
          <button className="icon-btn" onClick={() => void resetPersona()} title="Persona settings">
            ⋯
          </button>
        </header>

        <div className="app-layout">
          <aside className={`side-panel ${isSidebarCollapsed ? "collapsed" : ""}`}>
            <section className="compact-card persona-tags">
              <h3>Persona</h3>
              <p className="persona-mini-summary">{personaSummary}</p>
              <div className="tag-row">
                <span>Short replies</span>
                <span>Casual tone</span>
                <span>Work-focused</span>
                <span>WhatsApp style</span>
              </div>
            </section>

            {savedPersonas.length > 0 ? (
              <section className="compact-card">
                <h3>Saved Personas</h3>
                <div className="mini-list persona-history-list">
                  {savedPersonas.slice(0, 6).map((persona) => (
                    <button
                      key={persona.id}
                      className={`persona-history-item ${persona.id === activePersonaId ? "active" : ""}`}
                      onClick={() => void selectSavedPersona(persona.id)}
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
            ) : null}

            <section className="compact-card action-row">
              <button className="ghost-btn" onClick={() => void startNewConversation()}>
                New Chat
              </button>
              <button
                className="ghost-btn"
                onClick={() =>
                  setShowConversationList((current) => {
                    const next = !current;
                    void persistSessionState({
                      currentPersonaId: activePersonaId,
                      currentConversationId: conversationId,
                      sidebarHistoryOpen: next
                    });
                    return next;
                  })
                }
              >
                History
              </button>
            </section>

            <section className="compact-card">
              <h3>Knowledge Files</h3>
              <div className="upload-row">
                <input
                  ref={knowledgeFileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.json,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.csv"
                  onChange={(event) => setKnowledgeFile(event.target.files?.[0] ?? null)}
                />
                <button className="ghost-btn" onClick={() => void uploadKnowledgeFile()} disabled={!knowledgeFile || isKnowledgeUploading}>
                  {isKnowledgeUploading ? "Uploading..." : "Add"}
                </button>
              </div>
              <div className="mini-list">
                {knowledgeDocuments.slice(0, 4).map((document) => (
                  <article key={document.id} className="file-chip">
                    <div>
                      <strong>{document.title}</strong>
                      <p>{document.chunk_count} chunks</p>
                    </div>
                    <button className="remove-x" onClick={() => void deleteKnowledgeDocument(document.id)} title="Remove file">
                      ×
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {showConversationList ? (
              <section className="compact-card">
                <h3>Conversations</h3>
                <div className="mini-list">
                  {conversations.slice(0, 8).map((conv) => (
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
              <Suspense
                fallback={
                  <section className="avatar-strip">
                    <p>Loading avatar...</p>
                  </section>
                }
              >
                <LiveAvatarComponent apiBaseUrl={API_BASE_URL} playbackRequest={playbackRequest} text={response} />
              </Suspense>
            ) : (
              <section className="avatar-strip">
                <p>LiveAvatar paused. Chat is active.</p>
              </section>
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
                  <div className="bubble-avatar">{getPersonaInitials(personaName)}</div>
                  <div className="chat-bubble assistant typing-bubble">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </article>
              ) : null}
            </div>

            <div className="composer modern-composer">
              <button className="icon-btn" title="Attach file">📎</button>
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
              <button className="icon-btn" title="Voice input">🎤</button>
              <button className="send-btn" onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>
                ➤
              </button>
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
                        <p>📌 Related to</p>
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
