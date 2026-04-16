# System Architecture

This document describes the overall architecture of the AI Avatar system, including system design, component relationships, data flow, and external integrations.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [External Integrations](#external-integrations)
7. [Communication Protocols](#communication-protocols)

## Architecture Overview

AI Avatar is a full-stack application with clear frontend/backend separation:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                           │
├─────────────────────────────────────────────────────────────┤
│  Frontend: React SPA                 (localhost:5173)        │
│  ├─ App.tsx                          (Main component)        │
│  ├─ PersonaSetup.tsx                 (Upload & Setup)       │
│  ├─ Chat Interface                   (Conversation)         │
│  ├─ LiveAvatar.tsx                   (3D Avatar)            │
│  └─ API Client (api.ts)              (HTTP layer)           │
└────────────────┬─────────────────────────────────────────────┘
                 │ HTTP/REST (Vite Proxy)
                 │ /api/*, /health
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND SERVER (localhost:5000)               │
├─────────────────────────────────────────────────────────────┤
│  Express.js API Server                                      │
│  ├─ Routes: /api/personas/*                                 │
│  ├─ Routes: /api/conversations/*                            │
│  ├─ Routes: /api/chat                                       │
│  ├─ Routes: /api/persona/preview-whatsapp                  │
│  ├─ Routes: /api/persona/configure-whatsapp                │
│  └─ Middleware: CORS, body parsing                         │
│                                                             │
│  Core Services:                                            │
│  ├─ personaEngine.js                 (Chat logic)          │
│  │   ├─ buildSystemPrompt()                                │
│  │   ├─ generateResponse()                                 │
│  │   ├─ postProcessPersonaReply()                          │
│  │   └─ contextRetrieval()                                 │
│  │                                                          │
│  ├─ whatsappPersona.js                (Chat parsing)       │
│  │   ├─ parseWhatsappExport()                              │
│  │   ├─ extractParticipants()                              │
│  │   └─ analyzePersonaFromChat()                           │
│  │                                                          │
│  └─ db/index.js                       (Database layer)     │
│      ├─ getConversation()                                  │
│      ├─ saveMessage()                                      │
│      └─ getUserProfile()                                   │
└────────┬─────────────────────────────────────────────────────┘
         │
         ├─ HTTP (Axios)
         │  ▼
         │  ┌──────────────────────────────────────┐
         │  │  Groq API (LLM Service)             │
         │  │  llama-3.3-70b-versatile            │
         │  │  - Generate responses                │
         │  │  - Analyze persona intent            │
         │  └──────────────────────────────────────┘
         │
         ├─ HTTP/Signed Requests (Axios)
         │  ▼
         │  ┌──────────────────────────────────────┐
         │  │  HeyGen LiveAvatar API               │
         │  │  - Video synthesis                   │
         │  │  - Avatar animation                  │
         │  │  - Voice synthesis                   │
         │  └──────────────────────────────────────┘
         │
         └─ File I/O (SQLite)
            ▼
            ┌──────────────────────────────────────┐
            │  SQLite Database (backend/ai.db)     │
            │  - user_profiles                     │
            │  - conversations                     │
            │  - messages                          │
            │  - schema: db/schema.sql             │
            └──────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx (Root)
├── PersonaSetup (Conditional)
│   ├── WhatsApp Upload Form
│   └── Participant Selector
├── ChatInterface (Main UI)
│   ├── ConversationHistory
│   ├── MessageInput
│   └── ResponseDisplay
├── LiveAvatar.tsx (Optional)
│   ├── HeyGen SDK Integration
│   ├── Video Player
│   └── Audio Manager
└── Avatar.tsx (Optional 3D)
    ├── Three.js Scene
    ├── Character Model
    └── Mixamo Animations
```

### Key Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| **App** | `src/App.tsx` | Main application container, state management, routing |
| **PersonaSetup** | `src/PersonaSetup.tsx` | Upload WhatsApp export, select participant, create persona |
| **LiveAvatar** | `src/LiveAvatar.tsx` | Integrate HeyGen SDK, stream avatar video, handle audio |
| **Avatar** | `src/Avatar.tsx` | 3D character using Three.js, animation controller |
| **API Client** | `src/api.ts` | Type-safe API client, HTTP requests |

### Tech Stack

- **React 18+** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool & dev server
- **Three.js & React Three Fiber** — 3D graphics (optional)
- **HeyGen SDK** — Avatar video generation (optional)
- **Axios** — HTTP client (via api.ts)

### State Management

- **App.tsx** manages:
  - `conversationId` — Current chat session
  - `messages` — Chat history
  - `personaProfile` — Current persona data
  - `avatarEnabled` — Toggle for 3D/video avatar

- **LiveAvatar.tsx** manages:
  - HeyGen session state
  - Video playback state
  - Audio state

---

## Backend Architecture

### Express Route Structure

```
Express App
├── GET /health
│   └── Health check endpoint
│
├── POST /api/personas/bootstrap
│   └── Initialize persona from file or default
│
├── POST /api/persona/preview-whatsapp
│   └── Parse WhatsApp export, list participants
│
├── POST /api/persona/configure-whatsapp
│   └── Create persona from WhatsApp export
│
├── GET /api/personas/:personaId
│   └── Retrieve persona profile
│
├── GET /api/conversations/:conversationId
│   └── Retrieve conversation history
│
├── POST /api/chat
│   └── Send message, get AI response
│
└── (Additional routes as needed)
```

### Service Architecture

#### personaEngine.js

Core logic for generating AI responses:

```
user message + conversationId
        ↓
      [1] getConversationContext()
           - Fetch message history
           - Retrieve person profile
           - Load shared conversations
        ↓
      [2] buildSystemPrompt()
           - Combine persona profile
           - Add retrieved context
           - Add conversation history
           - Add message intent analysis
        ↓
      [3] generateResponse()
           - Try deterministic rules
           - Try heuristic patterns
           - Call Groq LLM (if above fail)
           - postProcessPersonaReply()
        ↓
grounded response with cite_items
```

**Key Functions**:
- `buildSystemPrompt(persona, context, history)` — Constructs LLM prompt
- `generateResponse(userMsg, systemPrompt)` — Calls Groq API
- `postProcessPersonaReply(response)` — Cleans up response
- `retrieveContext(personaId, query)` — Gets related memories/knowledge

#### whatsappPersona.js

Parses WhatsApp exports and extracts persona information:

```
WhatsApp .txt export
        ↓
parseWhatsappExport(fileContent)
        ↓
[Extract messages, timestamp, sender]
        ↓
extractParticipants(messages)
        ↓
[List of unique senders]
        ↓
analyzePersonaFromChat(messages, selectedSender)
        ↓
[Persona profile: name, style, interests, speaking patterns]
```

**Key Functions**:
- `parseWhatsappExport(content)` — Parse .txt file format
- `extractParticipants(messages)` — Get unique senders
- `analyzePersonaFromChat(messages, personaName)` — Build persona profile

#### db/index.js

Database abstraction layer:

**Tables**:
- `user_profiles` — User session, preferences
- `conversations` — Chat sessions
- `messages` — Individual messages in conversations

**Key Functions**:
- `getConversation(conversationId, limit)` — Fetch message history
- `saveMessage(conversationId, role, content)` — Store message
- `getUserProfile(userId)` — Get preference
- `initializeDatabase()` — Create tables if needed

### Tech Stack

- **Express.js 4+** — Web server framework
- **Node.js 16+** — Runtime
- **better-sqlite3** — SQLite driver (synchronous)
- **axios** — HTTP client (for Groq, HeyGen)
- **cors** — CORS middleware

---

## Data Flow

### Persona Setup Flow

```sequence
User (Browser)
    │ WhatsApp .txt file
    ▼
POST /api/persona/preview-whatsapp
    │ [whatsappPersona.parseWhatsappExport]
    │ [Extract participants]
    ▼
Return: { participants: ["Alice", "Bob"] }
    │ User selects "Alice"
    ▼
POST /api/persona/configure-whatsapp
    │ [whatsappPersona.analyzePersonaFromChat]
    │ [Build persona profile from Alice's messages]
    │ [Save to database]
    ▼ 
Return: { personaId, personaProfile }
    │ Profile cached in localStorage
    ▼
[Ready for chat]
```

### Chat Flow

```sequence
User: "Hello, how are you?"
    │
    ▼
POST /api/chat { conversationId, userMessage }
    │
    ├─[Backend: personaEngine.getConversationContext]
    │  ├─ Fetch recent messages (6 turns default)
    │  ├─ Load persona profile
    │  ├─ Fetch shared conversation memories (3 conversations)
    │  └─ Retrieve contextual knowledge base
    │
    ├─[Backend: personaEngine.buildSystemPrompt]
    │  └─ Combine: persona + context + history → system prompt
    │
    ├─[Backend: personaEngine.generateResponse]
    │  │
    │  ├─ Try rule-based (deterministic)
    │  │
    │  ├─ Try heuristic patterns
    │  │
    │  └─ Call Groq LLM
    │     │
    │     ▼
    │     POST https://api.groq.com/openai/v1/chat/completions
    │     {
    │       "model": "llama-3.3-70b-versatile",
    │       "messages": [
    │         { "role": "system", "content": "You are Alice..." },
    │         { "role": "user", "content": "Hello, how are you?" }
    │       ]
    │     }
    │     ▼
    │     Response: { "choices": [...] }
    │
    ├─[Backend: personaEngine.postProcessPersonaReply]
    │  └─ Clean, format, validate response
    │
    └─[Backend: db.saveMessage]
       ├─ Save user message
       ├─ Save assistant response
       └─ Save cite_items (grounding info)

    ▼
Return to Client:
{
  "response": "I'm doing great, thanks for asking!",
  "cite_items": [
    { "type": "conversation", "text": "We talked about..." }
  ]
}
    │
    ▼
Frontend: Display response in chat
    │
    ├─[If avatarEnabled]
    │  │
    │  ├─ Call HeyGen API
    │  │  POST /v1/video_sessions/{id}/generate
    │  │  { "text": "I'm doing great, thanks for asking!" }
    │  │
    │  └─ Stream avatar video + audio
    │
    └─ Display text response
```

---

## Database Schema

### Tables

#### users
```sql
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY,
  user_id TEXT UNIQUE,
  created_at TIMESTAMP,
  current_persona_id TEXT
)
```

#### conversations
```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  conversation_id TEXT UNIQUE,
  user_id TEXT,
  persona_id TEXT,
  persona_profile JSON,  -- Serialized persona profile
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### messages
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  conversation_id TEXT,
  message_number INTEGER,
  role TEXT,             -- 'user' or 'assistant'
  content TEXT,
  cite_items JSON,       -- Grounding data
  created_at TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
)
```

### Schema File

Full schema defined in: `backend/db/schema.sql`

---

## External Integrations

### Groq LLM API

**Purpose**: Generate conversational responses

**Configuration**:
```env
GROQ_API_KEY=your_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

**Usage**:
```javascript
const response = await axios.post(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.65
  },
  {
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
  }
)
```

**Models Available**:
- `llama-3.3-70b-versatile` (recommended, default)
- `mixtral-8x7b-32768`
- `gemma-7b-it`

### HeyGen LiveAvatar SDK

**Purpose**: Render animated 3D avatar with speech synthesis

**Configuration**:
```env
LIVEAVATAR_API_KEY=your_api_key
LIVEAVATAR_AVATAR_ID=your_avatar_id
LIVEAVATAR_VOICE_ID=your_voice_id
LIVEAVATAR_CONTEXT_ID=your_context_id
```

**Frontend Usage**:
```typescript
import { HeyGenAvatarSession } from '@heygen/liveavatar-web-sdk';

const session = new HeyGenAvatarSession({
  apiKey: apiKey,
  avatarName: avatarId,
});

await session.startSession();
await session.playVideo(videoString);
```

**Backend Integration**: Backend prepares text, frontend calls HeyGen SDK

---

## Communication Protocols

### Frontend ↔ Backend (HTTP/REST)

**Base URL**: `http://localhost:5000` (or configured backend URL)

**Default Headers**:
- `Content-Type: application/json`
- `Accept: application/json`

**Proxy**: Vite dev server proxies `/api/*` and `/health` to backend

**Examples**:
```javascript
// api.ts type-safe wrapper
POST /api/chat
GET /api/conversations/:id
POST /api/persona/configure-whatsapp
```

### Backend ↔ Groq LLM (OpenAI-compatible API)

**URL**: `https://api.groq.com/openai/v1/chat/completions`

**Format**: OpenAI Chat Completions API

**Authentication**: Bearer token (GROQ_API_KEY)

### Backend ↔ HeyGen (REST API)

**URL**: `https://api.heygen.com/v1/*` (called from frontend SDK)

**Authentication**: Bearer token (LIVEAVATAR_API_KEY)

**Payload**: Text → Video conversion

---

## Deployment Considerations

### Dev vs Production

| Aspect | Development | Production |
|--------|-------------|-----------|
| Frontend Port | 5173 | 80/443 (nginx) |
| Backend Port | 5000 | 3000+ (behind proxy) |
| Database | ai.db (local) | ai.db (persistent volume) |
| CORS | Localhost only | Restricted origins |
| Secrets | .env (local) | Environment variables |
| Session Secret | hardcoded | Random, rotated |

### Scalability Notes

- **Current**: Single-server, single-process
- **Multiple users**: Session isolation via `conversationId`
- **Future**: Could implement:
  - Load balancer (multiple backend instances)
  - Shared database (PostgreSQL)
  - Redis for session store
  - Separate LLM service

---

## Next Steps

- **[Frontend Components](COMPONENTS.md)** — Detailed component documentation
- **[API Reference](API.md)** — Endpoint specifications
- **[Setup Guide](SETUP.md)** — Installation & configuration

