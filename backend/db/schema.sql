-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  preferences TEXT
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- User-uploaded knowledge documents for RAG
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text-upload',
  char_count INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  preview TEXT,
  token_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_updated_at ON knowledge_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_id ON knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
