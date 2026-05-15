import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const backendDir = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(backendDir, "..", "data", "chat.db");
const schemaPath = path.join(backendDir, "schema.sql");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function parsePreferences(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonObject(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

class ChatDatabase {
  constructor() {
    this.db = new Database(dbPath);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = WAL");
    this.initializeSchema();
  }

  initializeSchema() {
    const schema = fs.readFileSync(schemaPath, "utf8");
    this.db.exec(schema);
    this.ensureColumn("conversations", "persona_id", "TEXT");
    this.ensureColumn("knowledge_documents", "persona_id", "TEXT");
    this.ensureIndex("idx_conversations_persona_id", "conversations(persona_id)");
    this.ensureIndex("idx_knowledge_documents_persona_id", "knowledge_documents(persona_id)");
    this.ensureIndex("idx_knowledge_chunks_user_id", "knowledge_chunks(user_id)");
  }

  ensureColumn(tableName, columnName, columnDefinition) {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (columns.some((column) => column.name === columnName)) {
      return;
    }
    this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }

  ensureIndex(indexName, target) {
    this.db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${target}`);
  }

  normalizePersonaRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userId: row.user_id,
      source: row.source,
      selectedPerson: row.selected_person,
      profile: parseJsonObject(row.profile_json),
      summary: row.summary ?? "",
      initials: row.initials ?? "",
      styleTags: parseJsonArray(row.style_tags),
      configuredAt: row.configured_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  getUserById(userId) {
    if (!userId) {
      return null;
    }

    return this.db.prepare("SELECT * FROM users WHERE id = ?").get(userId) ?? null;
  }

  getUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return null;
    }

    return this.db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) ?? null;
  }

  getOrCreateUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    let user = this.getUserByEmail(normalizedEmail);

    if (!user) {
      const userId = crypto.randomUUID();
      const displayName = normalizedEmail.split("@")[0] || "User";
      const createUser = this.db.prepare(
        "INSERT INTO users (id, email, display_name, last_login_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)"
      );
      const createProfile = this.db.prepare(
        "INSERT OR IGNORE INTO user_profiles (id, preferences) VALUES (?, ?)"
      );

      const transaction = this.db.transaction(() => {
        createUser.run(userId, normalizedEmail, displayName);
        createProfile.run(userId, JSON.stringify({}));
      });
      transaction();
      user = this.getUserById(userId);
    } else {
      this.touchUserLogin(user.id);
      this.getUserProfile(user.id);
      user = this.getUserById(user.id);
    }

    return user;
  }

  touchUserLogin(userId) {
    this.db.prepare(
      "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(userId);
  }

  /**
   * Get or create a user profile
   */
  getUserProfile(userId) {
    const stmt = this.db.prepare("SELECT * FROM user_profiles WHERE id = ?");
    let profile = stmt.get(userId);

    if (!profile) {
      const insertStmt = this.db.prepare(
        "INSERT INTO user_profiles (id, preferences) VALUES (?, ?)"
      );
      insertStmt.run(userId, JSON.stringify({}));
      profile = stmt.get(userId);
    }

    return {
      ...profile,
      preferences: parsePreferences(profile.preferences)
    };
  }

  listPersonas(userId) {
    const stmt = this.db.prepare(
      "SELECT * FROM personas WHERE user_id = ? ORDER BY updated_at DESC, configured_at DESC"
    );

    return stmt.all(userId).map((row) => this.normalizePersonaRow(row));
  }

  getPersona(userId, personaId) {
    const row = this.db.prepare(
      "SELECT * FROM personas WHERE user_id = ? AND id = ?"
    ).get(userId, personaId);

    return this.normalizePersonaRow(row);
  }

  touchPersonaActivity(userId, personaId) {
    if (!personaId) {
      return;
    }

    this.db.prepare(
      "UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?"
    ).run(userId, personaId);
  }

  upsertPersona(userId, persona) {
    this.getUserProfile(userId);

    const stmt = this.db.prepare(
      `INSERT INTO personas (
        id, user_id, source, selected_person, profile_json, summary, initials, style_tags, configured_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        source = excluded.source,
        selected_person = excluded.selected_person,
        profile_json = excluded.profile_json,
        summary = excluded.summary,
        initials = excluded.initials,
        style_tags = excluded.style_tags,
        configured_at = excluded.configured_at,
        updated_at = CURRENT_TIMESTAMP`
    );

    stmt.run(
      persona.id,
      userId,
      persona.source ?? "whatsapp-import",
      persona.selectedPerson,
      JSON.stringify(persona.profile ?? {}),
      persona.summary ?? "",
      persona.initials ?? "",
      JSON.stringify(persona.styleTags ?? []),
      persona.configuredAt ?? new Date().toISOString()
    );

    return this.getPersona(userId, persona.id);
  }

  /**
   * Update user profile preferences
   */
  updateUserPreferences(userId, preferences) {
    this.getUserProfile(userId);

    const stmt = this.db.prepare(
      `UPDATE user_profiles
       SET preferences = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    stmt.run(JSON.stringify(preferences ?? {}), userId);

    return this.getUserProfile(userId);
  }

  updateSessionState(userId, state = {}) {
    const profile = this.getUserProfile(userId);
    const currentPreferences = profile.preferences ?? {};
    const hasPersonaId = Object.prototype.hasOwnProperty.call(state, "currentPersonaId");
    const hasConversationId = Object.prototype.hasOwnProperty.call(state, "currentConversationId");
    const nextPreferences = {
      ...currentPreferences,
      currentPersonaId: hasPersonaId ? state.currentPersonaId ?? "" : currentPreferences.currentPersonaId ?? "",
      currentConversationId: hasConversationId
        ? state.currentConversationId ?? ""
        : currentPreferences.currentConversationId ?? "",
      sidebarHistoryOpen:
        typeof state.sidebarHistoryOpen === "boolean"
          ? state.sidebarHistoryOpen
          : Boolean(currentPreferences.sidebarHistoryOpen),
      updatedAt: new Date().toISOString()
    };

    return this.updateUserPreferences(userId, nextPreferences);
  }

  /**
   * Get all user profiles with parsed preferences
   */
  getAllUserProfiles() {
    const stmt = this.db.prepare("SELECT * FROM user_profiles ORDER BY updated_at DESC");

    return stmt.all().map((profile) => ({
      ...profile,
      preferences: parsePreferences(profile.preferences)
    }));
  }

  /**
   * Get or create a conversation
   */
  getOrCreateConversation(conversationId, userId, personaId, title = null) {
    const stmt = this.db.prepare(
      "SELECT * FROM conversations WHERE id = ? AND user_id = ? AND persona_id = ?"
    );
    let conversation = stmt.get(conversationId, userId, personaId);

    if (!conversation) {
      const insertStmt = this.db.prepare(
        "INSERT INTO conversations (id, user_id, persona_id, title) VALUES (?, ?, ?, ?)"
      );
      insertStmt.run(conversationId, userId, personaId, title || "Untitled");
      conversation = stmt.get(conversationId, userId, personaId);
    }

    return conversation;
  }

  /**
   * Create a new conversation
   */
  createConversation(userId, personaId, title = "Untitled") {
    const conversationId = crypto.randomUUID();
    
    // Ensure user profile exists first
    this.getUserProfile(userId);
    
    const stmt = this.db.prepare(
      "INSERT INTO conversations (id, user_id, persona_id, title) VALUES (?, ?, ?, ?)"
    );
    stmt.run(conversationId, userId, personaId, title);

    return this.getConversation(conversationId, userId, personaId);
  }

  /**
   * Get a specific conversation with messages
   */
  getConversation(conversationId, userId, personaId) {
    const stmt = this.db.prepare(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c 
       WHERE c.id = ? AND c.user_id = ? AND c.persona_id = ? AND c.archived = 0`
    );
    const conversation = stmt.get(conversationId, userId, personaId);

    if (!conversation) {
      return null;
    }

    const messagesStmt = this.db.prepare(
      "SELECT id, role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC"
    );
    const messages = messagesStmt.all(conversationId);

    return {
      ...conversation,
      messages
    };
  }

  /**
   * Get all conversations for a user (with preview)
   */
  getUserConversations(userId, personaId, limit = 50) {
    const stmt = this.db.prepare(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
        c.persona_id,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message
       FROM conversations c
       WHERE c.user_id = ? AND c.persona_id = ? AND c.archived = 0
       ORDER BY c.updated_at DESC
       LIMIT ?`
    );

    return stmt.all(userId, personaId, limit);
  }

  /**
   * Get recent messages from a conversation
   */
  getRecentMessages(conversationId, limit = 12) {
    const stmt = this.db.prepare(
      "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ? "
    );
    const messages = stmt.all(conversationId, limit);
    // Reverse to get chronological order
    return messages.reverse();
  }

  /**
   * Get recent snippets from other conversations for the same user
   */
  getRecentConversationMemories(
    userId,
    personaId,
    excludeConversationId = null,
    limitConversations = 3,
    messagesPerConversation = 4
  ) {
    const conversationsStmt = excludeConversationId
      ? this.db.prepare(
          `SELECT id, title, updated_at
           FROM conversations
           WHERE user_id = ? AND persona_id = ? AND archived = 0 AND id != ?
           ORDER BY updated_at DESC
           LIMIT ?`
        )
      : this.db.prepare(
          `SELECT id, title, updated_at
           FROM conversations
           WHERE user_id = ? AND persona_id = ? AND archived = 0
           ORDER BY updated_at DESC
           LIMIT ?`
        );

    const conversations = excludeConversationId
      ? conversationsStmt.all(userId, personaId, excludeConversationId, limitConversations)
      : conversationsStmt.all(userId, personaId, limitConversations);

    const messagesStmt = this.db.prepare(
      "SELECT role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?"
    );

    return conversations
      .map((conversation) => ({
        ...conversation,
        messages: messagesStmt.all(conversation.id, messagesPerConversation).reverse()
      }))
      .filter((conversation) => conversation.messages.length > 0);
  }

  /**
   * Append a message to a conversation
   */
  addMessage(conversationId, role, content) {
    const messageId = crypto.randomUUID();
    const stmt = this.db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
    );
    stmt.run(messageId, conversationId, role, content);

    // Update conversation's updated_at timestamp
    const updateStmt = this.db.prepare(
      "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    updateStmt.run(conversationId);

    return {
      id: messageId,
      conversationId,
      role,
      content,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update conversation title
   */
  updateConversationTitle(conversationId, userId, personaId, title) {
    const stmt = this.db.prepare(
      "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND persona_id = ?"
    );
    const result = stmt.run(title, conversationId, userId, personaId);

    return result.changes > 0 ? this.getConversation(conversationId, userId, personaId) : null;
  }

  /**
   * Archive a conversation (soft delete)
   */
  archiveConversation(conversationId, userId, personaId) {
    const stmt = this.db.prepare(
      "UPDATE conversations SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND persona_id = ?"
    );
    const result = stmt.run(conversationId, userId, personaId);

    return result.changes > 0;
  }

  /**
   * Archive every active conversation for a user.
   * Used when changing persona so old persona chats cannot leak into the new one.
   */
  archiveUserConversations(userId, personaId = null) {
    if (personaId) {
      const stmt = this.db.prepare(
        "UPDATE conversations SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND persona_id = ? AND archived = 0"
      );
      const result = stmt.run(userId, personaId);
      return result.changes;
    }

    const stmt = this.db.prepare(
      "UPDATE conversations SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND archived = 0"
    );
    const result = stmt.run(userId);

    return result.changes;
  }

  /**
   * Search conversations by title (basic text search)
   */
  searchConversations(userId, personaId, query, limit = 20) {
    const stmt = this.db.prepare(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c
       WHERE c.user_id = ? AND c.persona_id = ? AND c.archived = 0 AND c.title LIKE ?
       ORDER BY c.updated_at DESC
       LIMIT ?`
    );

    return stmt.all(userId, personaId, `%${query}%`, limit);
  }

  /**
   * Get all messages from a conversation (for export/analysis)
   */
  getAllMessages(conversationId, userId, personaId) {
    const stmt = this.db.prepare(
      `SELECT m.id, m.role, m.content, m.timestamp
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.conversation_id = ? AND c.user_id = ? AND c.persona_id = ?
       ORDER BY m.timestamp ASC`
    );

    return stmt.all(conversationId, userId, personaId);
  }

  /**
   * Persist a knowledge document and its retrieval chunks
   */
  saveKnowledgeDocument(
    userId,
    personaId,
    {
      title,
      sourceType = "text-upload",
      charCount = 0,
      metadata = {},
      chunks = []
    }
  ) {
    this.getUserProfile(userId);

    const documentId = crypto.randomUUID();
    const insertDocumentStmt = this.db.prepare(
      `INSERT INTO knowledge_documents (id, user_id, persona_id, title, source_type, char_count, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertUploadedFileStmt = this.db.prepare(
      `INSERT INTO uploaded_files (id, user_id, persona_id, document_id, original_name, source_type, char_count, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertChunkStmt = this.db.prepare(
      `INSERT INTO knowledge_chunks (id, document_id, user_id, chunk_index, content, preview, token_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const saveTransaction = this.db.transaction((payload) => {
      insertDocumentStmt.run(
        documentId,
        userId,
        personaId,
        payload.title,
        payload.sourceType,
        payload.charCount,
        JSON.stringify(payload.metadata ?? {})
      );

      insertUploadedFileStmt.run(
        crypto.randomUUID(),
        userId,
        personaId,
        documentId,
        payload.title,
        payload.sourceType,
        payload.charCount,
        JSON.stringify(payload.metadata ?? {})
      );

      payload.chunks.forEach((chunk, index) => {
        insertChunkStmt.run(
          crypto.randomUUID(),
          documentId,
          userId,
          index,
          chunk.content,
          chunk.preview ?? "",
          chunk.tokenCount ?? 0
        );
      });
    });

    saveTransaction({
      title,
      sourceType,
      charCount,
      metadata,
      chunks
    });

    return this.getKnowledgeDocument(documentId, userId, personaId);
  }

  findKnowledgeDocumentByFingerprint(userId, personaId, title, charCount, sourceType = "text-upload") {
    const stmt = this.db.prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
       FROM knowledge_documents d
       WHERE d.user_id = ?
         AND d.persona_id = ?
         AND lower(d.title) = lower(?)
         AND d.char_count = ?
         AND d.source_type = ?
       LIMIT 1`
    );
    const document = stmt.get(userId, personaId, title, charCount, sourceType);

    if (!document) {
      return null;
    }

    return {
      ...document,
      chunk_count: Number(document.chunk_count ?? 0),
      metadata: parseJsonObject(document.metadata)
    };
  }

  /**
   * List user-uploaded knowledge documents
   */
  listKnowledgeDocuments(userId, personaId) {
    const stmt = this.db.prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
       FROM knowledge_documents d
       WHERE d.user_id = ? AND d.persona_id = ?
       ORDER BY d.updated_at DESC`
    );

    return stmt.all(userId, personaId).map((document) => ({
      ...document,
      chunk_count: Number(document.chunk_count ?? 0),
      metadata: parseJsonObject(document.metadata)
    }));
  }

  /**
   * Fetch one user knowledge document
   */
  getKnowledgeDocument(documentId, userId, personaId) {
    const stmt = this.db.prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
       FROM knowledge_documents d
       WHERE d.id = ? AND d.user_id = ? AND d.persona_id = ?`
    );
    const document = stmt.get(documentId, userId, personaId);

    if (!document) {
      return null;
    }

    return {
      ...document,
      chunk_count: Number(document.chunk_count ?? 0),
      metadata: parseJsonObject(document.metadata)
    };
  }

  /**
   * Fetch all retrieval chunks for a user
   */
  getKnowledgeChunks(userId, personaId) {
    const stmt = this.db.prepare(
      `SELECT kc.id, kc.document_id, kc.chunk_index, kc.content, kc.preview, kc.token_count,
              kd.title, kd.source_type, kd.updated_at, kd.persona_id
       FROM knowledge_chunks kc
       JOIN knowledge_documents kd ON kd.id = kc.document_id
       WHERE kc.user_id = ? AND kd.persona_id = ?
       ORDER BY kd.updated_at DESC, kc.chunk_index ASC`
    );

    return stmt.all(userId, personaId).map((chunk) => ({
      ...chunk,
      token_count: Number(chunk.token_count ?? 0)
    }));
  }

  /**
   * Delete a knowledge document and all of its chunks
   */
  deleteKnowledgeDocument(documentId, userId, personaId) {
    const stmt = this.db.prepare(
      "DELETE FROM knowledge_documents WHERE id = ? AND user_id = ? AND persona_id = ?"
    );
    const result = stmt.run(documentId, userId, personaId);

    return result.changes > 0;
  }

  assignOrphanedPersonaData(userId, personaId) {
    const updateConversations = this.db.prepare(
      "UPDATE conversations SET persona_id = ? WHERE user_id = ? AND persona_id IS NULL"
    );
    const updateDocuments = this.db.prepare(
      "UPDATE knowledge_documents SET persona_id = ? WHERE user_id = ? AND persona_id IS NULL"
    );
    const transaction = this.db.transaction(() => {
      updateConversations.run(personaId, userId);
      updateDocuments.run(personaId, userId);
    });
    transaction();
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new ChatDatabase();
  }
  return dbInstance;
}

export function initializeDatabase() {
  return getDatabase();
}

export default ChatDatabase;
