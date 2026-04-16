# AI Avatar - Complete File & Module Reference

**Version**: 1.0  
**Date**: April 2026  
**Purpose**: Detailed explanation of every file, module, function, and data structure in the AI Avatar project

---

## Table of Contents

1. [Frontend Modules](#frontend-modules)
2. [Backend Modules](#backend-modules)
3. [Database Layer](#database-layer)
4. [Configuration Files](#configuration-files)
5. [Type Definitions](#type-definitions)
6. [Data Structures](#data-structures)
7. [File Dependency Tree](#file-dependency-tree)

---

# Frontend Modules

## src/main.tsx

**Purpose**: Application entry point

**Responsibility**: Initialize React DOM and render the App component

**Imports**:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './style.css'
```

**Key Code**:
```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Key Points**:
- Finds root DOM element with ID "root" from index.html
- Creates React root and renders App component
- Uses React.StrictMode for development warnings
- Imports styles globally
- Simple 10-line file

---

## src/App.tsx

**Purpose**: Main application shell and state management hub

**Responsibility**: 
- Manage entire user session and conversation state
- Handle persona setup workflow
- Coordinate API calls
- Display appropriate UI based on application state

**Exports**: Default export of `App` component (React.FC)

**Key Dependencies**:
```typescript
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { api } from './api'
import PersonaSetup from './PersonaSetup'
import { LiveAvatarComponent } from './LiveAvatar'
import Avatar from './Avatar'
```

**State Variables**:

```typescript
const [input, setInput] = useState('')                    // Current message input
const [messages, setMessages] = useState<ChatMessage[]>([]) // Chat history
const [conversationId, setConversationId] = useState<string | null>(null)
const [isPersonaReady, setIsPersonaReady] = useState(false) // Setup complete?
const [personaName, setPersonaName] = useState('')
const [personaSummary, setPersonaSummary] = useState<PersonaSummary | null>(null)
const [conversations, setConversations] = useState([])
const [groundingItems, setGroundingItems] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [playbackRequest, setPlaybackRequest] = useState(0)  // Counter to trigger avatar
```

**Key Functions**:

### `useEffect(() => { ... }, [])` - Initialization

```typescript
// On component mount:
1. Call api.bootstrap() to load user profile and persona
2. Load conversation list
3. Load or create conversation ID
4. Set isPersonaReady based on persona config
5. Auto-select first conversation or create new one
```

### `handlePersonaSetupComplete(persona: PersonaSummary)`

```typescript
// When user completes persona setup via PersonaSetup UI:
1. Save persona to state
2. Set isPersonaReady = true
3. Clear messages (start fresh chat)
4. Create or load conversation
```

### `async handleSendMessage()`

```typescript
// When user sends a message:
1. Add user message to local messages state
2. Call api.chat(conversationId, message)
3. Receive AI response
4. Add assistant message to messages state
5. Extract cite_items for grounding
6. Increment playbackRequest counter (triggers avatar if enabled)
7. Save to conversation history
8. Clear input field
```

**Render Logic**:

```typescript
if (!isPersonaReady) {
  return <PersonaSetup onReady={handlePersonaSetupComplete} />
}

return (
  <div className="app">
    {/* Conversations sidebar */}
    <ConversationPanel conversations={conversations} />
    
    {/* Chat area */}
    <div className="chat-area">
      {/* Message display */}
      <div className="messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} items={msg.cite_items} />
        ))}
      </div>
      
      {/* Avatar (optional) */}
      {ENABLE_AVATAR && (
        <LiveAvatarComponent 
          text={messages[messages.length - 1]?.content}
          playbackRequest={playbackRequest}
        />
      )}
      
      {/* Message input */}
      <MessageInput 
        value={input}
        onChange={setInput}
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  </div>
)
```

**Feature Flags**:
```typescript
const ENABLE_AVATAR = import.meta.env.VITE_ENABLE_AVATAR === 'true'
```

**Storage**:
```typescript
// Persists conversation ID to localStorage
localStorage.setItem('current-conversation-id', conversationId)
const savedId = localStorage.getItem('current-conversation-id')
```

---

## src/PersonaSetup.tsx

**Purpose**: UI component for creating personalized personas from WhatsApp exports

**Responsibility**:
- Handle file upload
- Parse and preview WhatsApp participants
- Let user select which person to mimic
- Call backend to generate persona profile

**Exports**: Default export of `PersonaSetup` component

**Props**:
```typescript
interface PersonaSetupProps {
  onReady: (persona: PersonaSummary) => void
  onError?: (error: string) => void
}
```

**State**:
```typescript
const [setupState, setSetupState] = useState<'needs-upload' | 'choose-person'>('needs-upload')
const [setupFile, setSetupFile] = useState<File | null>(null)
const [participants, setParticipants] = useState<Array<{ name: string; messageCount: number }>>([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState('')
```

**Key Functions**:

### `handleFileSelect(event: ChangeEvent<HTMLInputElement>)`

```typescript
// When user selects a file:
1. Validate file is .txt
2. Create FormData with file
3. Call api.previewWhatsapp(formData)
4. Response contains list of participants with message counts
5. Display participants to user
6. Move to 'choose-person' state
```

### `handleChoosePerson(name: string)`

```typescript
// When user clicks a participant:
1. Create FormData with file and selectedParticipant name
2. Call api.configureWhatsapp(formData)
3. Backend analyzes chat patterns, speaking style, etc.
4. Returns PersonaSummary with generated profile
5. Call onReady(persona) to notify App
6. App saves persona and transitions to chat
```

**Two-Phase Flow**:

**Phase 1: Upload**
```
Document icon + "Choose WhatsApp Chat Export"
User drag-drop or click → select .txt file
→ triggers file preview
```

**Phase 2: Select**
```
List of participants with icons showing:
- Name (extracted from messages)
- Message count
- Sample speaking style

User clicks participant name
→ triggers persona generation
```

---

## src/LiveAvatar.tsx

**Purpose**: Integration with HeyGen's LiveAvatar SDK for animated video avatar

**Responsibility**:
- Manage avatar session lifecycle
- Stream avatar video to screen
- Send speech text to avatar service
- Handle audio playback and animation

**Exports**: `LiveAvatarComponent` (React.FC)

**Props**:
```typescript
interface LiveAvatarComponentProps {
  apiBaseUrl?: string
  playbackRequest: number           // Trigger number (increments to play new message)
  text: string                      // Text for avatar to speak
}
```

**Key Imports**:
```typescript
import { HeyGenAvatarSession, SessionEvent, SessionState, AgentEventsEnum } from '@heygen/liveavatar-web-sdk'
```

**State**:
```typescript
const [session, setSession] = useState<HeyGenAvatarSession | null>(null)
const [sessionState, setSessionState] = useState(SessionState.DISCONNECTED)
const [isSpeaking, setIsSpeaking] = useState(false)
const videoRef = useRef<HTMLVideoElement>(null)
```

**Key Functions**:

### `useEffect(() => { ... }, [apiBaseUrl])` - Initialize Session

```typescript
// On mount:
1. Request session token from backend: GET /api/heygen/session-token
2. Create HeyGenAvatarSession with API key and token
3. Configure with avatar ID and voice ID from env
4. Attach session to video element: session.attachStreamTo(videoRef.current)
5. Subscribe to session events:
   - SessionState changes → update UI
   - AgentEventsEnum.STREAM_READY → start available
   - AgentEventsEnum.AVATAR_START_SPEAKING → setIsSpeaking(true)
   - AgentEventsEnum.AVATAR_END_SPEAKING → setIsSpeaking(false)
6. Handle errors and cleanup on unmount
```

### `useEffect(() => { ... }, [playbackRequest])` - Trigger Speech

```typescript
// When playbackRequest increments:
1. Check if session is ready
2. Call session.publishData() to send speech directive
3. Avatar service generates video of speaking the text
4. Video streams to <video> element
5. Audio plays automatically
6. Avatar animations play with mouth sync
```

**Session Lifecycle**:
```
DISCONNECTED
    ↓ (user requests)
CONNECTING
    ↓ (server responds)
CONNECTED (ready for speech)
    ↓ (user sends text)
SPEAKING (avatar animating)
    ↓ (speech ends)
CONNECTED (ready for next message)
```

**Key Features**:
- Real-time video streaming (not pre-rendered)
- Lip-sync with audio
- Gestures and expressions
- Multiple avatar models available
- Configurable voice (gender, accent, language)

---

## src/Avatar.tsx

**Purpose**: 3D character model display using Three.js (fallback to LiveAvatar)

**Responsibility**:
- Load GLTF 3D model from file
- Manage animation controller (AnimationMixer)
- Play clip-based animations
- Render 3D scene with lighting and camera

**Key Imports**:
```typescript
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationMixer, AnimationAction } from 'three'
```

**Props**:
```typescript
interface AvatarProps {
  selectedAnimation?: string  // Animation to play
}
```

**State**:
```typescript
const { scene, animations } = useGLTF('/mixamo/avatar_with_animations.glb')
const mixerRef = useRef<AnimationMixer | null>(null)
const actionsRef = useRef<AnimationAction[]>([])
const [current, setCurrent] = useState(animations[0]?.name || '')
```

**Key Functions**:

### `useEffect(() => { ... }, [animations])` - Setup Animations

```typescript
// On model load:
1. Create AnimationMixer for the scene
2. Create AnimationAction for each clip in animations array
3. Store actions in ref for later use
4. Play first animation by default
5. Save mixer and actions refs for animation control
```

### `useFrame(({ clock }) => { ... })` - Update Animations

```typescript
// Every frame:
1. Get delta time since last frame
2. Update mixer with delta: mixer.update(delta)
3. This advances all playing animations
```

### `playAnimation(name: string)`

```typescript
// When user selects animation:
1. Stop previous animation (if any)
2. Find action by name in actionsRef
3. Reset action to start
4. Call action.play()
5. Update UI to show current animation
```

**Model Structure**:
- Mesh: 3D character model
- Skeleton: Bone structure for animation
- Animations: Mixamo clips (Idle, Walk, Jump, Talk, etc.)

**Mixamo Animations Available**:
- Idle (standing still)
- Talking (speaking animation)
- Breathing Idle (subtle breathing)
- Greeting (wave/hello gesture)
- Thinking (hand-on-chin)
- Happy (celebratory)
- Other gesture animations

---

## src/api.ts

**Purpose**: Centralized API client with type definitions and intelligent endpoint resolution

**Responsibility**:
- Define TypeScript interfaces for API communication
- Provide fetch wrapper with fallback URL handling
- Export utility functions for all API calls
- Handle response validation and error cases

**Key Exports**:

### Type Definitions

```typescript
export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  messages: StoredMessage[]
  message_count: number
}

export interface PersonaSummary {
  configured: boolean              // Is persona set up?
  source: 'whatsapp' | 'default'  // How was it created?
  selectedPerson?: string          // Whose messages were analyzed?
  name: string                     // Person's name
  role: string                     // Their role (friend, mentor, etc.)
  summary: string                  // Generated bio
}

export interface BootstrapResponse {
  userId: string
  requiresSetup: boolean
  persona: PersonaSummary
}

export interface Participant {
  name: string
  messageCount: number
  sampleMessages: string[]
}
```

### URL Resolution

```typescript
export const API_BASE_URL = ...:
;(() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) return envUrl
  
  // Dev fallback: try common dev ports
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000'
  }
  
  // Production: use current domain
  return window.location.origin
})()
```

**Strategy**: Tries multiple API endpoints in order:
1. `VITE_API_BASE_URL` environment variable
2. `http://localhost:5000` if on localhost
3. Current domain (same-origin)

### Fetch Wrapper

```typescript
async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Fetch with credentials (cookies for session)
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  // Validate JSON content-type
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid response format')
  }
  
  return response.json()
}
```

### API Functions

```typescript
export const api = {
  // Persona endpoints
  bootstrap: () => fetchApi('/api/persona/bootstrap'),
  getPerson: () => fetchApi('/api/persona'),
  
  // WhatsApp integration
  previewWhatsapp: (formData: FormData) =>
    fetch(`${API_BASE_URL}/api/persona/preview-whatsapp`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }).then(r => r.json()),
  
  configureWhatsapp: (formData: FormData) =>
    fetch(`${API_BASE_URL}/api/persona/configure-whatsapp`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }).then(r => r.json()),
  
  // Conversations
  getConversations: () => fetchApi('/api/conversations'),
  getConversation: (id: string) => fetchApi(`/api/conversations/${id}`),
  createConversation: (title: string) =>
    fetchApi('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    }),
  
  // Chat
  chat: (conversationId: string, message: string) =>
    fetchApi('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        message
      })
    })
}
```

**Key Points**:
- All functions return Promises
- Credentials included for session cookies
- No authentication headers (uses cookies instead)
- Content validation on responses

---

## src/style.css

**Purpose**: Global styles for the entire application

**Key Styles**:
- Root CSS variables (colors, fonts, spacing)
- Component layouts (chat, sidebar, input area)
- Responsive design (mobile-first)
- Animation classes
- Dark mode support (optional)

**Example**:
```css
:root {
  --primary-color: #007bff;
  --text-color: #333;
  --bg-color: #f5f5f5;
  --border-color: #ddd;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color: var(--text-color);
  background: var(--bg-color);
}

.app {
  display: flex;
  height: 100vh;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.message.user {
  background: var(--primary-color);
  color: white;
}

.message.assistant {
  background: #e9e9e9;
  color: var(--text-color);
}
```

---

## src/counter.ts (Unused)

**Purpose**: Template code from Vite (not used in app)

**Content**:
```typescript
export function setupCounter(element: HTMLButtonElement) {
  let count = 0
  const setCount = (value: number) => {
    count = value
    element.innerHTML = `count is ${count}`
  }
  element.addEventListener('click', () => setCount(count + 1))
  setCount(0)
}
```

**Status**: Placeholder code, can be removed

---

## src/vite-env.d.ts

**Purpose**: TypeScript type definitions for Vite environment variables

**Content**:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_AVATAR: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Purpose**: Allows `import.meta.env.VITE_*` with type checking

---

# Backend Modules

## backend/server.js

**Purpose**: Express.js HTTP server and main application orchestrator

**Responsibility**:
- Define all REST API endpoints
- Handle request routing
- Manage user sessions with signed cookies
- Coordinate persona engine and database
- Integrate with external APIs (Groq, HeyGen)

**Key Imports**:
```javascript
const express = require('express')
const cors = require('cors')
const { createHmac } = require('crypto')
const fs = require('fs')
const path = require('path')

const { initializeDatabase } = require('./db/index.js')
const {
  analyzePersonaReplyNeed,
  buildDeterministicPersonaReply,
  buildHeuristicPersonaReply,
  buildPersonaPrompt,
  buildPersonaProfileFromWhatsApp,
  retrievePersonaContext,
  postProcessPersonaReply
} = require('./personaEngine.js')

const {
  parseWhatsAppChat,
  getWhatsAppParticipants,
  buildPersonaProfileFromWhatsApp
} = require('./whatsappPersona.js')
```

**Configuration**:
```javascript
const PORT = process.env.PORT || 5000
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production'

// Persona configuration
const PERSONA_HISTORY_TURNS = parseInt(process.env.PERSONA_HISTORY_TURNS || '6')
const PERSONA_MAX_CONTEXT_ITEMS = parseInt(process.env.PERSONA_MAX_CONTEXT_ITEMS || '6')
const PERSONA_SHARED_CONVERSATIONS = parseInt(process.env.PERSONA_SHARED_CONVERSATIONS || '3')
const PERSONA_SHARED_CONVERSATION_TURNS = parseInt(process.env.PERSONA_SHARED_CONVERSATION_TURNS || '4')

// API Keys
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const GROQ_SYSTEM_PROMPT = process.env.GROQ_SYSTEM_PROMPT || ''

const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || LIVEAVATAR_API_KEY
const LIVEAVATAR_AVATAR_ID = process.env.LIVEAVATAR_AVATAR_ID
const LIVEAVATAR_VOICE_ID = process.env.LIVEAVATAR_VOICE_ID
const LIVEAVATAR_CONTEXT_ID = process.env.LIVEAVATAR_CONTEXT_ID
const LIVEAVATAR_MODE = process.env.LIVEAVATAR_MODE || 'FULL'
const LIVEAVATAR_LANGUAGE = process.env.LIVEAVATAR_LANGUAGE || 'en'
```

**Session Management**:

```javascript
function signSession(userId) {
  const payload = userId
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex')
  return `${payload}.${signature}`
}

function verifySession(sessionString) {
  if (!sessionString) return null
  const [payload, signature] = sessionString.split('.')
  const expected = createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex')
  if (signature === expected) return payload
  return null
}
```

**Middleware Setup**:

```javascript
const app = express()
const db = initializeDatabase()

app.use(cors({
  origin: true,                    // Accept all origins in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))

app.use(express.json())

// Session middleware
app.use((req, res, next) => {
  const sessionCookie = req.headers.cookie
    ?.split(';')
    .find(c => c.trim().startsWith('persona_user_session='))
    ?.replace('persona_user_session=', '')
  
  const userId = verifySession(sessionCookie)
  if (!userId) {
    const newUserId = 'user_' + Date.now()
    req.userId = newUserId
    res.setHeader('Set-Cookie', `persona_user_session=${signSession(newUserId)}; Path=/`)
  } else {
    req.userId = userId
  }
  next()
})
```

**API Endpoints**:

### GET /

```javascript
// Server info endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})
```

### GET /health

```javascript
// Health check (used by load balancers)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})
```

### GET /api/persona

```javascript
// Get current persona for user
app.get('/api/persona', (req, res) => {
  const profile = db.getUserProfile(req.userId)
  const persona = profile.preferences?.persona || null
  res.json({
    configured: !!persona,
    source: persona?.source || 'default',
    name: persona?.person?.name || 'Avatar',
    role: persona?.person?.role || 'AI Assistant',
    summary: persona?.person?.summary || 'A helpful AI assistant'
  })
})
```

### GET /api/persona/bootstrap

```javascript
// Initial app load - provide user context
app.get('/api/persona/bootstrap', (req, res) => {
  const profile = db.getUserProfile(req.userId)
  const persona = profile.preferences?.persona
  
  res.json({
    userId: req.userId,
    requiresSetup: !persona,
    persona: {
      configured: !!persona,
      source: persona?.source || 'default',
      name: persona?.person?.name || 'Avatar',
      role: persona?.person?.role || 'AI Assistant',
      summary: persona?.person?.summary || 'Default assistant'
    }
  })
})
```

### POST /api/persona/preview-whatsapp

```javascript
// Parse WhatsApp file and list participants
app.post('/api/persona/preview-whatsapp', (req, res) => {
  try {
    const fileContent = req.body.file // Assumes middleware parses file
    const messages = parseWhatsAppChat(fileContent)
    const participants = getWhatsAppParticipants(messages)
    
    res.json({
      participants: participants.map(p => ({
        name: p.name,
        messageCount: p.messageCount,
        sampleMessages: p.sampleMessages || []
      })),
      totalMessages: messages.length,
      dateRange: {
        start: getEarliestDate(messages),
        end: getLatestDate(messages)
      }
    })
  } catch (error) {
    res.status(400).json({ error: 'Failed to parse WhatsApp file' })
  }
})
```

### POST /api/persona/configure-whatsapp

```javascript
// Create persona from WhatsApp export
app.post('/api/persona/configure-whatsapp', (req, res) => {
  try {
    const fileContent = req.body.file
    const selectedPerson = req.body.selectedParticipant
    
    const messages = parseWhatsAppChat(fileContent)
    const persona = buildPersonaProfileFromWhatsApp(messages, selectedPerson)
    
    // Save to user preferences
    const profile = db.getUserProfile(req.userId)
    db.updateUserPreferences(req.userId, {
      ...profile.preferences,
      persona
    })
    
    res.json({
      configured: true,
      source: 'whatsapp',
      selectedPerson,
      name: persona.person.name,
      role: persona.person.role,
      summary: persona.person.summary
    })
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate persona' })
  }
})
```

### GET /api/conversations

```javascript
// List all user conversations
app.get('/api/conversations', (req, res) => {
  const conversations = db.getUserConversations(req.userId, 50)
  res.json(conversations)
})
```

### GET /api/conversations/:id

```javascript
// Get specific conversation with all messages
app.get('/api/conversations/:id', (req, res) => {
  const conv = db.getConversation(req.params.id, req.userId)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  res.json(conv)
})
```

### POST /api/conversations

```javascript
// Create new conversation
app.post('/api/conversations', (req, res) => {
  const convId = db.createConversation(req.userId, req.body.title || 'New Chat')
  res.json({ id: convId, title: req.body.title })
})
```

### POST /api/chat

**Most Complex Endpoint** - Handles message processing:

```javascript
// Send message and get AI response
app.post('/api/chat', async (req, res) => {
  try {
    const { conversation_id, message } = req.body
    
    // 1. Save user message
    db.addMessage(conversation_id, 'user', message)
    
    // 2. Get persona and context
    const profile = db.getUserProfile(req.userId)
    const persona = profile.preferences?.persona
    
    if (!persona) {
      return res.status(400).json({ error: 'Persona not configured' })
    }
    
    // 3. Analyze intent
    const replyNeed = analyzePersonaReplyNeed(message)
    
    // 4. Try deterministic reply
    let response = buildDeterministicPersonaReply(message, persona)
    
    // 5. Try heuristic if needed
    if (!response && replyNeed.shouldUseLM === false) {
      response = buildHeuristicPersonaReply(message, persona)
    }
    
    // 6. Retrieve context if needed
    let contextItems = []
    if (!response || replyNeed.needsContext) {
      contextItems = retrievePersonaContext(message, persona.knowledge_base)
    }
    
    // 7. Call Groq LLM if needed
    if (!response) {
      const recentHistory = db.getRecentMessages(conversation_id, PERSONA_HISTORY_TURNS)
      const systemPrompt = buildPersonaPrompt(persona, contextItems, recentHistory)
      
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: persona.defaults?.temperature || 0.7
        })
      })
      
      const result = await groqResponse.json()
      response = result.choices[0].message.content
      response = postProcessPersonaReply(response)
    }
    
    // 8. Save response
    db.addMessage(conversation_id, 'assistant', response)
    
    // 9. Return response with grounding
    res.json({
      message: response,
      cite_items: contextItems.map(item => ({
        type: item.type,
        text: item.text,
        source: item.source
      }))
    })
    
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})
```

### POST /api/heygen/session-token

```javascript
// Get LiveAvatar session token
app.post('/api/heygen/session-token', async (req, res) => {
  try {
    const response = await fetch('https://api.heygen.com/v1/realtime.sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIVEAVATAR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: '1.0',
        character: {
          character_id: LIVEAVATAR_AVATAR_ID
        },
        voice: {
          voice_id: LIVEAVATAR_VOICE_ID
        }
      })
    })
    
    const data = await response.json()
    res.json({
      session_id: data.session_id,
      session_token: data.session_access_token
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' })
  }
})
```

---

## backend/personaEngine.js

**Purpose**: Core persona behavior engine - analyzes text, retrieves context, builds prompts

**Responsibility**:
- Analyze message intent for reply strategy
- Generate deterministic (rule-based) replies
- Generate heuristic (template-based) replies
- Build system prompts for LLM
- Retrieve relevant context items
- Post-process LLM responses

**Key Exports**:

```javascript
module.exports = {
  analyzePersonaReplyNeed,
  buildDeterministicPersonaReply,
  buildHeuristicPersonaReply,
  buildPersonaPrompt,
  buildPersonaProfileFromWhatsApp,
  retrievePersonaContext,
  postProcessPersonaReply
}
```

**Constants**:

### stop_words.txt (150+ common words)

Used to filter out noise in keyword matching:
```javascript
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'this', 'that', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'must', 'shall', 'me', 'him', 'her', 'them', 'it', 'we', 'you',
  'i', 'he', 'she', 'they', 'my', 'his', 'her', 'their', 'your', 'our',
  // ... 150+ total
])
```

### COLLOQUIAL_PATTERNS (Tamil language support)

```javascript
const COLLOQUIAL_PATTERNS = {
  'idilum': 'idhu illai',
  'paduuthey': 'padhaippu',
  'aiyoh': 'aiyyo',
  'chey': 'cheyya',
  'pannaa': 'pannum',
  'naan': 'naan',
  'ungalukku': 'unchalina',
  'solra': 'sollum',
  'vara': 'varam',
  'uyir': 'uyirpu'
}
```

**Key Functions**:

### analyzePersonaReplyNeed(message)

```javascript
// Determine conversation intent
const INTENT_KEYWORDS = {
  work: ['project', 'work', 'deadline', 'team', 'meeting', 'task'],
  scheduling: ['when', 'time', 'date', 'tomorrow', 'next week'],
  casual: ['how are you', 'whats up', 'hey', 'hi'],
  knowledge: ['what is', 'how do', 'explain', 'tell me'],
  help: ['help', 'can you', 'could you', 'please', 'need'],
  apology: ['sorry', 'apologies', 'forgive', 'my fault'],
  question: ['?', 'who', 'what', 'when', 'where', 'why'],
  general: [] // default
}

// Returns:
{
  intents: ['casual', 'general'],
  needsContext: false,
  shouldUseLM: null,  // null means auto-decide
  confidence: 0.8
}
```

### buildDeterministicPersonaReply(message, persona)

```javascript
// Rule-based reply - no LLM needed
// Examples:
- User: "Hi!" → Persona: "Hey! How are you?" (greeting rule)
- User: "Thanks!" → Persona: "No problem!" (acknowledgment)
- User: "Bye" → Persona: "See you later!" (farewell)

// Returns string or null if no pattern matches
```

### buildHeuristicPersonaReply(message, persona)

```javascript
// Template-based casual reply
// Uses persona's signature phrases and style

const templates = [
  "That's cool!",
  "I totally agree.",
  "I get what you mean.",
  "That sounds good.",
  "Let me think about that."
]

// Selects based on message sentiment and persona style
// Returns string or null
```

### retrievePersonaContext(message, knowledgeBase)

```javascript
// Find most relevant knowledge items
// Returns top 3-6 items sorted by relevance

// Scoring algorithm:
function scoreItem(item, messageTokens) {
  let score = 0
  for (let token of messageTokens) {
    if (item.text.toLowerCase().includes(token)) {
      score++
    }
  }
  return score
}

// Example knowledge base:
const knowledge = [
  { type: 'fact', text: 'Python is great for data science', source: 'conversation' },
  { type: 'habit', text: 'Loves coffee in the morning', source: 'whatsapp' },
  { type: 'memory', text: 'We met at a tech conference', source: 'memory' }
]

// Tokens from message: ['python', 'data', 'science']
// Finds matching knowledge items
```

### buildPersonaPrompt(persona, context, history)

```javascript
// Construct system prompt for Groq LLM
// Returns formatted prompt string

const prompt = `
You are ${persona.person.name}, a person who is ${persona.person.summary}.

Speaking style:
${persona.person.speaking_style.join(', ')}

Behavior rules:
${persona.behavior_rules.join('\n')}

Based on your knowledge:
${context.map(c => '- ' + c.text).join('\n')}

Recent conversation:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}

Remember: Stay in character. Use your natural speaking style. Be authentic.
`

// Groq uses this as system prompt when generating response
```

### postProcessPersonaReply(text)

```javascript
// Clean up LLM-generated response
// Remove artifacts like:
- [System messages] 
- <thinking> tags
- Excessive markdown
- Incomplete sentences

// Keep:
- Natural conversational text
- Personality quirks
- Emojis (if original style had them)

// Example:
Input: "[Thinking...] The user asked about coffee <think>..."
Output: "The user asked about coffee"
```

---

## backend/whatsappPersona.js

**Purpose**: Parse WhatsApp chats and extract persona characteristics

**Responsibility**:
- Parse WhatsApp .txt export format
- Extract participants and message metadata
- Analyze speaking patterns and style
- Generate complete persona profile

**Key Exports**:

```javascript
module.exports = {
  parseWhatsAppChat,
  getWhatsAppParticipants,
  buildPersonaProfileFromWhatsApp
}
```

**Key Functions**:

### parseWhatsAppChat(fileContent)

```javascript
// Convert WhatsApp text to structured messages
// Handles two timestamp formats:

// Format 1: [12/31/2024, 11:59:59 PM] Name: Message
// Format 2: 12/31/2024, 11:59:59 PM - Name: Message

const regex1 = /\[\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?\]\s*(.+?):\s*(.*)/
const regex2 = /(\d{1,2}\/\d{1,2}\/\d{4}),?\s+(\d{1,2}:\d{2}(:\d{2})?)\s*(AM|PM|am|pm)?\s*-\s*(.+?):\s*(.*)/

// Returns array of:
[
  {
    timestamp: "2024-12-31T23:59:59Z",
    sender: "Alice",
    content: "Message text",
    isMedia: false (or true if "<Media omitted>")
  }
]
```

### getWhatsAppParticipants(messages)

```javascript
// Count messages per participant
// Returns sorted by message count (descending)

// Groups messages by sender:
const participants = {}
for (let msg of messages) {
  participants[msg.sender] = (participants[msg.sender] || 0) + 1
}

// Returns:
[
  { name: "Alice", messageCount: 245 },
  { name: "Bob", messageCount: 198 },
  { name: "Charlie", messageCount: 42 }
]
```

### buildPersonaProfileFromWhatsApp(messages, selectedPerson)

**Complex Function** - Analyzes speaking patterns:

```javascript
// 1. Filter messages for selected person
const personMessages = messages
  .filter(m => m.sender === selectedPerson)
  .filter(m => !m.isMedia && m.content.length > 0)

// 2. Analyze speaking style
const styles = inferSpeakingStyle(personMessages)
// Returns:
{
  averageLength: 35,         // avg words per message
  questionRatio: 0.15,       // % of messages are questions
  emojiUsage: 0.4,           // % of messages have emoji
  formality: 'casual',       // formal/casual/mixed
  frequency: 'moderate'      // low/moderate/high
}

// 3. Extract signature phrases (2+ occurrences)
const phrases = inferSignaturePhrases(personMessages)
// ['that sounds cool', 'let me think', 'totally agree']

// 4. Build style samples
const samples = buildStyleSamples(personMessages)
// 3-5 representative example messages

// 5. Build few-shot examples
const examples = buildChatExamples(personMessages)
// User-assistant conversation pairs

// 6. Detect message tags
const tags = new Set()
for (let msg of personMessages) {
  if (msg.content.includes('?')) tags.add('question')
  if (msg.content.length < 50) tags.add('short-reply')
  if (msg.content.includes('😊') || hasEmoji(msg.content)) tags.add('emoji')
  if (msg.content.length > 500) tags.add('long-form')
  if (isCasual(msg.content)) tags.add('casual')
  if (msg.content.split('\n').length > 2) tags.add('multi-line')
}

// 7. Assemble persona profile
return {
  source: 'whatsapp',
  person: {
    name: selectedPerson,
    role: inferRole(personMessages),           // Friend, Colleague, Mentor
    summary: generateBio(personMessages),      // AI-generated summary
    relationshipToUser: inferRelationship(),   // How do they know user?
    speaking_style: styles,
    signature_phrases: phrases
  },
  behavior_rules: [
    "Stay true to {selectedPerson}'s communication style",
    "Use natural language",
    "Keep messages concise when person tends to be brief",
    "Show personality through emoji and tone"
  ],
  knowledge_base: extractTopics(personMessages), // Topics discussed
  memory_videos: [],
  chat_examples: examples,
  style_samples: samples,
  defaults: {
    temperature: 0.7,                           // Slightly creative
    enable_heuristic_replies: true              // Use templates for common replies
  }
}
```

**Helper Functions**:

```javascript
// Scoring style characteristics
function inferSpeakingStyle(messages) {
  let totalWords = 0, totalLength = 0, questions = 0, emojiCount = 0
  
  for (let msg of messages) {
    const words = msg.content.split(/\s+/).length
    totalWords += words
    totalLength += msg.content.length
    if (msg.content.includes('?')) questions++
    if (hasEmoji(msg.content)) emojiCount++
  }
  
  return {
    averageLength: Math.round(totalLength / messages.length),
    questionRatio: (questions / messages.length).toFixed(2),
    emojiUsage: (emojiCount / messages.length).toFixed(2),
    formality: totalWords / messages.length > 20 ? 'formal' : 'casual',
    frequency: messages.length / (daysSpan) > 5 ? 'high' : 'moderate'
  }
}

// Extract frequently used short phrases
function inferSignaturePhrases(messages) {
  const phrases = {}
  for (let msg of messages) {
    // Find phrases of 2-5 words, lowercase
    const parts = msg.content
      .toLowerCase()
      .split(/[,!?.]/g)
      .flatMap(p => p.match(/\w+(\s+\w+){1,4}/g) || [])
    
    for (let phrase of parts) {
      phrases[phrase] = (phrases[phrase] || 0) + 1
    }
  }
  
  // Return phrases appearing 2+ times
  return Object.entries(phrases)
    .filter(([_, count]) => count >= 2)
    .map(([phrase, _]) => phrase)
    .slice(0, 10)
}
```

---

# Database Layer

## backend/db/index.js

**Purpose**: SQLite database abstraction and data persistence

**Responsibility**:
- Manage database connection
- Provide high-level data access functions
- Handle user, conversation, and message storage
- Ensure data consistency and integrity

**Key Exports**:

```javascript
class ChatDatabase {
  // All database operations as methods
}

module.exports = {
  ChatDatabase,
  initializeDatabase() => ChatDatabase instance,
  getDatabase() => singleton instance
}
```

**Constructor & Initialization**:

```javascript
class ChatDatabase {
  constructor(dbPath = 'ai.db') {
    const Database = require('better-sqlite3')
    this.db = new Database(dbPath)
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL')
    
    this.initializeSchema()
  }
  
  initializeSchema() {
    // Read and execute schema.sql
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
    this.db.exec(schema)
  }
}
```

**Key Methods**:

### getUserProfile(userId)

```javascript
// Get or create user profile
getUserProfile(userId) {
  let user = this.db
    .prepare('SELECT * FROM user_profiles WHERE id = ?')
    .get(userId)
  
  if (!user) {
    // Auto-create user on first visit
    this.db.prepare(
      'INSERT INTO user_profiles (id, created_at, updated_at) VALUES (?, ?, ?)'
    ).run(userId, new Date(), new Date())
    
    user = { id: userId, preferences: {} }
  }
  
  // Parse JSON preferences
  if (user.preferences) {
    user.preferences = JSON.parse(user.preferences)
  }
  
  return user
}
```

### updateUserPreferences(userId, prefs)

```javascript
// Save user settings and persona config
updateUserPreferences(userId, prefs) {
  this.db.prepare(
    'UPDATE user_profiles SET preferences = ?, updated_at = ? WHERE id = ?'
  ).run(
    JSON.stringify(prefs),
    new Date(),
    userId
  )
}
```

### getOrCreateConversation(userId) / createConversation(userId, title)

```javascript
// Create new conversation
createConversation(userId, title) {
  const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  
  this.db.prepare(
    `INSERT INTO conversations 
     (id, user_id, title, created_at, updated_at, archived)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, title, new Date(), new Date(), 0)
  
  return id
}
```

### getConversation(conversationId, userId)

```javascript
// Fetch conversation with all messages
getConversation(conversationId, userId) {
  const conv = this.db.prepare(
    'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
  ).get(conversationId, userId)
  
  if (!conv) return null
  
  // Fetch all messages
  const messages = this.db.prepare(
    'SELECT role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
  ).all(conversationId)
  
  return {
    id: conv.id,
    title: conv.title,
    created_at: conv.created_at,
    messages
  }
}
```

### getRecentMessages(conversationId, limit)

```javascript
// Get last N messages for context
getRecentMessages(conversationId, limit = 6) {
  return this.db.prepare(
    'SELECT role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(conversationId, limit).reverse() // Reverse to chronological order
}
```

### getUserConversations(userId, limit)

```javascript
// List all conversations for a user
getUserConversations(userId, limit = 50) {
  return this.db.prepare(
    `SELECT id, title, created_at, updated_at FROM conversations 
     WHERE user_id = ? AND archived = 0
     ORDER BY updated_at DESC
     LIMIT ?`
  ).all(userId, limit)
}
```

### addMessage(conversationId, role, content)

```javascript
// Save a new message
addMessage(conversationId, role, content) {
  const id = 'msg_' + Date.now()
  
  this.db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, timestamp)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    id,
    conversationId,
    role,
    content,
    new Date().toISOString()
  )
  
  return id
}
```

### searchConversations(userId, query)

```javascript
// Text search in conversation titles
searchConversations(userId, query) {
  return this.db.prepare(
    `SELECT id, title, created_at FROM conversations
     WHERE user_id = ? AND title LIKE ? AND archived = 0
     ORDER BY updated_at DESC`
  ).all(userId, `%${query}%`)
}
```

---

## backend/db/schema.sql

**SQL Schema Definition**:

```sql
-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  preferences JSON
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at 
ON user_profiles(updated_at DESC);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  archived BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
ON conversations(created_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Indexes for efficient message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
ON messages(timestamp DESC);
```

**Schema Design Notes**:
- **TEXT IDs**: Use string IDs (UUID-like) for better scalability
- **Soft Deletes**: `archived` flag instead of hard delete
- **JSON Storage**: User preferences stored as JSON in preferences column
- **Timestamps**: All dates stored as ISO 8601 strings
- **Foreign Keys**: Enforced with CASCADE delete capability
- **Indexes**: Optimize common queries (user lookups, conversation sorting)

---

# Configuration Files

## vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5173,
    
    // Proxy API calls to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
```

**Key Points**:
- **Port 5173**: Vite dev server (doesn't conflict with backend 5000)
- **Proxy Configuration**: Transparent routing of `/api/*` calls to backend
- **changeOrigin**: Modifies Origin header so backend sees request as same-origin
- **Build Output**: Optimized files in dist/ for production

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Key Settings**:
- **Target**: ES2022 (modern JavaScript)
- **Strict**: All type checking enabled
- **JSX**: react-jsx (automatic transform, no React import needed)
- **noUnused***: Warn about unused variables/parameters
- **isolatedModules**: Each file can be independently compiled

---

## package.json (Frontend)

```json
{
  "name": "ai-avatar",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  
  "scripts": {
    "dev": "vite",
    "build": "tsc -noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives"
  },
  
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "three": "^0.183.2",
    "@react-three/fiber": "^9.5.0",
    "@react-three/drei": "^10.7.7",
    "@heygen/liveavatar-web-sdk": "^0.0.11",
    "dotenv": "^17.3.1"
  },
  
  "devDependencies": {
    "@types/react": "^18.2.56",
    "@types/react-dom": "^18.2.48",
    "@vitejs/plugin-react": "^4.2.1",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "vite": "^7.3.1",
    "typescript": "~5.9.3"
  }
}
```

---

## package.json (Backend)

```json
{
  "name": "ai-avatar-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  
  "dependencies": {
    "express": "^5.2.1",
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.6",
    "axios": "^1.13.6"
  }
}
```

---

# Type Definitions

## src/api.ts (Types)

```typescript
export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  cite_items?: CiteItem[]
}

export interface CiteItem {
  type: 'memory' | 'conversation' | 'knowledge' | 'context'
  text: string
  source: string
  date?: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  messages: StoredMessage[]
  message_count: number
}

export interface PersonaSummary {
  configured: boolean
  source: 'whatsapp' | 'default'
  selectedPerson?: string
  name: string
  role: string
  summary: string
}

export interface BootstrapResponse {
  userId: string
  requiresSetup: boolean
  persona: PersonaSummary
}

export interface Participant {
  name: string
  messageCount: number
  sampleMessages?: string[]
}
```

---

# Data Structures

## Persona Profile (personaEngine.js)

```javascript
{
  source: 'whatsapp' | 'default',
  
  person: {
    name: string,                    // e.g., "Alice"
    role: string,                    // e.g., "Friend"
    summary: string,                 // e.g., "A tech enthusiast who loves..."
    relationshipToUser: string,      // How they know user
    speaking_style: {
      averageLength: number,         // avg words per message
      questionRatio: number,         // % questions
      emojiUsage: number,           // % messages with emoji
      formality: 'formal' | 'casual',
      frequency: 'low' | 'moderate' | 'high'
    },
    signature_phrases: string[]      // Common phrases they use
  },
  
  behavior_rules: string[],          // Rules for staying in character
  knowledge_base: {
    text: string,
    type: 'fact' | 'habit' | 'memory',
    source: string
  }[],
  memory_videos: any[],              // Video references (future)
  chat_examples: {                   // Few-shot examples
    user: string,
    assistant: string
  }[],
  style_samples: string[],           // Example messages
  
  defaults: {
    temperature: number,             // 0-1, controls creativity
    enable_heuristic_replies: boolean
  }
}
```

## Message Object (Database)

```javascript
{
  id: string,              // Unique ID
  conversation_id: string,
  role: 'user' | 'assistant',
  content: string,
  timestamp: ISO8601,
  cite_items?: CiteItem[]
}
```

---

# File Dependency Tree

```
index.html
  ↓
src/main.tsx
  ↓
src/App.tsx
  ├─→ src/api.ts (API client)
  ├─→ src/PersonaSetup.tsx
  │    └─→ src/api.ts
  ├─→ src/LiveAvatar.tsx
  │    └─→ @heygen/liveavatar-web-sdk
  └─→ src/Avatar.tsx
       ├─→ @react-three/fiber
       ├─→ @react-three/drei
       └─→ three

src/style.css (imported in main.tsx)

Backend:
Express App (server.js)
  ├─→ personaEngine.js (core logic)
  ├─→ whatsappPersona.js (WhatsApp parsing)
  └─→ db/index.js (database)
       └─→ db/schema.sql (schema definition)

Configuration:
  ├─→ vite.config.ts (frontend build)
  ├─→ tsconfig.json (TypeScript)
  ├─→ package.json (dependencies)
  └─→ .env (environment variables)
```

---

# Summary

**Frontend Modules** (5 components, 1 API client, 1 utility):
- Entry → App → PersonaSetup | Chat | Avatar
- API client unifies all backend communication
- Lazy-loaded avatar component for optional features

**Backend Modules** (3 main services, 1 database):
- server.js: HTTP API and orchestration
- personaEngine.js: AI logic and LLM integration
- whatsappPersona.js: Chat parsing and analysis
- db/: SQLite persistence layer

**Configuration**:
- Vite proxies frontend to backend
- TypeScript strict mode enabled
- Environment variables for secrets
- Database uses WAL mode and indexes

Each file has a clear responsibility with minimal coupling. The architecture supports adding new features without major refactoring.

