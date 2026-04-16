# AI Avatar - How Each File Works (Complete Guide)

This document explains **what each file does** and **how it works in practice** with real workflows.

---

## TABLE OF CONTENTS

1. [Frontend - Entry Point](#frontend---entry-point)
2. [Frontend - Main Application](#frontend---main-application)
3. [Frontend - Persona Setup](#frontend---persona-setup)
4. [Frontend - Avatar Display](#frontend---avatar-display)
5. [Frontend - API Client](#frontend---api-client)
6. [Backend - Server & API](#backend---server--api)
7. [Backend - Persona Engine](#backend---persona-engine)
8. [Backend - WhatsApp Parser](#backend---whatsapp-parser)
9. [Backend - Database](#backend---database)
10. [Configuration Files](#configuration-files)
11. [Data Flows](#data-flows)

---

# FRONTEND - Entry Point

## src/main.tsx

**What it does**: Bootstraps the React application

**How it works**:

```
1. Browser loads index.html
2. index.html has <div id="root"></div>
3. main.tsx runs:
   - Imports React & ReactDOM
   - Finds the "root" element in HTML
   - Creates a React root
   - Renders App component into root
4. App component tree renders
5. Styles load from style.css
```

**Code flow**:
```typescript
// Step 1: Create root
const root = ReactDOM.createRoot(
  document.getElementById('root')!  // Find #root in HTML
)

// Step 2: Render App
root.render(
  <React.StrictMode>
    <App />  // This triggers everything
  </React.StrictMode>
)
```

**In plain English**:
- It's the "ignition key" that starts the app
- Without this file, nothing renders on screen
- It connects the React code to the HTML page

---

# FRONTEND - Main Application

## src/App.tsx

**What it does**: Controls the entire application state and user experience

**How it works** (Step by step):

### On Page Load (useEffect runs once)

```
1. Browser loads app
2. useEffect hook triggers
3. Calls api.bootstrap() to backend
   ↓
4. Backend returns:
   - userId (generated or from cookie)
   - persona (user's custom persona or default)
   - requiresSetup (boolean)
   
5. Check persona status:
   - If NO persona → Show PersonaSetup screen
   - If YES persona → Load conversations, start chat
```

**Code example**:
```typescript
useEffect(() => {
  async function initialize() {
    try {
      // Call backend for user profile
      const response = await api.bootstrap()
      
      // Is persona already set up?
      if (!response.requiresSetup) {
        // User has persona → load conversations
        setIsPersonaReady(true)
        const convs = await api.getConversations()
        setConversations(convs)
      } else {
        // No persona yet → show setup screen
        setIsPersonaReady(false)
      }
    } catch (error) {
      console.error('Init failed:', error)
    }
  }
  
  initialize()
}, [])  // Empty dependency = run once on mount
```

### When User Sends a Message

```
1. User types in text box and hits Send
2. handleSendMessage() triggers:

3. Add message to local state immediately
   messages = [...messages, { role: 'user', content: 'Hi!' }]
   
4. Call api.chat(conversationId, message)
   ↓ (Sends to backend)
   
5. Backend processes:
   - Analyzes intent
   - Searches knowledge base
   - Calls LLM if needed
   - Generates response
   ↓
   
6. Response arrives with:
   - message: "Hey! How are you?"
   - cite_items: [context references]
   
7. Add response to messages state
   messages = [...messages, { role: 'assistant', content: '...' }]
   
8. If avatar enabled:
   - Increment playbackRequest counter
   - Triggers LiveAvatar to animate
   
9. Display in chat UI
   - User message shown on right (blue)
   - Assistant message shown on left (gray)
   - Citations shown below response
```

**Code example**:
```typescript
async function handleSendMessage() {
  const userMessage = input.trim()
  if (!userMessage) return

  try {
    // 1. Add user message to state
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }])
    
    // 2. Clear input immediately
    setInput('')
    setIsLoading(true)

    // 3. Send to backend
    const response = await api.chat(conversationId, userMessage)
    
    // 4. Add assistant response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.message,
      cite_items: response.cite_items
    }])
    
    // 5. Trigger avatar animation
    setPlaybackRequest(prev => prev + 1)
    
    // 6. Save to database
    db.addMessage(conversationId, 'assistant', response.message)
    
  } catch (error) {
    console.error('Send failed:', error)
  } finally {
    setIsLoading(false)
  }
}
```

### State Variables Explained

```typescript
const [input, setInput] = useState('')
// What user is typing in text box
// Example: "How are you?"

const [messages, setMessages] = useState([])
// All messages in current conversation
// Example: [
//   { role: 'user', content: 'Hi!' },
//   { role: 'assistant', content: 'Hey! How are you?' }
// ]

const [conversationId, setConversationId] = useState(null)
// Current conversation being viewed
// Example: "conv_1234567890_abc123"

const [isPersonaReady, setIsPersonaReady] = useState(false)
// Has user set up their persona?
// true = show chat, false = show setup screen

const [personaSummary, setPersonaSummary] = useState(null)
// Data about the persona
// Example: { name: 'Alice', role: 'Friend', summary: '...' }

const [conversations, setConversations] = useState([])
// List of all user conversations (for sidebar)
// Example: [
//   { id: 'conv_123', title: 'Chat with Alice' },
//   { id: 'conv_456', title: 'Chat with Bob' }
// ]

const [playbackRequest, setPlaybackRequest] = useState(0)
// Counter that triggers avatar speech
// Increment = play animation
```

### Screen Display Logic

```typescript
if (!isPersonaReady) {
  // Show persona setup screen
  return <PersonaSetup onReady={handlePersonaSetupComplete} />
}

// Show chat interface
return (
  <div className="app">
    {/* Left sidebar - conversations list */}
    <div className="sidebar">
      <h2>Conversations</h2>
      {conversations.map(conv => (
        <div key={conv.id} onClick={() => loadConversation(conv.id)}>
          {conv.title}
        </div>
      ))}
      <button onClick={createNewConversation}>+ New Chat</button>
    </div>

    {/* Center - messages and avatar */}
    <div className="chat-area">
      {/* Messages */}
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
            {msg.cite_items && (
              <div className="citations">
                {msg.cite_items.map(item => (
                  <span key={item.source}>{item.source}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Avatar video if enabled */}
      {ENABLE_AVATAR && (
        <LiveAvatarComponent 
          playbackRequest={playbackRequest}
          text={messages[messages.length - 1]?.content}
        />
      )}

      {/* Input area */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading}
        >
          Send
        </button>
      </div>
    </div>
  </div>
)
```

---

# FRONTEND - Persona Setup

## src/PersonaSetup.tsx

**What it does**: Lets users upload WhatsApp chats to create personalized AI personas

**How it works** (Two-phase process):

### Phase 1: File Upload

```
1. User sees upload screen
2. Clicks "Choose File" button
3. Opens file picker
4. User selects WhatsApp chat export (.txt file)
5. File selected event triggers handleFileSelect()

handleFileSelect():
  ↓
6. Validate: Is it a .txt file?
7. Create FormData with file
8. POST to /api/persona/preview-whatsapp
  ↓
9. Backend parses file:
   - Extract all participants
   - Count messages per person
   - Get message samples
  ↓
10. Response returns list of people
    Example:
    [
      { name: 'Alice', messageCount: 245 },
      { name: 'Bob', messageCount: 198 }
    ]
    
11. Display list to user
12. Move to Phase 2: Choose Person
```

**Phase 1 Code**:
```typescript
function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.name.endsWith('.txt')) {
    setError('Please select a .txt file')
    return
  }

  setSetupFile(file)
  setIsLoading(true)

  // Create form data
  const formData = new FormData()
  formData.append('file', file)

  // Send to backend
  api.previewWhatsapp(formData)
    .then(response => {
      // Response: { participants: [...], totalMessages: 245, dateRange: {...} }
      setParticipants(response.participants)
      setSetupState('choose-person')  // Move to phase 2
    })
    .catch(err => {
      setError('Failed to parse file: ' + err.message)
    })
    .finally(() => setIsLoading(false))
}
```

### Phase 2: Choose Person

```
1. User sees list of people from the chat
2. Each person shows:
   - Profile picture (or avatar)
   - Name
   - Message count
   - Sample messages
   
3. User clicks a person (e.g., "Alice")
4. handleChoosePerson(name) triggers

handleChoosePerson():
  ↓
5. Create FormData with:
   - file (from Phase 1)
   - selectedParticipant: "Alice"
   
6. POST to /api/persona/configure-whatsapp
  ↓
7. Backend analyzes Alice's messages:
   - Extract speaking style (formal/casual)
   - Find signature phrases ("that's cool", "totally agree")
   - Analyze message patterns
   - Build personality profile
   - Generate bio
  ↓
8. Response returns:
   {
     configured: true,
     name: 'Alice',
     role: 'Friend',
     summary: 'A tech enthusiast who loves coffee...',
     source: 'whatsapp'
   }
   
9. Call onReady(personaSummary)
   ↓
10. App component receives this
11. Sets isPersonaReady = true
12. Shows chat interface
```

**Phase 2 Code**:
```typescript
function handleChoosePerson(name: string) {
  if (!setupFile) return

  setIsLoading(true)

  const formData = new FormData()
  formData.append('file', setupFile)
  formData.append('selectedParticipant', name)

  api.configureWhatsapp(formData)
    .then(response => {
      // Response: { configured: true, name: 'Alice', ... }
      
      // Tell parent App that setup is complete
      onReady({
        configured: true,
        source: 'whatsapp',
        name: response.name,
        role: response.role,
        summary: response.summary
      })
      
      // App will now show chat instead of setup
    })
    .catch(err => {
      setError('Failed to create persona: ' + err.message)
    })
    .finally(() => setIsLoading(false))
}
```

**Visual Flow**:
```
┌─────────────────────────────────────┐
│   PHASE 1: Upload WhatsApp File    │
├─────────────────────────────────────┤
│                                     │
│  Click "Choose File"                │
│        ↓                            │
│  Select conversation.txt            │
│        ↓                            │
│  Backend parses file                │
│        ↓                            │
│  Returns: [Alice, Bob, Charlie]    │
│                                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   PHASE 2: Choose Person to Mimic  │
├─────────────────────────────────────┤
│                                     │
│  ☐ Alice (245 messages)             │
│  ☐ Bob (198 messages)               │
│  ☐ Charlie (42 messages)            │
│                                     │
│  User clicks: Alice                │
│        ↓                            │
│  Backend analyzes Alice's messages │
│        ↓                            │
│  Generates persona profile         │
│        ↓                            │
│  Ready to chat!                    │
│                                     │
└─────────────────────────────────────┘
```

---

# FRONTEND - Avatar Display

## src/LiveAvatar.tsx

**What it does**: Shows animated video of AI speaking (using HeyGen SDK)

**How it works**:

### Initialization (When app loads)

```
1. Component mounts
2. useEffect runs:

   a) Request session token from backend
      POST /api/heygen/session-token
         ↓
      Backend calls HeyGen API
         ↓
      Returns: { session_id: '123', session_token: 'abc...' }
   
   b) Create HeyGenAvatarSession
      new HeyGenAvatarSession({
        apiKey: HEYGEN_API_KEY,
        token: session_token,
        avatarId: AVATAR_MODEL_ID,
        voiceId: VOICE_MODEL_ID
      })
   
   c) Attach to <video> element
      session.attachStreamTo(videoRef.current)
      ↓
      Video stream now displays in page
   
   d) Subscribe to session events:
      - STREAM_READY: Avatar is ready for speech
      - AVATAR_START_SPEAKING: Avatar started talking
      - AVATAR_END_SPEAKING: Avatar finished talking
      - SESSION_ERROR: Something went wrong
   
   e) Update state: session is ready!
```

**Code**:
```typescript
useEffect(() => {
  async function initializeSession() {
    try {
      // 1. Get session token from backend
      const tokenResponse = await fetch(
        `${apiBaseUrl}/api/heygen/session-token`,
        { method: 'POST' }
      )
      const { session_token } = await tokenResponse.json()

      // 2. Create HeyGen session
      const newSession = new HeyGenAvatarSession({
        apiKey: HEYGEN_API_KEY,
        token: session_token,
        avatarId: LIVEAVATAR_AVATAR_ID,
        voiceId: LIVEAVATAR_VOICE_ID,
        language: 'en'
      })

      // 3. Attach to video element
      newSession.attachStreamTo(videoRef.current!)

      // 4. Subscribe to events
      newSession.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        setSessionState(state)
      })

      newSession.on(SessionEvent.AVATAR_START_SPEAKING, () => {
        setIsSpeaking(true)
      })

      newSession.on(SessionEvent.AVATAR_END_SPEAKING, () => {
        setIsSpeaking(false)
      })

      // 5. Save session
      setSession(newSession)

    } catch (error) {
      console.error('Failed to initialize HeyGen:', error)
    }
  }

  initializeSession()
}, [])
```

### When User Sends Message (Trigger Speech)

```
1. App.tsx increments playbackRequest counter
   setPlaybackRequest(prev => prev + 1)

2. LiveAvatar detects change via useEffect dependency
3. Check if session is ready
4. Call session.publishData() with speech text
   ↓
   
5. HeyGen API:
   - Generates avatar animation
   - Adds voice with text-to-speech
   - Syncs lip movements
   - Streams video back
   ↓
   
6. Video streams to <video> element
7. Audio plays automatically
8. Avatar animates with mouth movements
9. Gestures play in background
10. When speech ends, fires END_SPEAKING event
```

**Code**:
```typescript
useEffect(() => {
  if (playbackRequest === 0) return  // Initial value
  if (!session || sessionState !== SessionState.CONNECTED) return
  if (!text) return

  async function playAvatar() {
    try {
      // Publish text for avatar to speak
      await session.publishData(
        {
          text: text,
          taskType: 'TALK'
        }
      )
      // HeyGen now generates video and streams it
    } catch (error) {
      console.error('Avatar speech failed:', error)
    }
  }

  playAvatar()
}, [playbackRequest, text, session, sessionState])
```

**What you see**:
```
Avatar in video element:
- 3D model of person
- Lips move with speech
- Eyes blink naturally
- Gestures occasionally
- High-quality video stream
```

---

## src/Avatar.tsx

**What it does**: 3D character model (fallback if avatar disabled)

**How it works**:

### Load 3D Model

```
1. Component renders
2. useGLTF() hook loads 3D model from file:
   /public/mixamo/avatar_with_animations.glb
   
   This file contains:
   - 3D mesh (character geometry)
   - Skeleton (bones for movement)
   - Animations (Idle, Talk, Walk, etc.)
   ↓
   
3. Extract from loaded model:
   const { scene, animations } = useGLTF(modelPath)
   
   scene: The 3D scene to render
   animations: Array of animation clips
```

### Setup Animations

```
1. Create AnimationMixer for the scene
   const mixer = new AnimationMixer(scene)
   
2. For each animation clip, create an action:
   const action = mixer.clipAction(clip)
   
3. Store all actions in ref:
   actionsRef.current = [action1, action2, action3, ...]
   
4. Play first animation by default:
   actions[0].play()
```

**Code**:
```typescript
useEffect(() => {
  if (!animations.length) return

  // Create mixer
  const mixer = new AnimationMixer(scene)
  mixerRef.current = mixer

  // Create actions for each animation
  const actions = animations.map(clip => {
    const action = mixer.clipAction(clip)
    return action
  })

  actionsRef.current = actions

  // Play first animation
  if (actions.length > 0) {
    actions[0].play()
    setCurrent(animations[0].name)
  }

  return () => {
    // Cleanup
    mixer.stopAllAction()
    mixer.uncacheRoot(scene)
  }
}, [animations, scene])
```

### Update Animation Every Frame

```
1. useFrame hook runs every frame (~60fps)
2. Get time elapsed since last frame
3. Update mixer with delta time
   mixer.update(deltaTime)
   ↓
   Advances current animation by deltaTime
   ↓
4. Avatar animates smoothly

Example:
Frame 1: deltaTime = 16ms → animate 16ms forward
Frame 2: deltaTime = 17ms → animate 17ms forward
Frame 3: deltaTime = 16ms → animate 16ms forward
Result: Smooth 60fps animation
```

**Code**:
```typescript
useFrame(({ clock }) => {
  if (!mixerRef.current) return

  // Get delta time since last frame
  const delta = clock.getDelta()

  // Update animation
  mixerRef.current.update(delta)
})
```

### Switch Animation

```
1. User selects different animation (e.g., "Talking")
2. playAnimation("Talking") called
3. Find the action for "Talking" in actionsRef
4. Stop previous animation
5. Reset new action to start
6. Play new action
7. Avatar animates
```

**Animations Available**:
- Idle (standing still)
- Talking (mouth moving, hand gestures)
- Walking (stepping forward)
- Breathing (subtle chest movement)
- Greeting (wave hand)
- Thinking (hand on chin)
- Happy (celebratory pose)

---

# FRONTEND - API Client

## src/api.ts

**What it does**: Provides type-safe functions to call backend APIs

**How it works**:

### URL Resolution

```
Strategy: Try multiple API locations

1. Check environment variable VITE_API_BASE_URL
   - If set, use that URL
   Example: "https://api.example.com"

2. If on localhost, use localhost:5000
   - Good for development
   Example: "http://localhost:5000"

3. Otherwise, use current domain
   - Good for production
   Example: "https://www.example.com"
```

**Code**:
```typescript
const API_BASE_URL = (() => {
  // Priority 1: Environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) return envUrl

  // Priority 2: Localhost fallback (for development)
  if (typeof window !== 'undefined' && 
      window.location.hostname === 'localhost') {
    return 'http://localhost:5000'
  }

  // Priority 3: Same domain (for production)
  return window.location.origin
})()
```

### Fetch Wrapper

```
All API calls go through fetchApi() function:

1. Construct full URL
   baseUrl + endpoint
   Example: "http://localhost:5000" + "/api/chat"

2. Set headers
   Content-Type: application/json
   Include credentials (cookies for session)

3. Make fetch request
4. Check response status
5. Parse JSON
6. Return data or throw error
```

**Code**:
```typescript
async function fetchApi(
  endpoint: string,
  options?: RequestInit
) {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    credentials: 'include',  // Send cookies
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
```

### API Functions

Each function maps to a backend endpoint:

```typescript
export const api = {
  // Get user profile and persona status
  bootstrap: () =>
    fetchApi('/api/persona/bootstrap')
    // Returns: { userId, requiresSetup, persona }

  // Get current persona
  getPerson: () =>
    fetchApi('/api/persona')
    // Returns: { name, role, summary, configured }

  // Preview WhatsApp participants
  previewWhatsapp: (formData: FormData) =>
    fetch(`${API_BASE_URL}/api/persona/preview-whatsapp`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }).then(r => r.json())
    // FormData must contain 'file' field
    // Returns: { participants, totalMessages, dateRange }

  // Configure persona from WhatsApp
  configureWhatsapp: (formData: FormData) =>
    fetch(`${API_BASE_URL}/api/persona/configure-whatsapp`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }).then(r => r.json())
    // FormData must contain 'file' and 'selectedParticipant'
    // Returns: { configured, name, role, summary }

  // Get all conversations
  getConversations: () =>
    fetchApi('/api/conversations')
    // Returns: [{ id, title, created_at }, ...]

  // Get specific conversation
  getConversation: (id: string) =>
    fetchApi(`/api/conversations/${id}`)
    // Returns: { id, title, messages: [...] }

  // Create new conversation
  createConversation: (title: string) =>
    fetchApi('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    })
    // Returns: { id, title }

  // Send message and get response
  chat: (conversationId: string, message: string) =>
    fetchApi('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        message
      })
    })
    // Returns: { message, cite_items }
}
```

### Type Definitions

```typescript
// A message in the database
interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// A conversation with all its messages
interface Conversation {
  id: string
  user_id: string
  title: string
  messages: StoredMessage[]
  message_count: number
}

// Info about a user's persona
interface PersonaSummary {
  configured: boolean
  source: 'whatsapp' | 'default'
  name: string
  role: string
  summary: string
}

// Response from bootstrap endpoint
interface BootstrapResponse {
  userId: string
  requiresSetup: boolean
  persona: PersonaSummary
}

// Person extracted from WhatsApp chat
interface Participant {
  name: string
  messageCount: number
  sampleMessages: string[]
}
```

---

# BACKEND - Server & API

## backend/server.js

**What it does**: Express.js HTTP server that handles all API requests

**How it works**:

### Server Startup

```
1. Node.js starts server.js
2. Imports dependencies:
   - Express (web framework)
   - Database (SQLite)
   - personaEngine.js (AI logic)
   - whatsappPersona.js (Chat parsing)

3. Initialize database
   db.initialize()
   ↓
   Creates tables if needed
   Loads schema.sql

4. Create Express app
   const app = express()

5. Setup middleware (request processing):
   - Enable CORS (cross-origin requests)
   - Parse JSON body
   - Attach session to each request
   - Extract userId from cookie

6. Define API endpoints
   GET /
   GET /health
   GET /api/persona
   POST /api/chat
   ... etc

7. Start listening
   app.listen(PORT, () => console.log('Running'))
```

### Session Management

```
Purpose: Identify users without login

1. Browser makes request
2. Middleware looks at cookies
3. Finds: persona_user_session=ABC123.XYZ789

4. Verify signature:
   - Split by dot: [ABC123, XYZ789]
   - Recalculate hash of "ABC123"
   - Compare with XYZ789
   - If match: Cookie is valid
   - If no match: Cookie is forged (reject)

5. Attach req.userId = "ABC123"

6. Handler can access req.userId
   ↓
   Knows which user is making request
```

**Code**:
```javascript
function signSession(userId) {
  // Create signature
  const signature = createHmac('sha256', SESSION_SECRET)
    .update(userId)
    .digest('hex')
  
  // Return: "user123.signature789"
  return `${userId}.${signature}`
}

function verifySession(sessionString) {
  if (!sessionString) return null
  
  const [payload, signature] = sessionString.split('.')
  
  // Recalculate expected signature
  const expected = createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex')
  
  // Compare
  if (signature === expected) {
    return payload  // Valid: return userId
  }
  return null  // Invalid: reject
}

// Middleware
app.use((req, res, next) => {
  // Extract session from cookie
  const sessionCookie = req.headers.cookie
    ?.split(';')
    .find(c => c.trim().startsWith('persona_user_session='))
    ?.replace('persona_user_session=', '')
  
  // Verify session
  const userId = verifySession(sessionCookie)
  
  if (!userId) {
    // No valid session: create new user
    const newUserId = 'user_' + Date.now()
    req.userId = newUserId
    res.setHeader('Set-Cookie', `persona_user_session=${signSession(newUserId)}; Path=/`)
  } else {
    // Valid session: use existing user
    req.userId = userId
  }
  
  next()
})
```

### Main Endpoints

#### GET /api/persona/bootstrap

```
When: App loads
Request: None
Response: User profile and persona status

Handler:
1. Look up user in database
   db.getUserProfile(req.userId)
   
2. Extract persona from preferences
   profile.preferences.persona
   
3. Return formatted response
   {
     userId: "user_123",
     requiresSetup: true/false,
     persona: { name, role, summary, ... }
   }

Frontend receives this and:
- If requiresSetup=true: Show setup screen
- If requiresSetup=false: Show chat
```

**Code**:
```javascript
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

#### POST /api/persona/preview-whatsapp

```
When: User selects WhatsApp file
Request: FormData with 'file' field
Response: List of participants

Handler:
1. Extract file from request
2. Read file content
3. Call parseWhatsAppChat()
   ↓
   Extract all messages with timestamps and names
   
4. Call getWhatsAppParticipants()
   ↓
   Count messages per person
   Group by sender name
   
5. Return list:
   [
     { name: "Alice", messageCount: 245 },
     { name: "Bob", messageCount: 198 }
   ]

Frontend displays list so user can choose
```

#### POST /api/persona/configure-whatsapp

```
When: User selects a person to mimic
Request: FormData with 'file' and 'selectedParticipant'
Response: Generated persona profile

Handler:
1. Extract file and participant name
2. Parse WhatsApp chat
3. Filter messages for selected person
   messages.filter(m => m.sender === "Alice")
   
4. Call buildPersonaProfileFromWhatsApp()
   ↓
   Analyzes Alice's messages:
   - Speaking style (formal/casual/length)
   - Signature phrases ("that's cool")
   - Common topics
   - Message patterns
   ↓
   
5. Creates persona object:
   {
     person: { name, role, summary, speaking_style, ... },
     behavior_rules: [...],
     knowledge_base: [...],
     chat_examples: [...],
     ...
   }
   
6. Save to user preferences
   db.updateUserPreferences(userId, { persona })
   
7. Return summary to frontend
   { configured: true, name: "Alice", ... }
```

#### POST /api/chat (Most Complex)

```
When: User sends a message
Request: { conversation_id, message }
Response: { message, cite_items }

Flow:

1. Save user message to database
   db.addMessage(conversationId, 'user', message)

2. Load persona
   persona = userProfile.preferences.persona
   
3. Analyze message intent
   intent = analyzePersonaReplyNeed(message)
   
   Returns: { intents: ['casual'], needsContext, ... }

4. Try deterministic reply (rules)
   reply = buildDeterministicPersonaReply(message, persona)
   
   Examples:
   - "Hi!" → "Hey! How are you?"
   - "Thanks!" → "No problem!"
   - "Bye" → "See you later!"
   
   If found: Skip to step 8

5. Try heuristic reply (templates)
   if (!reply && shouldTryHeuristic) {
     reply = buildHeuristicPersonaReply(message, persona)
   }
   
   Uses persona's signature phrases
   
   If found: Skip to step 8

6. Need LLM: Retrieve context
   context = retrievePersonaContext(message, knowledge_base)
   
   Finds 3-6 relevant knowledge items
   Example: ["Python is great", "Loves coffee"]

7. Call Groq LLM
   systemPrompt = buildPersonaPrompt(persona, context)
   
   POST https://api.groq.com/openai/v1/chat/completions
   {
     model: "llama-3.3-70b-versatile",
     system: systemPrompt,
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: message }
     ]
   }
   ↓
   Groq API generates response using LLM
   ↓
   reply = response.choices[0].message.content

8. Clean up response
   reply = postProcessPersonaReply(reply)
   
   Remove artifacts, fix formatting

9. Save response to database
   db.addMessage(conversationId, 'assistant', reply)

10. Return to frontend
    {
      message: "Alice's response...",
      cite_items: [
        { type: "knowledge", text: "...", source: "..." }
      ]
    }

11. Frontend displays message with citations
```

**Code**:
```javascript
app.post('/api/chat', async (req, res) => {
  try {
    const { conversation_id, message } = req.body

    // 1. Save user message
    db.addMessage(conversation_id, 'user', message)

    // 2. Get persona
    const profile = db.getUserProfile(req.userId)
    const persona = profile.preferences?.persona
    if (!persona) {
      return res.status(400).json({ error: 'Persona not configured' })
    }

    // 3. Analyze intent
    const replyNeed = analyzePersonaReplyNeed(message)

    // 4. Try deterministic
    let response = buildDeterministicPersonaReply(message, persona)

    // 5. Try heuristic
    if (!response && replyNeed.shouldUseLM !== true) {
      response = buildHeuristicPersonaReply(message, persona)
    }

    // 6. Retrieve context
    let contextItems = []
    if (!response || replyNeed.needsContext) {
      contextItems = retrievePersonaContext(
        message,
        persona.knowledge_base
      )
    }

    // 7. Call LLM
    if (!response) {
      const history = db.getRecentMessages(conversation_id, 6)
      const systemPrompt = buildPersonaPrompt(
        persona,
        contextItems,
        history
      )

      const groqRes = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
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
        }
      )

      const result = await groqRes.json()
      response = result.choices[0].message.content
    }

    // 8. Clean up
    response = postProcessPersonaReply(response)

    // 9. Save response
    db.addMessage(conversation_id, 'assistant', response)

    // 10. Return
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
    res.status(500).json({ error: 'Chat failed' })
  }
})
```

---

# BACKEND - Persona Engine

## backend/personaEngine.js

**What it does**: Core AI logic for generating persona responses

**How it works**:

### analyzePersonaReplyNeed(message)

```
Purpose: Determine what kind of response is needed

Algorithm:

1. Extract keywords from message
   "I love Python and data science"
   ↓
   keywords: ["python", "data", "science"]

2. Remove stop words (the, a, and, etc.)
   150+ common words that aren't meaningful

3. Classify intent by matching keywords:
   
   if includes: ["project", "deadline", "team", "meeting"]
     → intent = "work"
   
   if includes: ["when", "time", "date", "tomorrow"]
     → intent = "scheduling"
   
   if includes: ["how are you", "whats up", "hey"]
     → intent = "casual"
   
   if includes: ["what is", "how do", "explain"]
     → intent = "knowledge"
   
   if includes: ["help", "can you", "could you"]
     → intent = "help"
   
   if includes: ["sorry", "apologies", "forgive"]
     → intent = "apology"
   
   if includes: ["?", "who", "what", "when"]
     → intent = "question"
   
   else
     → intent = "general"

4. Return analysis:
   {
     intents: ['casual', 'general'],
     needsContext: false,
     shouldUseLM: null,    // null = auto-decide
     confidence: 0.8
   }
```

**Code**:
```javascript
function analyzePersonaReplyNeed(message) {
  const INTENT_KEYWORDS = {
    work: ['project', 'work', 'deadline', 'team', 'meeting'],
    scheduling: ['when', 'time', 'date', 'tomorrow'],
    casual: ['how are you', 'whats up', 'hey'],
    knowledge: ['what is', 'how do', 'explain'],
    help: ['help', 'can you', 'could you'],
    apology: ['sorry', 'apologies', 'forgive'],
    question: ['?', 'who', 'what', 'when'],
    general: []
  }

  const msg = message.toLowerCase()
  const intents = []

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => msg.includes(kw))) {
      intents.push(intent)
    }
  }

  return {
    intents: intents.length ? intents : ['general'],
    needsContext: intents.includes('knowledge') ||
                 intents.includes('help'),
    shouldUseLM: intents.includes('work') ? true : null,
    confidence: 0.8
  }
}
```

### buildDeterministicPersonaReply(message, persona)

```
Purpose: Generate rule-based replies (no LLM)

Rules:

Greeting Detection:
  if message matches: "hi", "hello", "hey"
    return persona's greeting phrase
    e.g., "Hey! How are you?"

Gratitude Detection:
  if message matches: "thanks", "thank you", "appreciate"
    return persona's thank-you phrase
    e.g., "No problem! Happy to help."

Farewell Detection:
  if message matches: "bye", "goodbye", "see you"
    return persona's goodbye phrase
    e.g., "See you later!"

Affirmation Detection:
  if message matches: "ok", "fine", "sounds good"
    return persona's affirmation
    e.g., "Great!"

If no rule matches:
  return null (try next strategy)
```

**Example**:
```javascript
const GREETING_PATTERNS = /^(hi|hello|hey|greetings|howdy)\s*!?$/i
const GRATITUDE_PATTERNS = /^(thanks|thank you|appreciate|grateful)/i
const FAREWELL_PATTERNS = /^(bye|goodbye|see you|farewell)/i

function buildDeterministicPersonaReply(message, persona) {
  const msg = message.trim().toLowerCase()

  // Check greeting
  if (GREETING_PATTERNS.test(msg)) {
    return "Hey! How are you?"
  }

  // Check gratitude
  if (GRATITUDE_PATTERNS.test(msg)) {
    return "No problem! Happy to help."
  }

  // Check farewell
  if (FAREWELL_PATTERNS.test(msg)) {
    return "See you later!"
  }

  // No match
  return null
}
```

### buildHeuristicPersonaReply(message, persona)

```
Purpose: Template-based replies using persona's style

Algorithm:

1. Extract person's signature phrases
   persona.person.signature_phrases
   ["that's cool", "totally agree", "I get what you mean"]

2. Template library:
   [
     "{sigPhrase}",
     "Yeah, {sigPhrase}.",
     "I think {sigPhrase}.",
     "That makes sense. {sigPhrase}.",
     "Agreed! {sigPhrase}."
   ]

3. Pick random template
4. Fill in random signature phrase
5. Return response

Example:
- Message: "Python is amazing"
- Template picked: "Yeah, {sigPhrase}."
- Signature phrase: "totally agree"
- Result: "Yeah, totally agree."
```

### buildPersonaPrompt(persona, contextItems, history)

```
Purpose: Create system prompt for LLM

Structure:

WHO YOU ARE:
  You are Alice, a person who is [summary]
  Role: Friend
  Known for: [signature_phrases]

HOW YOU SPEAK:
  - Message length: average 35 words
  - Formality: casual
  - Emoji usage: 40% of messages

KNOWLEDGE:
  Topics you discuss:
  - Python and data science
  - Coffee and morning routines
  - Tech conferences

BEHAVIOR RULES:
  - Stay authentic to your speaking style
  - Use natural language
  - Keep messages concise
  - Show personality

RECENT CONTEXT:
  - [cite_item_1]
  - [cite_item_2]
  - [cite_item_3]

RECENT CONVERSATION:
  user: "Hi!"
  assistant: "Hey! How are you?"
  user: "I'm learning Python"
  assistant: "That's awesome! I love Python..."

RESPONSE:
  Remember: You are Alice. Stay in character. Keep it natural.
```

**Generated Prompt Example**:
```
You are Alice, a software engineer and tech enthusiast who loves
coffee and open-source projects.

Speaking Style:
- Casual and conversational
- Average message length: 35 words
- Emoji usage: 40%
- Signature phrases: "totally agree", "that's cool", "let me think"

Knowledge Base:
- Python and data science
- Coffee brewing techniques
- Open-source communities
- Tech conferences

Behavior Rules:
1. Stay authentic to Alice's speaking style
2. Use natural language
3. Keep messages concise when appropriate
4. Show personality through emoji and tone
5. Reference shared experiences when relevant

You're chatting with someone. Keep responses natural and conversational.
```

---

# BACKEND - WhatsApp Parser

## backend/whatsappPersona.js

**What it does**: Parse WhatsApp chat exports and analyze speaking style

**How it works**:

### parseWhatsAppChat(fileContent)

```
Purpose: Convert WhatsApp .txt to structured data

Input:
[12/31/2024, 11:59:59 PM] Alice: Hey! How are you?
[12/31/2024, 11:59:59 PM] Bob: Doing great! You?
[01/01/2025, 12:00:00 AM] Alice: <Media omitted>

Process:

1. Split file into lines
2. For each line, check format:
   
   Format 1: [DATE, TIME] NAME: MESSAGE
   Format 2: DATE, TIME - NAME: MESSAGE

3. Extract with regex:
   ```
   /\[(\d{1,2}\/\d{1,2}\/\d{4}),?\s+(\d{1,2}:\d{2}(:\d{2})?)\s*(AM|PM)?\]\s+(.+?):\s*(.*)/
   ```

4. Parse fields:
   - timestamp → convert to ISO 8601
   - sender → person's name
   - content → message text
   - isMedia → true if "<Media omitted>"

5. Return structured array:
   [
     {
       timestamp: "2024-12-31T23:59:59Z",
       sender: "Alice",
       content: "Hey! How are you?",
       isMedia: false
     },
     {
       timestamp: "2025-01-01T00:00:00Z",
       sender: "Bob",
       content: "Doing great! You?",
       isMedia: false
     }
   ]
```

### getWhatsAppParticipants(messages)

```
Purpose: Count messages per person

Algorithm:

1. Create object to count messages
   participants = {
     "Alice": 245,
     "Bob": 198,
     "Charlie": 42
   }

2. Loop through messages
   for each message:
     sender = message.sender
     participants[sender]++

3. Sort by message count (descending)
4. Return formatted array:
   [
     { name: "Alice", messageCount: 245 },
     { name: "Bob", messageCount: 198 },
     { name: "Charlie", messageCount: 42 }
   ]

Uses: User selects which person to mimic
```

### buildPersonaProfileFromWhatsApp(messages, selectedPerson)

**Complex Analysis**:

```
Purpose: Extract Alice's personality from her messages

Steps:

1. FILTER MESSAGES
   Keep only messages from Alice
   Remove media-only messages
   Remove system messages

2. ANALYZE SPEAKING STYLE
   
   Average length:
   - Sum word count of all messages
   - Divide by number of messages
   - Result: ~35 words per message
   
   Question ratio:
   - Count messages ending with "?"
   - Divide by total messages
   - Result: ~15% are questions
   
   Emoji usage:
   - Count messages with emoji
   - Divide by total
   - Result: ~40% use emoji
   
   Formality:
   - If avg length > 20 words → "formal"
   - If avg length < 20 words → "casual"
   
   Frequency:
   - Messages per day
   - Categorize as: low / moderate / high

3. EXTRACT SIGNATURE PHRASES
   
   Find phrases appearing 2+ times:
   - Split messages into sentences
   - Extract 2-5 word phrases
   - Count occurrences
   - Keep phrases with count >= 2
   
   Examples:
   - "that's cool" (appears 3 times)
   - "totally agree" (appears 2 times)
   - "let me think" (appears 4 times)

4. BUILD STYLE SAMPLES
   
   Pick 3-5 representative messages
   That showcase Alice's typical style

5. BUILD CHAT EXAMPLES
   
   Create user-assistant pairs:
   [
     { user: "Hi!", assistant: "Hey! How are you?" },
     { user: "What's up?", assistant: "Not much! Just coding." }
   ]

6. INFER ROLE AND RELATIONSHIP
   
   Analyze message content:
   - Mentions work/projects → "Colleague"
   - Casual tone + long friendship → "Friend"
   - Gives advice → "Mentor"
   - etc.

7. GENERATE BIO
   
   Create summary like:
   "A software engineer who loves Python,
    coffee, and open-source projects. Casual
    and friendly, with a good sense of humor."

8. ASSEMBLE PERSONA
   
   Return complete object:
   {
     source: 'whatsapp',
     person: {
       name: "Alice",
       role: "Friend",
       summary: "...",
       speaking_style: { ... },
       signature_phrases: [...]
     },
     behavior_rules: [...],
     knowledge_base: [...],
     chat_examples: [...],
     style_samples: [...],
     defaults: { temperature: 0.7 }
   }
```

---

# BACKEND - Database

## backend/db/index.js

**What it does**: SQLite database operations

**How it works**:

### Initialize Database

```
1. On server startup, createDatabase() called
2. Check if database file exists
   - If not, create new file
3. Enable features:
   - Foreign keys: enforces relationships
   - WAL mode: allows concurrent access
4. Load schema from schema.sql
   - Creates tables if needed
5. Database ready for use
```

### Table Structure

```
user_profiles:
  id (TEXT PRIMARY KEY)
  - "user_123456"
  created_at
  - "2025-04-16T10:30:00Z"
  preferences (JSON)
  - { persona: { ... }, settings: { ... } }

conversations:
  id (TEXT PRIMARY KEY)
  - "conv_1234567890_abc123"
  user_id (FOREIGN KEY)
  - "user_123456"
  title (TEXT)
  - "Chat with Alice"
  created_at
  - "2025-04-16T10:30:00Z"
  archived (BOOLEAN)
  - 0 (false)

messages:
  id (TEXT PRIMARY KEY)
  - "msg_1234567890"
  conversation_id (FOREIGN KEY)
  - "conv_1234567890_abc123"
  role (TEXT)
  - "user" or "assistant"
  content (TEXT)
  - "Hey! How are you?"
  timestamp (DATETIME)
  - "2025-04-16T10:30:05Z"
```

### Common Operations

#### Get User Profile

```
Function: getUserProfile(userId)

1. Query database:
   SELECT * FROM user_profiles WHERE id = ?
   Parameters: ["user_123"]

2. If found:
   Return user object with parsed JSON preferences
   {
     id: "user_123",
     created_at: "2025-04-16T10:30:00Z",
     preferences: { persona: { ... } }
   }

3. If not found:
   Auto-create user:
   INSERT INTO user_profiles VALUES (?, ?, ?, ?)
   
   Return new user object
```

#### Add Message

```
Function: addMessage(conversationId, role, content)

1. Generate unique ID
   id = "msg_" + Date.now()

2. Insert into database
   INSERT INTO messages VALUES (?, ?, ?, ?, ?)
   Parameters: [id, conversationId, role, content, timestamp]

3. Return message ID

Result: Message stored in database, visible in conversation
```

#### Get Conversation

```
Function: getConversation(conversationId, userId)

1. Query conversation
   SELECT * FROM conversations 
   WHERE id = ? AND user_id = ?
   
   Check userId to ensure ownership

2. Query all messages
   SELECT * FROM messages 
   WHERE conversation_id = ?
   ORDER BY timestamp ASC

3. Combine:
   {
     id: "conv_123",
     title: "Chat with Alice",
     created_at: "2025-04-16T10:30:00Z",
     messages: [
       { role: 'user', content: 'Hi!' },
       { role: 'assistant', content: 'Hey!' }
     ]
   }

4. Return to frontend
```

#### Get Recent Messages

```
Function: getRecentMessages(conversationId, limit = 6)

Purpose: Get last N messages for LLM context

1. Query messages
   SELECT * FROM messages
   WHERE conversation_id = ?
   ORDER BY timestamp DESC
   LIMIT 6

2. Reverse order (chronological)
3. Return for use in prompt building

Example output (for chat API):
[
  { role: 'user', content: 'What is Python?' },
  { role: 'assistant', content: 'Python is a programming language...' },
  { role: 'user', content: 'Why use it?' },
  { role: 'assistant', content: 'Great for data science...' }
]

Used to build conversation context for LLM
```

---

# Configuration Files

## vite.config.ts

**What it does**: Configures the frontend build process

**How it works**:

```
1. Development Server
   vite.dev
   ↓
   Starts local web server on port 5173
   
2. Hot Module Replacement
   Change TypeScript/React code
   ↓
   Browser reloads automatically
   ↓
   See changes immediately

3. API Proxy
   vite.config.ts defines:
   /api/* → http://localhost:5000/api/*
   /health/* → http://localhost:5000/health/*
   
   Result:
   - Frontend calls fetch('/api/chat')
   - Vite intercepts and forwards to localhost:5000
   - Backend responds
   - No CORS errors!

4. Build Process
   npm run build
   ↓
   Runs vite build command
   ↓
   Compiles TypeScript
   Minifies JavaScript
   Bundles CSS
   Optimizes images
   ↓
   Output: dist/ folder with production files
```

---

## tsconfig.json

**What it does**: TypeScript compiler configuration

**How it works**:

```
1. Type Checking
   Strict mode enabled
   - Check every variable type
   - Catch type errors before runtime
   - No implicit 'any' types

2. Target & Module
   target: ES2022
   - Compile to modern JavaScript
   - Use ES2022 features
   
   module: ESNext
   - Keep ES6 module syntax
   - Let bundler (Vite) handle rest

3. JSX Transformation
   jsx: react-jsx
   - Automatically import React
   - No need for: import React from 'react'

4. Strict Checks
   noUnusedLocals: true
   - Warn about unused variables
   
   noUnusedParameters: true
   - Warn about unused function parameters
   
   noFallthroughCasesInSwitch: true
   - Warn about missing break in switch statements

5. File Inclusion
   include: ["src"]
   - Only check src/ folder
   - Ignore node_modules, dist, etc.
```

---

## package.json (Frontend & Backend)

**What it does**: Declares project dependencies and scripts

**How it works**:

```
Frontend package.json:

dependencies:
- react: UI framework
- three.js: 3D graphics
- @heygen/liveavatar-web-sdk: Avatar video

devDependencies:
- vite: Fast bundler
- typescript: Type checking
- @vitejs/plugin-react: Vite + React integration

scripts:
  npm run dev → vite
    Starts development server on port 5173
  
  npm run build → tsc && vite build
    Compiles TypeScript
    Bundles for production
    Output: dist/
  
  npm run preview → vite preview
    Preview production build locally

Backend package.json:

dependencies:
- express: HTTP server
- better-sqlite3: Database
- cors: Cross-origin requests

scripts:
  npm start → node server.js
    Start server on port 5000
```

---

# Data Flows

## User Signs Up (First Time)

```
1. Browser navigates to http://localhost:5173
2. main.tsx renders
3. App.tsx mounts
4. useEffect runs:
   api.bootstrap()
   ↓
5. Backend:
   - Check cookie for user ID
   - No cookie found
   - Create new user ID: "user_1234567890"
   - Insert into user_profiles table
   - Create signed cookie
   ↓
6. Frontend receives:
   {
     userId: "user_1234567890",
     requiresSetup: true,
     persona: { ... }
   }
7. setIsPersonaReady(false)
8. Render PersonaSetup component
```

## Upload WhatsApp Chat

```
1. User clicks "Choose File"
2. Selects conversation.txt
3. handleFileSelect() runs
4. POST /api/persona/preview-whatsapp
   ↓
5. Backend:
   - Parse file
   - Extract messages
   - Count per participant
   ↓
6. Response:
   {
     participants: [
       { name: "Alice", messageCount: 245 },
       { name: "Bob", messageCount: 198 }
     ]
   }
7. Frontend displays list
8. User clicks "Alice"
9. handleChoosePerson("Alice")
   ↓
10. Backend:
    - Parse file
    - Filter Alice's messages
    - Analyze speaking style
    - Extract phrases
    - Generate persona
    ↓
11. Response:
    {
      configured: true,
      name: "Alice",
      role: "Friend",
      summary: "Tech-savvy friend who loves Python"
    }
12. Frontend:
    - Save to state
    - setIsPersonaReady(true)
    - Show chat interface
```

## Send Message

```
1. User types "Hi!" and hits Send
2. handleSendMessage() in App.tsx
3. Add to local messages state
   messages = [{ role: 'user', content: 'Hi!' }]
4. Clear input
5. POST /api/chat
   {
     conversation_id: "conv_123",
     message: "Hi!"
   }
   ↓
6. Backend server.js /api/chat handler:
   - Save message to DB
   - Load persona
   - Analyze intent
   - Try deterministic reply
   - Try heuristic reply
   - If needed: get context
   - If needed: call Groq LLM
   - Clean up response
   - Save to DB
   ↓
7. Response:
   {
     message: "Hey! How are you?",
     cite_items: [ ... ]
   }
   ↓
8. Frontend:
   - Add to messages state
   - Display in chat UI
   - Increment playbackRequest counter
   ↓
9. LiveAvatar component detects change
10. Calls HeyGen API to animate speech
11. Avatar video plays with audio
12. User sees animated AI speaking the response
```

---

# Summary

**Entry Point**: src/main.tsx → Loads React app

**App Shell**: src/App.tsx → Manages state and routing

**Setup Flow**: src/PersonaSetup.tsx → WhatsApp upload

**Display**: src/LiveAvatar.tsx (video) or src/Avatar.tsx (3D)

**API Client**: src/api.ts → All backend calls

**Backend**: backend/server.js → HTTP API (7 endpoints)

**Core Logic**: backend/personaEngine.js → AI response generation

**Chat Parsing**: backend/whatsappPersona.js → Extract persona from chats

**Data**: backend/db/index.js → SQLite database operations

**Config**: vite.config.ts, tsconfig.json → Build settings

