import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  fetchApi,
  type BootstrapResponse,
  type Conversation,
  type KnowledgeDocument,
  type PersonaSummary,
  type StoredMessage
} from "./api";
import PersonaSetup from "./PersonaSetup";

const ENABLE_AVATAR = import.meta.env.VITE_ENABLE_AVATAR === "true";
const CURRENT_CONVERSATION_STORAGE_KEY = "persona-avatar-current-conversation-id";
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

function getStoredConversationId() {
  const existing = window.localStorage.getItem(CURRENT_CONVERSATION_STORAGE_KEY);
  return existing ?? null;
}

function uniqueItems(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

export default function App() {
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
  const [groundingItems, setGroundingItems] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(getStoredConversationId());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [isKnowledgeUploading, setIsKnowledgeUploading] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [isPersonaReady, setIsPersonaReady] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const { response, data } = await fetchApi("/api/conversations");

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load conversations");
    }

    setConversations(data.conversations ?? []);
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
      window.localStorage.removeItem(CURRENT_CONVERSATION_STORAGE_KEY);
      setConversationId(null);
      setMessages([]);
      return;
    }

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load conversation");
    }

    setMessages(toChatMessages((data.messages ?? []) as StoredMessage[]));
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
        await Promise.all([loadConversations(), loadKnowledgeDocuments()]);

        if (!isMounted || !conversationId) {
          return;
        }

        await loadCurrentConversation(conversationId);
      } catch (err) {
        console.warn("Unable to load chat state:", err);
      }
    };

    void loadChatState();

    return () => {
      isMounted = false;
    };
  }, [conversationId, isPersonaReady]);

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

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPlaybackRequest((value) => value + 1);
    setIsLoading(true);
    setError("");

    try {
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

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId as string);
        window.localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, data.conversationId as string);
      }

      const reply = (data.reply as string) ?? "";

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply
        }
      ]);
      setResponse(reply);
      setPersonaName((data.personaName as string) ?? "Persona Avatar");
      setGroundingItems(
        uniqueItems([
          ...((data.grounding?.knowledge ?? []) as string[]),
          ...((data.grounding?.memories ?? []) as string[]),
          ...((data.grounding?.documents ?? []) as string[]),
          ...((data.grounding?.priorChats ?? []) as string[])
        ])
      );

      void refreshConversationsAfterChat();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Backend error");
      setResponse("");
    } finally {
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
      window.localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, data.id);
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
      setMessages([]);
      setResponse("");
      setGroundingItems([]);
      setInput("");
      setConversations([]);
      setKnowledgeDocuments([]);
      setKnowledgeFile(null);
      setShowConversationList(false);
      window.localStorage.removeItem(CURRENT_CONVERSATION_STORAGE_KEY);
      setConversationId(null);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to reset persona");
    }
  };

  const selectConversation = (convId: string) => {
    setConversationId(convId);
    window.localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, convId);
    setShowConversationList(false);
    setResponse("");
    setGroundingItems([]);
    setInput("");
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
            setError("");
            setIsPersonaReady(true);
            setMessages([]);
            setResponse("");
            setGroundingItems([]);
            setInput("");
            setShowConversationList(false);
            window.localStorage.removeItem(CURRENT_CONVERSATION_STORAGE_KEY);
            setConversationId(null);
          }}
        />
        {error ? <p className="message error">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="hero-copy">
          <p className="eyebrow">Persona-Grounded LiveAvatar + RAG</p>
          <h1>{personaName}</h1>
          <p className="subtitle">{personaSummary}</p>
          <div className="conversation-controls">
            <button
              className="btn-text"
              onClick={() => void startNewConversation()}
              title="Start a new conversation with the persona"
            >
              + New Chat
            </button>
            <button
              className="btn-text"
              onClick={() => setShowConversationList(!showConversationList)}
              title="View conversation history"
            >
              History ({conversations.length})
            </button>
            <button
              className="btn-text"
              onClick={() => void resetPersona()}
              title="Re-import a WhatsApp chat and choose a different person"
            >
              Change Persona
            </button>
          </div>
        </div>

        <section className="knowledge-card">
          <div className="knowledge-header">
            <div>
              <span className="knowledge-label">Knowledge Files</span>
              <p className="knowledge-copy">
                Upload text, markdown, notes, specs, or code snippets. The avatar will retrieve
                relevant chunks during chat.
              </p>
            </div>
            <div className="knowledge-upload">
              <input
                type="file"
                accept=".txt,.md,.markdown,.json,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.csv"
                onChange={(event) => setKnowledgeFile(event.target.files?.[0] ?? null)}
              />
              <button
                className="btn-text"
                onClick={() => void uploadKnowledgeFile()}
                disabled={!knowledgeFile || isKnowledgeUploading}
              >
                {isKnowledgeUploading ? "Uploading..." : "Add File"}
              </button>
            </div>
          </div>
          <div className="knowledge-list">
            {knowledgeDocuments.length > 0 ? (
              knowledgeDocuments.map((document) => (
                <article key={document.id} className="knowledge-item">
                  <div>
                    <strong>{document.title}</strong>
                    <p>
                      {document.chunk_count} chunks • {document.char_count.toLocaleString()} chars
                    </p>
                    {document.metadata?.preview ? <p>{document.metadata.preview}</p> : null}
                  </div>
                  <button
                    className="btn-text"
                    onClick={() => void deleteKnowledgeDocument(document.id)}
                    title="Remove this knowledge file"
                  >
                    Remove
                  </button>
                </article>
              ))
            ) : (
              <p className="knowledge-empty">
                No RAG files yet. Upload one to let the avatar answer from your own docs too.
              </p>
            )}
          </div>
        </section>

        {showConversationList && conversations.length > 0 ? (
          <div className="conversation-list">
            <h3>Conversation History</h3>
            <div className="conversations">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`conversation-item ${conv.id === conversationId ? "active" : ""}`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="conv-title">{conv.title}</div>
                  <div className="conv-meta">
                    {conv.message_count} messages • {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {ENABLE_AVATAR ? (
          <Suspense
            fallback={
              <section className="avatar-card avatar-disabled">
                <div className="avatar-meta">
                  <p className="status">Loading avatar module...</p>
                </div>
              </section>
            }
          >
            <LiveAvatarComponent
              apiBaseUrl={API_BASE_URL}
              playbackRequest={playbackRequest}
              text={response}
            />
          </Suspense>
        ) : (
          <section className="avatar-card avatar-disabled">
            <div className="avatar-meta">
              <p className="status">
                Avatar playback is paused. This session is running in LLM-only mode.
              </p>
            </div>
          </section>
        )}

        <div ref={transcriptRef} className="transcript">
          {messages.length === 0 ? (
            <p className="transcript-empty">
              Start a conversation. Replies will stay grounded in the chosen person&apos;s
              WhatsApp style, the current thread, and earlier chats with the same user.
            </p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}
              >
                <span>{message.role === "user" ? "You" : personaName}</span>
                <p>{message.text}</p>
              </article>
            ))
          )}

          {isLoading ? (
            <article className="chat-bubble assistant pending">
              <span>{personaName}</span>
              <p>Thinking...</p>
            </article>
          ) : null}
        </div>

        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void sendMessage();
              }
            }}
            placeholder={`Talk to ${personaName}...`}
          />

          <button onClick={() => void sendMessage()} disabled={isLoading || !input.trim()}>
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </div>

        {error ? <p className="message error">{error}</p> : null}

        <div className="response-card">
          <span>Grounding</span>
          <p>
            {groundingItems.length > 0
              ? "This reply was grounded using the persona style, any matching uploaded documents, and relevant prior-chat context."
              : "Persona style clues, uploaded document matches, and relevant prior-chat context will appear here after a response."}
          </p>
          <div className="grounding-tags">
            {groundingItems.map((item) => (
              <span key={item} className="grounding-tag">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
