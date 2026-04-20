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
  getOrCreateConversation(conversationId, userId, title = null) {
    const stmt = this.db.prepare(
      "SELECT * FROM conversations WHERE id = ? AND user_id = ?"
    );
    let conversation = stmt.get(conversationId, userId);

    if (!conversation) {
      const insertStmt = this.db.prepare(
        "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)"
      );
      insertStmt.run(conversationId, userId, title || "Untitled");
      conversation = stmt.get(conversationId, userId);
    }

    return conversation;
  }

  /**
   * Create a new conversation
   */
  createConversation(userId, title = "Untitled") {
    const conversationId = crypto.randomUUID();
    
    // Ensure user profile exists first
    this.getUserProfile(userId);
    
    const stmt = this.db.prepare(
      "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)"
    );
    stmt.run(conversationId, userId, title);

    return this.getConversation(conversationId, userId);
  }

  /**
   * Get a specific conversation with messages
   */
  getConversation(conversationId, userId) {
    const stmt = this.db.prepare(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c 
       WHERE c.id = ? AND c.user_id = ? AND c.archived = 0`
    );
    const conversation = stmt.get(conversationId, userId);

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
  getUserConversations(userId, limit = 50) {
    const stmt = this.db.prepare(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message
       FROM conversations c
       WHERE c.user_id = ? AND c.archived = 0
       ORDER BY c.updated_at DESC
       LIMIT ?`
    );

    return stmt.all(userId, limit);
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
    excludeConversationId = null,
    limitConversations = 3,
    messagesPerConversation = 4
  ) {
    const conversationsStmt = excludeConversationId
      ? this.db.prepare(
          `SELECT id, title, updated_at
           FROM conversations
           WHERE user_id = ? AND archived = 0 AND id != ?
           ORDER BY updated_at DESC
           LIMIT ?`
        )
      : this.db.prepare(
          `SELECT id, title, updated_at
           FROM conversations
           WHERE user_id = ? AND archived = 0
           ORDER BY updated_at DESC
           LIMIT ?`
        );

    const conversations = excludeConversationId
      ? conversationsStmt.all(userId, excludeConversationId, limitConversations)
      : conversationsStmt.all(userId, limitConversations);

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
  updateConversationTitle(conversationId, userId, title) {
    const stmt = this.db.prepare(
      "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(title, conversationId, userId);

    return result.changes > 0 ? this.getConversation(conversationId, userId) : null;
  }

  /**
   * Archive a conversation (soft delete)
   */
  archiveConversation(conversationId, userId) {
    const stmt = this.db.prepare(
      "UPDATE conversations SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(conversationId, userId);

    return result.changes > 0;
  }

  /**
   * Search conversations by title (basic text search)
   */
  searchConversations(userId, query, limit = 20) {
    const stmt = this.db.prepare(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c
       WHERE c.user_id = ? AND c.archived = 0 AND c.title LIKE ?
       ORDER BY c.updated_at DESC
       LIMIT ?`
    );

    return stmt.all(userId, `%${query}%`, limit);
  }

  /**
   * Get all messages from a conversation (for export/analysis)
   */
  getAllMessages(conversationId, userId) {
    const stmt = this.db.prepare(
      `SELECT m.id, m.role, m.content, m.timestamp
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.conversation_id = ? AND c.user_id = ?
       ORDER BY m.timestamp ASC`
    );

    return stmt.all(conversationId, userId);
  }

  /**
   * Persist a knowledge document and its retrieval chunks
   */
  saveKnowledgeDocument(
    userId,
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
      `INSERT INTO knowledge_documents (id, user_id, title, source_type, char_count, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertChunkStmt = this.db.prepare(
      `INSERT INTO knowledge_chunks (id, document_id, user_id, chunk_index, content, preview, token_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const saveTransaction = this.db.transaction((payload) => {
      insertDocumentStmt.run(
        documentId,
        userId,
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

    return this.getKnowledgeDocument(documentId, userId);
  }

  /**
   * List user-uploaded knowledge documents
   */
  listKnowledgeDocuments(userId) {
    const stmt = this.db.prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
       FROM knowledge_documents d
       WHERE d.user_id = ?
       ORDER BY d.updated_at DESC`
    );

    return stmt.all(userId).map((document) => ({
      ...document,
      chunk_count: Number(document.chunk_count ?? 0),
      metadata: parseJsonObject(document.metadata)
    }));
  }

  /**
   * Fetch one user knowledge document
   */
  getKnowledgeDocument(documentId, userId) {
    const stmt = this.db.prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = d.id) AS chunk_count
       FROM knowledge_documents d
       WHERE d.id = ? AND d.user_id = ?`
    );
    const document = stmt.get(documentId, userId);

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
  getKnowledgeChunks(userId) {
    const stmt = this.db.prepare(
      `SELECT kc.id, kc.document_id, kc.chunk_index, kc.content, kc.preview, kc.token_count,
              kd.title, kd.source_type, kd.updated_at
       FROM knowledge_chunks kc
       JOIN knowledge_documents kd ON kd.id = kc.document_id
       WHERE kc.user_id = ?
       ORDER BY kd.updated_at DESC, kc.chunk_index ASC`
    );

    return stmt.all(userId).map((chunk) => ({
      ...chunk,
      token_count: Number(chunk.token_count ?? 0)
    }));
  }

  /**
   * Delete a knowledge document and all of its chunks
   */
  deleteKnowledgeDocument(documentId, userId) {
    const stmt = this.db.prepare(
      "DELETE FROM knowledge_documents WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(documentId, userId);

    return result.changes > 0;
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
