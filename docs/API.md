# Backend API Reference

Complete reference for all AI Avatar backend API endpoints, including request/response formats, examples, and error handling.

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Health Check](#health-check)
3. [Persona Endpoints](#persona-endpoints)
4. [Conversation Endpoints](#conversation-endpoints)
5. [Chat Endpoint](#chat-endpoint)
6. [WhatsApp Integration](#whatsapp-integration)
7. [Error Handling](#error-handling)
8. [Type Definitions](#type-definitions)

---

## Base Configuration

**Base URL**: `http://localhost:5000` (default)

**Development Frontend Proxy**: `http://localhost:5173/api/*` → `http://localhost:5000/api/*` (via Vite)

**Content-Type**: `application/json` for all requests/responses

**Default HTTP Methods**:
- `GET` — Retrieve data
- `POST` — Create/modify data
- `PUT` — Update data (if implemented)
- `DELETE` — Remove data (if implemented)

---

## Health Check

### GET /health

Simple health check endpoint to verify backend is running.

**Request**:
```http
GET /health
```

**Response** (Status: 200):
```json
{
  "status": "ok",
  "timestamp": "2026-04-15T10:30:00Z"
}
```

**Example**:
```bash
curl http://localhost:5000/health
```

**Use Case**: Verify backend is operational before making other API calls.

---

## Persona Endpoints

### POST /api/personas/bootstrap

Initialize or retrieve the default persona. Called on app startup to load a persona profile.

**Request**:
```http
POST /api/personas/bootstrap
Content-Type: application/json

{
  "personaProfilePath": "data/persona-profile.json"
}
```

**Request Body** (Optional):
```typescript
{
  personaProfilePath?: string  // Path to persona JSON file
}
```

**Response** (Status: 200):
```json
{
  "personaId": "default-persona",
  "personaProfile": {
    "name": "Maya",
    "role": "AI Assistant",
    "description": "A helpful AI assistant trained on sample conversations",
    "speaking_style": "friendly, conversational",
    "interests": ["technology", "creative writing"],
    "communication_style": "warm, encouraging",
    "knowledge_base": ["...", "..."],
    "shared_experiences": []
  }
}
```

**Response Type**:
```typescript
BootstrapResponse {
  personaId: string
  personaProfile: PersonaProfile
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/personas/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"personaProfilePath":"data/persona-profile.json"}'
```

**Error Cases**:
- `400` — Invalid path
- `404` — Profile file not found
- `500` — Server error reading file

**Use Case**: Load default persona on app startup. Can provide custom path to load different personas.

---

### GET /api/personas/:personaId

Retrieve a specific persona profile by ID.

**Request**:
```http
GET /api/personas/default-persona
```

**URL Parameters**:
```typescript
personaId: string  // Persona identifier
```

**Response** (Status: 200):
```json
{
  "personaId": "default-persona",
  "personaProfile": {
    "name": "Maya",
    "role": "AI Assistant",
    "description": "...",
    "speaking_style": "...",
    // ... full persona object
  }
}
```

**Example**:
```bash
curl http://localhost:5000/api/personas/default-persona
```

**Error Cases**:
- `404` — Persona not found
- `500` — Server error

**Use Case**: Retrieve persona details, switch between personas.

---

## Conversation Endpoints

### GET /api/conversations/:conversationId

Retrieve conversation history (message list) for a specific conversation.

**Request**:
```http
GET /api/conversations/conv-12345?limit=20
```

**URL Parameters**:
```typescript
conversationId: string  // Conversation identifier
```

**Query Parameters** (Optional):
```typescript
limit?: number  // Max messages to return (default: 50)
offset?: number // Skip first N messages (default: 0)
```

**Response** (Status: 200):
```json
{
  "conversationId": "conv-12345",
  "messages": [
    {
      "role": "user",
      "content": "Hello! How are you?",
      "timestamp": "2026-04-15T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "I'm doing great, thanks for asking! How can I help?",
      "cite_items": [
        {
          "type": "memory",
          "text": "User recently asked about...",
          "source": "previous conversation"
        }
      ],
      "timestamp": "2026-04-15T10:00:05Z"
    }
  ],
  "totalMessages": 2
}
```

**Response Type**:
```typescript
Conversation {
  conversationId: string
  messages: Message[]
  totalMessages: number
}

Message {
  role: 'user' | 'assistant'
  content: string
  cite_items?: CiteItem[]
  timestamp: string
}
```

**Example**:
```bash
curl http://localhost:5000/api/conversations/conv-12345?limit=10
```

**Error Cases**:
- `404` — Conversation not found
- `400` — Invalid limit/offset
- `500` — Server error

**Use Case**: Load conversation history, display chat log, pagination.

---

## Chat Endpoint

### POST /api/chat

Send a user message and receive an AI response from the persona.

**Request**:
```http
POST /api/chat
Content-Type: application/json

{
  "conversationId": "conv-12345",
  "userMessage": "What's your favorite programming language?"
}
```

**Request Body**:
```typescript
{
  conversationId: string    // Unique conversation ID
  userMessage: string       // User's message (required)
}
```

**Response** (Status: 200):
```json
{
  "conversationId": "conv-12345",
  "userMessage": "What's your favorite programming language?",
  "response": "I love working with Python and TypeScript! Python is great for rapid development and data science, while TypeScript brings type safety to JavaScript projects. What languages do you prefer?",
  "cite_items": [
    {
      "type": "conversation",
      "text": "We previously discussed programming languages during our last chat",
      "source": "previous conversation",
      "date": "2026-04-10T15:30:00Z"
    }
  ],
  "messageId": "msg-789",
  "timestamp": "2026-04-15T10:05:00Z"
}
```

**Response Type**:
```typescript
ChatResponse {
  conversationId: string
  userMessage: string
  response: string
  cite_items?: CiteItem[]
  messageId: string
  timestamp: string
}

CiteItem {
  type: 'memory' | 'conversation' | 'knowledge' | 'context'
  text: string
  source: string
  date?: string
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-12345",
    "userMessage": "What do you like to do for fun?"
  }'
```

**Process Flow**:
1. User message saved to database
2. Conversation context retrieved (history, persona, memories)
3. System prompt constructed
4. Groq LLM called (if deterministic/heuristic fails)
5. Response generated and post-processed
6. Response saved to database
7. Response returned with grounding information

**Error Cases**:
- `400` — Missing required field (conversationId, userMessage)
- `400` — Message too long (> 2000 chars)
- `503` — Groq API error
- `500` — Database error

**Performance**:
- First message: 2-5 seconds (model initialization)
- Subsequent messages: 1-3 seconds (LLM latency)

**Use Case**: Send user message, get AI response, display in chat interface.

---

## WhatsApp Integration

### POST /api/persona/preview-whatsapp

Parse a WhatsApp chat export file to preview participants before creating a persona.

**Request**:
```http
POST /api/persona/preview-whatsapp
Content-Type: multipart/form-data

[WhatsApp .txt file]
```

**Request Body** (multipart/form-data):
```typescript
{
  file: File  // WhatsApp chat export (.txt)
}
```

**File Format Expected**:
```
[Optional date notifications]
Alice: Hey, how are you?
Bob: I'm doing great! How about you?
Alice: Not bad, just working on a project
```

**Response** (Status: 200):
```json
{
  "participants": [
    {
      "name": "Alice",
      "messageCount": 245,
      "sampleMessages": ["How are you?", "I'm working on...", "That sounds cool"]
    },
    {
      "name": "Bob",
      "messageCount": 198,
      "sampleMessages": ["I'm doing great!", "That sounds fun", "Let me check"]
    }
  ],
  "totalMessages": 443,
  "dateRange": {
    "start": "2024-01-01",
    "end": "2026-04-15"
  }
}
```

**Response Type**:
```typescript
WhatsappPreviewResponse {
  participants: Participant[]
  totalMessages: number
  dateRange: {
    start: string
    end: string
  }
}

Participant {
  name: string
  messageCount: number
  sampleMessages: string[]
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/persona/preview-whatsapp \
  -F "file=@chat.txt"
```

**Error Cases**:
- `400` — No file provided
- `400` — Invalid file format
- `413` — File too large (> 50MB)
- `500` — Parsing error

**Use Case**: Show users who's in a WhatsApp group before selecting who to mimic.

---

### POST /api/persona/configure-whatsapp

Create a persona from a WhatsApp chat export by analyzing a selected participant's messages.

**Request**:
```http
POST /api/persona/configure-whatsapp
Content-Type: multipart/form-data

{
  file: [WhatsApp .txt],
  selectedParticipant: "Alice"
}
```

**Request Body** (multipart/form-data):
```typescript
{
  file: File                  // WhatsApp chat export (.txt)
  selectedParticipant: string // Name of person to mimic
}
```

**Response** (Status: 200):
```json
{
  "personaId": "whatsapp-alice-2026",
  "personaProfile": {
    "name": "Alice",
    "role": "Friend",
    "description": "Alice is a friendly person who loves tech and creative projects. She's enthusiastic about helping others.",
    "speaking_style": "casual, friendly, uses emojis occasionally",
    "interests": ["technology", "design", "music", "travel"],
    "communication_style": "warm, encouraging, likes to ask follow-up questions",
    "knowledge_base": [
      "Graduated from design school",
      "Works in UX/UI",
      "Plays guitar",
      "Loves coffee",
      "Planning a trip to Japan"
    ],
    "shared_experiences": [
      "We met at work",
      "We've worked on projects together",
      "Discussed career plans"
    ]
  },
  "messageAnalysis": {
    "messageCount": 245,
    "averageMessageLength": 35,
    "frequentEmojis": ["😀", "😍", "🎉"],
    "topicsMentioned": ["work", "projects", "coffee", "travel"]
  }
}
```

**Response Type**:
```typescript
WhatsappConfigureResponse {
  personaId: string
  personaProfile: PersonaProfile
  messageAnalysis: {
    messageCount: number
    averageMessageLength: number
    frequentEmojis: string[]
    topicsMentioned: string[]
  }
}

PersonaProfile {
  name: string
  role: string
  description: string
  speaking_style: string
  interests: string[]
  communication_style: string
  knowledge_base: string[]
  shared_experiences: string[]
}
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/persona/configure-whatsapp \
  -F "file=@chat.txt" \
  -F "selectedParticipant=Alice"
```

**Process Flow**:
1. Parse WhatsApp file
2. Filter messages by selected participant
3. Analyze message patterns, vocabulary, interests, etc.
4. Generate persona profile
5. Save to database
6. Return persona for use in chat

**Error Cases**:
- `400` — No file provided
- `400` — Invalid file format
- `400` — Participant not found in chat
- `413` — File too large
- `500` — Analysis error

**Use Case**: Create custom persona from real chat history, enabling users to chat with an AI version of a real person.

---

## Error Handling

### Standard Error Response Format

All endpoints return errors in this format:

```json
{
  "error": "Error title",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "2026-04-15T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Response returned |
| 400 | Bad Request | Missing required field |
| 404 | Not Found | Persona doesn't exist |
| 413 | Payload Too Large | File exceeds size limit |
| 500 | Internal Server Error | Database connection failed |
| 503 | Service Unavailable | Groq API down |

### Common Error Messages

**Missing Field**:
```json
{
  "error": "ValidationError",
  "message": "Missing required field: conversationId",
  "statusCode": 400
}
```

**Groq API Error**:
```json
{
  "error": "GroqAPIError",
  "message": "Failed to generate response from Groq API: Rate limit exceeded",
  "statusCode": 503
}
```

**Database Error**:
```json
{
  "error": "DatabaseError",
  "message": "Failed to save message: database locked",
  "statusCode": 500
}
```

---

## Type Definitions

### PersonaProfile

```typescript
interface PersonaProfile {
  name: string
  role: string
  description: string
  speaking_style: string
  interests: string[]
  communication_style: string
  knowledge_base: string[]
  shared_experiences: string[]
  temperature?: number      // 0-1, controls creativity
  modelVersion?: string     // Which LLM version to use
}
```

### Message

```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
  cite_items?: CiteItem[]
  timestamp: string
}
```

### CiteItem

```typescript
interface CiteItem {
  type: 'memory' | 'conversation' | 'knowledge' | 'context'
  text: string
  source: string
  date?: string
}
```

### Conversation

```typescript
interface Conversation {
  conversationId: string
  messages: Message[]
  totalMessages: number
}
```

---

## Client Usage Example (TypeScript)

See `src/api.ts` for the type-safe API client:

```typescript
import { bootstrap, sendMessage, getConversation } from './api'

// Load persona on startup
const { personaProfile } = await bootstrap()

// Send message and get response
const response = await sendMessage(conversationId, userMessage)

// Fetch conversation history
const history = await getConversation(conversationId, { limit: 20 })
```

---

## Rate Limits

- **Persona Bootstrap**: No limit
- **Chat**: 10 requests/second per conversation
- **File Upload**: 50MB max file size

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:5000/health

# Bootstrap persona
curl -X POST http://localhost:5000/api/personas/bootstrap

# Send chat message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv",
    "userMessage": "Hello!"
  }'
```

### Using Postman

1. Import API into Postman
2. Set base URL: `http://localhost:5000`
3. Create requests for each endpoint
4. Test with sample data

---

## Next Steps

- **[Architecture Overview](ARCHITECTURE.md)** — Understand system design
- **[Setup Guide](SETUP.md)** — Get backend running
- **[Frontend Components](COMPONENTS.md)** — Integrate API in UI
