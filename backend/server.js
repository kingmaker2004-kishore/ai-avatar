import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import {
  analyzePersonaReplyNeed,
  buildDeterministicPersonaReply,
  buildHeuristicPersonaReply,
  buildPersonaPrompt,
  createFallbackPersonaProfile,
  getGroundingSummary,
  loadPersonaProfile,
  normalizePersonaProfile,
  postProcessPersonaReply,
  resolveProfilePath,
  retrievePersonaContext
} from "./personaEngine.js";
import { initializeDatabase } from "./db/index.js";
import {
  buildPersonaProfileFromWhatsApp,
  enrichImportedPersonaProfile,
  getWhatsAppParticipants,
  parseWhatsAppChat
} from "./whatsappPersona.js";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Initialize database
const db = initializeDatabase();

loadEnvFile(path.join(backendDirectory, ".env"));

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));

const port = Number(process.env.PORT ?? 5000);
const liveAvatarApiKey = process.env.LIVEAVATAR_API_KEY ?? process.env.HEYGEN_API_KEY;
const personaProfilePath = process.env.PERSONA_PROFILE_PATH;
const personaHistoryTurns = Number(process.env.PERSONA_HISTORY_TURNS ?? 6);
const personaMaxContextItems = Number(process.env.PERSONA_MAX_CONTEXT_ITEMS ?? 6);
const personaSharedConversationCount = Number(process.env.PERSONA_SHARED_CONVERSATIONS ?? 3);
const personaSharedConversationTurns = Number(process.env.PERSONA_SHARED_CONVERSATION_TURNS ?? 4);
const sessionSecret = process.env.SESSION_SECRET ?? "local-dev-persona-session-secret";
const userSessionCookieName = "persona_user_session";

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const entries = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const entry of entries) {
    const trimmed = entry.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getLiveAvatarConfig() {
  return {
    mode: process.env.LIVEAVATAR_MODE ?? "FULL",
    avatar_id: process.env.LIVEAVATAR_AVATAR_ID,
    avatar_persona: {
      voice_id: process.env.LIVEAVATAR_VOICE_ID,
      context_id: process.env.LIVEAVATAR_CONTEXT_ID,
      language: process.env.LIVEAVATAR_LANGUAGE ?? "en"
    }
  };
}

function missingEnvVars(envVars) {
  return envVars.filter((envVar) => !process.env[envVar]);
}

function isJwtLike(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

function getBasePersonaProfile() {
  return loadPersonaProfile(backendDirectory, personaProfilePath);
}

function getBasePersonaProfilePath() {
  return resolveProfilePath(backendDirectory, personaProfilePath);
}

function writeBasePersonaProfile(rawProfile) {
  const resolvedPath = getBasePersonaProfilePath();
  const directory = path.dirname(resolvedPath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  fs.writeFileSync(resolvedPath, `${JSON.stringify(rawProfile, null, 2)}\n`, "utf8");
}

function serializeProfile(value) {
  return JSON.stringify(value ?? null);
}

function upgradeImportedPersonaProfile(rawProfile) {
  const upgradedProfile = enrichImportedPersonaProfile(rawProfile);

  return {
    profile: upgradedProfile,
    changed: serializeProfile(rawProfile) !== serializeProfile(upgradedProfile)
  };
}

function readBasePersonaRawProfile() {
  const resolvedPath = getBasePersonaProfilePath();

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch {
    return null;
  }
}

function getConfiguredBasePersonaProfile() {
  const rawBaseProfile = readBasePersonaRawProfile();

  if (!rawBaseProfile || typeof rawBaseProfile !== "object") {
    return getBasePersonaProfile();
  }

  const normalizedBase = normalizePersonaProfile(rawBaseProfile, getBasePersonaProfilePath());

  if (isNeutralFallbackProfile(normalizedBase)) {
    return normalizedBase;
  }

  const { profile: upgradedBaseProfile, changed } = upgradeImportedPersonaProfile(rawBaseProfile);

  if (changed) {
    writeBasePersonaProfile(upgradedBaseProfile);
  }

  return normalizePersonaProfile(upgradedBaseProfile, getBasePersonaProfilePath());
}

function isNeutralFallbackProfile(profile) {
  return (
    profile.person.name === "Persona Avatar" &&
    profile.person.role === "trusted companion" &&
    profile.knowledgeBase.length === 0 &&
    profile.memoryVideos.length === 0 &&
    profile.chatExamples.length === 0 &&
    profile.styleSamples.length === 0
  );
}

function migrateSavedWhatsAppPersonas() {
  const userProfiles = db.getAllUserProfiles();
  let migratedCount = 0;

  for (const userProfile of userProfiles) {
    const preferences = userProfile.preferences ?? {};
    const savedPersona = preferences.persona;

    if (
      savedPersona?.source !== "whatsapp-import" ||
      !savedPersona.profile ||
      typeof savedPersona.profile !== "object"
    ) {
      continue;
    }

    const { profile: upgradedProfile, changed } = upgradeImportedPersonaProfile(savedPersona.profile);

    if (!changed) {
      continue;
    }

    db.updateUserPreferences(userProfile.id, {
      ...preferences,
      persona: {
        ...savedPersona,
        profile: upgradedProfile
      }
    });
    migratedCount += 1;
  }

  return migratedCount;
}

function getUserPersonaState(userId) {
  const profile = db.getUserProfile(userId);
  const preferences = profile.preferences ?? {};
  const savedPersona = preferences.persona;

  if (savedPersona?.profile && typeof savedPersona.profile === "object") {
    const {
      profile: upgradedSavedProfile,
      changed: savedProfileChanged
    } =
      savedPersona.source === "whatsapp-import"
        ? upgradeImportedPersonaProfile(savedPersona.profile)
        : { profile: savedPersona.profile, changed: false };

    if (savedProfileChanged) {
      const upgradedPreferences = {
        ...preferences,
        persona: {
          ...savedPersona,
          profile: upgradedSavedProfile
        }
      };

      db.updateUserPreferences(userId, upgradedPreferences);
      writeBasePersonaProfile(upgradedSavedProfile);
    }

    return {
      isConfigured: true,
      source: savedPersona.source ?? "whatsapp-import",
      selectedPerson: savedPersona.selectedPerson ?? upgradedSavedProfile.person?.name ?? "",
      profile: normalizePersonaProfile(upgradedSavedProfile, "user-preferences")
    };
  }

  const baseProfile = getConfiguredBasePersonaProfile();
  const hasConfiguredBaseProfile = !isNeutralFallbackProfile(baseProfile);

  if (hasConfiguredBaseProfile) {
    return {
      isConfigured: true,
      source: "persona-profile",
      selectedPerson: baseProfile.person.name,
      profile: baseProfile
    };
  }

  return {
    isConfigured: false,
    source: "default",
    selectedPerson: "",
    profile: baseProfile
  };
}

function saveUserPersona(userId, selectedPerson, rawProfile) {
  const { profile: upgradedProfile } = upgradeImportedPersonaProfile(rawProfile);
  const currentProfile = db.getUserProfile(userId);
  const nextPreferences = {
    ...(currentProfile.preferences ?? {}),
    persona: {
      source: "whatsapp-import",
      selectedPerson,
      configuredAt: new Date().toISOString(),
      profile: upgradedProfile
    }
  };

  writeBasePersonaProfile(upgradedProfile);
  db.updateUserPreferences(userId, nextPreferences);
  return getUserPersonaState(userId);
}

function clearUserPersona(userId) {
  const currentProfile = db.getUserProfile(userId);
  const nextPreferences = { ...(currentProfile.preferences ?? {}) };
  delete nextPreferences.persona;
  writeBasePersonaProfile(createFallbackPersonaProfile());
  db.updateUserPreferences(userId, nextPreferences);
}

function buildPersonaResponse(personaState) {
  return {
    configured: personaState.isConfigured,
    source: personaState.source,
    selectedPerson: personaState.selectedPerson,
    name: personaState.profile.person.name,
    role: personaState.profile.person.role,
    summary: personaState.profile.person.summary,
    sourcePath: personaState.profile.sourcePath
  };
}

const migratedSavedPersonaCount = migrateSavedWhatsAppPersonas();

if (migratedSavedPersonaCount > 0) {
  console.log(`Migrated ${migratedSavedPersonaCount} saved WhatsApp persona profiles.`);
}

function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

function signSessionValue(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function isValidSignedValue(value, signature) {
  if (!value || !signature) {
    return false;
  }

  const expected = signSessionValue(value);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function setUserSessionCookie(res, userId) {
  const payload = `${userId}.${signSessionValue(userId)}`;
  res.cookie(userSessionCookieName, payload, {
    httpOnly: true,
    path: "/",
    sameSite: "lax"
  });
}

function getUserId(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies[userSessionCookieName];

  if (sessionCookie) {
    const separatorIndex = sessionCookie.lastIndexOf(".");

    if (separatorIndex !== -1) {
      const userId = sessionCookie.slice(0, separatorIndex);
      const signature = sessionCookie.slice(separatorIndex + 1);

      if (isValidSignedValue(userId, signature)) {
        return userId;
      }
    }
  }

  const userId = crypto.randomUUID();
  setUserSessionCookie(res, userId);
  return userId;
}

function getOrCreateConversation(db, userId, conversationId) {
  if (!conversationId || typeof conversationId !== "string" || !conversationId.trim()) {
    return db.createConversation(userId);
  }

  const normalizedConversationId = conversationId.trim();
  const conversation = db.getConversation(normalizedConversationId, userId);

  if (!conversation) {
    return db.createConversation(userId);
  }

  return conversation;
}

function updateConversationTitle(db, userId, conversationId) {
  const conversation = db.getConversation(conversationId, userId);

  const shouldAutoTitle =
    conversation &&
    (!conversation.title || ["Untitled", "New Conversation"].includes(conversation.title.trim()));

  if (!shouldAutoTitle) {
    return;
  }

  const firstUserMessage = (conversation.messages || []).find((message) => message.role === "user");

  if (!firstUserMessage) {
    return;
  }

  const words = firstUserMessage.content.split(/\s+/);
  const title = words.slice(0, 8).join(" ");
  db.updateConversationTitle(conversationId, userId, title);
}

function compactWhitespace(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function truncateText(value, maxLength = 220) {
  const normalized = compactWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatConversationUpdatedAt(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "unknown";
}

function getConversationDisplayTitle(value) {
  return compactWhitespace(value) || "Untitled";
}

function formatConversationMemories(memories) {
  if (!Array.isArray(memories) || memories.length === 0) {
    return "None.";
  }

  return memories
    .map((conversation, index) => {
      const title = getConversationDisplayTitle(conversation.title);
      const updatedAt = formatConversationUpdatedAt(conversation.updated_at);
      const transcript = conversation.messages
        .map(
          (message) =>
            `${message.role === "user" ? "User" : "Assistant"}: ${truncateText(message.content)}`
        )
        .join("\n");

      return `Conversation ${index + 1} | ${title} | updated ${updatedAt}\n${transcript}`;
    })
    .join("\n\n");
}

function buildConversationMemoryPrompt(memories) {
  if (!Array.isArray(memories) || memories.length === 0) {
    return "";
  }

  return `
Cross-chat memory from this same user:
- These snippets come from earlier conversations with the same user.
- Use them when the user refers to something discussed in another chat or asks what you remember from previous chats.
- Only claim to remember details that are supported by these snippets.
- If the snippets are insufficient, say so naturally instead of pretending to remember.

Earlier conversation snippets:
${formatConversationMemories(memories)}
`.trim();
}

function formatPriorChats(memories) {
  return memories.map((conversation) => {
    const title = getConversationDisplayTitle(conversation.title);
    const updatedAt = formatConversationUpdatedAt(conversation.updated_at);
    return `${title} (${updatedAt})`;
  });
}

function buildGroundingPayload(retrievedContext, sharedConversationMemories) {
  return {
    ...getGroundingSummary(retrievedContext),
    priorChats: formatPriorChats(sharedConversationMemories)
  };
}

function buildSystemPrompt(profile, retrievedContext, messageNeed, sharedConversationMemories) {
  const customSystemPrompt = process.env.GROQ_SYSTEM_PROMPT?.trim();

  return [
    buildPersonaPrompt(profile, retrievedContext, messageNeed),
    buildConversationMemoryPrompt(sharedConversationMemories),
    customSystemPrompt ? `Additional runtime instructions:\n${customSystemPrompt}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildGroqMessages(systemPrompt, recentMessages, userMessage) {
  return [
    {
      role: "system",
      content: systemPrompt
    },
    ...recentMessages,
    { role: "user", content: userMessage }
  ];
}

function saveConversationReply(db, userId, conversationId, userMessage, reply) {
  db.addMessage(conversationId, "user", userMessage);
  db.addMessage(conversationId, "assistant", reply);
  updateConversationTitle(db, userId, conversationId);
}

function buildChatSuccessResponse({
  reply,
  conversationId,
  userId,
  profile,
  retrievedContext,
  sharedConversationMemories
}) {
  return {
    reply,
    conversationId,
    userId,
    personaName: profile.person.name,
    grounding: buildGroundingPayload(retrievedContext, sharedConversationMemories)
  };
}

async function parseError(response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "ai-avatar-backend",
    message: "Backend server is running.",
    frontendUrl: "http://localhost:5173",
    healthUrl: "/health",
    api: {
      persona: "/api/persona",
      bootstrap: "/api/persona/bootstrap",
      conversations: "/api/conversations",
      chat: "/api/chat",
      liveAvatarSessionToken: "/api/heygen/session-token"
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/persona", (req, res) => {
  const userId = getUserId(req, res);
  const personaState = getUserPersonaState(userId);

  res.json(buildPersonaResponse(personaState));
});

app.get("/api/persona/bootstrap", (req, res) => {
  const userId = getUserId(req, res);
  const personaState = getUserPersonaState(userId);

  res.json({
    userId,
    requiresSetup: !personaState.isConfigured,
    persona: buildPersonaResponse(personaState)
  });
});

app.post("/api/persona/preview-whatsapp", (req, res) => {
  const userId = getUserId(req, res);
  const chatText = typeof req.body?.chatText === "string" ? req.body.chatText : "";
  const messages = parseWhatsAppChat(chatText);
  const participants = getWhatsAppParticipants(messages);

  if (messages.length === 0 || participants.length === 0) {
    return res.status(400).json({
      error: "Could not find WhatsApp messages in that text file."
    });
  }

  return res.json({
    userId,
    participantCount: participants.length,
    messageCount: messages.length,
    participants
  });
});

app.post("/api/persona/configure-whatsapp", (req, res) => {
  const userId = getUserId(req, res);
  const chatText = typeof req.body?.chatText === "string" ? req.body.chatText : "";
  const selectedPerson = typeof req.body?.selectedPerson === "string" ? req.body.selectedPerson.trim() : "";
  const messages = parseWhatsAppChat(chatText);

  if (!selectedPerson) {
    return res.status(400).json({ error: "Selected person is required." });
  }

  if (messages.length === 0) {
    return res.status(400).json({
      error: "Could not find WhatsApp messages in that text file."
    });
  }

  try {
    const rawProfile = buildPersonaProfileFromWhatsApp(messages, selectedPerson);
    const personaState = saveUserPersona(userId, selectedPerson, rawProfile);

    return res.json({
      userId,
      persona: buildPersonaResponse(personaState)
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Unable to create a persona from that chat."
    });
  }
});

app.delete("/api/persona", (req, res) => {
  const userId = getUserId(req, res);
  clearUserPersona(userId);

  return res.json({
    ok: true,
    persona: buildPersonaResponse(getUserPersonaState(userId))
  });
});

// Conversation management endpoints
app.get("/api/conversations", (req, res) => {
  const userId = getUserId(req, res);

  try {
    const conversations = db.getUserConversations(userId);

    return res.json({
      userId,
      conversations
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ error: "Failed to fetch conversations." });
  }
});

app.get("/api/conversations/:id", (req, res) => {
  const userId = getUserId(req, res);
  const { id } = req.params;

  try {
    const conversation = db.getConversation(id, userId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    return res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return res.status(500).json({ error: "Failed to fetch conversation." });
  }
});

app.post("/api/conversations", (req, res) => {
  const userId = getUserId(req, res);
  const { title } = req.body ?? {};

  try {
    const conversation = db.createConversation(userId, title || "Untitled");

    return res.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({ error: "Failed to create conversation." });
  }
});

app.put("/api/conversations/:id", (req, res) => {
  const userId = getUserId(req, res);
  const { id } = req.params;
  const { title } = req.body ?? {};

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  try {
    const updated = db.updateConversationTitle(id, userId, title);

    if (!updated) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Error updating conversation:", error);
    return res.status(500).json({ error: "Failed to update conversation." });
  }
});

app.delete("/api/conversations/:id", (req, res) => {
  const userId = getUserId(req, res);
  const { id } = req.params;

  try {
    const success = db.archiveConversation(id, userId);

    if (!success) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    return res.json({ success: true, conversationId: id });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return res.status(500).json({ error: "Failed to delete conversation." });
  }
});

app.post("/api/heygen/session-token", async (_req, res) => {
  const missing = missingEnvVars([
    "LIVEAVATAR_AVATAR_ID",
    "LIVEAVATAR_VOICE_ID",
    "LIVEAVATAR_CONTEXT_ID"
  ]);

  if (!liveAvatarApiKey) {
    missing.unshift("LIVEAVATAR_API_KEY (or HEYGEN_API_KEY)");
  }

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing LiveAvatar configuration.",
      missing
    });
  }

  try {
    const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "X-API-KEY": liveAvatarApiKey,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(getLiveAvatarConfig())
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to create LiveAvatar session token.",
        details: await parseError(response)
      });
    }

    const data = await response.json();
    const sessionData = data?.data ?? data;
    const sessionToken = sessionData?.session_token;
    const sessionId = sessionData?.session_id;

    if (!isJwtLike(sessionToken)) {
      return res.status(502).json({
        error: "LiveAvatar returned an invalid session token.",
        details: data
      });
    }

    return res.json({
      sessionId,
      sessionToken
    });
  } catch (error) {
    console.error("LiveAvatar token error:", error);

    return res.status(500).json({
      error: "Unable to reach LiveAvatar."
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body?.message?.trim();
  const conversationId = req.body?.conversationId;
  const userId = getUserId(req, res);

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "Missing GROQ_API_KEY."
    });
  }

  try {
    // Ensure user profile exists
    db.getUserProfile(userId);

    // Get or create conversation
    const conversation = getOrCreateConversation(db, userId, conversationId);
    const convId = conversation.id;

    // Get recent message history from database
    const recentMessages = db.getRecentMessages(convId, personaHistoryTurns);
    const sharedConversationMemories = db.getRecentConversationMemories(
      userId,
      convId,
      personaSharedConversationCount,
      personaSharedConversationTurns
    );

    const personaState = getUserPersonaState(userId);
    const profile = personaState.profile;
    const retrievedContext = retrievePersonaContext(
      profile,
      userMessage,
      personaMaxContextItems
    );
    const messageNeed = analyzePersonaReplyNeed(userMessage, recentMessages);
    const deterministicReply = buildDeterministicPersonaReply(userMessage, recentMessages);
    const heuristicReply = profile.defaults.enableHeuristicReplies
      ? buildHeuristicPersonaReply(userMessage, recentMessages, retrievedContext)
      : "";

    if (deterministicReply || heuristicReply) {
      const finalReply = deterministicReply || heuristicReply;
      saveConversationReply(db, userId, convId, userMessage, finalReply);

      return res.json(
        buildChatSuccessResponse({
          reply: finalReply,
          conversationId: convId,
          userId,
          profile,
          retrievedContext,
          sharedConversationMemories
        })
      );
    }

    const systemPrompt = buildSystemPrompt(
      profile,
      retrievedContext,
      messageNeed,
      sharedConversationMemories
    );
    const messages = buildGroqMessages(systemPrompt, recentMessages, userMessage);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        messages,
        temperature: profile.defaults.temperature ?? 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Groq request failed.",
        details: await parseError(response)
      });
    }

    const data = await response.json();
    const rawReply = data?.choices?.[0]?.message?.content?.trim();
    const reply = postProcessPersonaReply(rawReply, retrievedContext);

    if (!reply) {
      return res.status(502).json({
        error: "Groq returned an empty response."
      });
    }

    saveConversationReply(db, userId, convId, userMessage, reply);

    return res.json(
      buildChatSuccessResponse({
        reply,
        conversationId: convId,
        userId,
        profile,
        retrievedContext,
        sharedConversationMemories
      })
    );
  } catch (error) {
    console.error("Groq chat error:", error);

    return res.status(500).json({
      error: "Unable to reach Groq."
    });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
