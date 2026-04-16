# Frontend Components Documentation

Reference documentation for all React components in the AI Avatar frontend application.

## Table of Contents

1. [Component Overview](#component-overview)
2. [App Component](#app-component)
3. [PersonaSetup Component](#personasetup-component)
4. [LiveAvatar Component](#liveavatar-component)
5. [Avatar Component](#avatar-component)
6. [Integration Notes](#integration-notes)

---

## Component Overview

### Component Hierarchy

```
App (Main Container)
├── PersonaSetup (Conditional - shown during setup)
│   ├── FileInput (Upload WhatsApp chat)
│   └── ParticipantSelector (Choose who to mimic)
│
├── ChatInterface (Main - shown during chat)
│   ├── ConversationHistory (Display messages)
│   ├── MessageInput (User input field)
│   └── ResponseDisplay (Show AI responses)
│
├── LiveAvatar (Conditional - if avatarEnabled)
│   ├── HeyGenSDK Integration
│   ├── VideoPlayer (Display avatar video)
│   └── AudioManager (Play avatar voice)
│
└── Avatar (Conditional - 3D avatar)
    ├── Three.js Scene
    ├── Character Model
    └── AnimationController
```

### Tech Stack

- **React 18+** — UI components
- **TypeScript** — Type safety
- **Vite** — Dev server with Fast Refresh
- **Axios** — HTTP client (via api.ts)
- **Three.js** — 3D rendering (optional)
- **HeyGen SDK** — Avatar animation (optional)

---

## App Component

**File**: [src/App.tsx](../src/App.tsx)

Main application container managing state, routing, and integration of all sub-components.

### Responsibilities

- Manage global state: `conversationId`, `messages`, `personaProfile`, `avatarEnabled`
- Handle persona setup vs chat display logic
- Coordinate API calls with backend
- Manage conversation flow
- Pass props to child components

### Component Props

None (root component)

### State Variables

```typescript
interface AppState {
  personaProfile: PersonaProfile | null    // Current persona
  conversationId: string | null             // Current chat session
  messages: Message[]                       // Chat history
  avatarEnabled: boolean                    // Show 3D/video avatar
  isLoading: boolean                        // API call in progress
  setupStep: 'upload' | 'select' | 'ready' // Persona setup stage
}
```

### Key Functions

#### `useEffect(() => { ... }, [])`
Called on component mount. Initializes the app:
1. Loads default persona via `/api/personas/bootstrap`
2. Generates or retrieves `conversationId`
3. Sets initial state

```typescript
useEffect(() => {
  const initializeApp = async () => {
    const bootstrap = await api.bootstrap()
    setPersonaProfile(bootstrap.personaProfile)
    // ... initialize conversation
  }
  initializeApp()
}, [])
```

#### `handlePersonaSetupComplete(personaProfile, selectedParticipant)`
Called when user completes persona setup (uploads WhatsApp chat and selects participant).
1. Receives persona profile from PersonaSetup component
2. Updates state with new persona
3. Transitions to chat view
4. Resets conversation history

```typescript
const handlePersonaSetupComplete = (profile: PersonaProfile) => {
  setPersonaProfile(profile)
  setSetupStep('ready')
  setMessages([])  // Clear chat history
  generateNewConversationId()
}
```

#### `handleSendMessage(userMessage: string)`
Called when user submits a message in the chat input.
1. Add user message to local state
2. Make API call to `/api/chat`
3. Receive AI response
4. Add response to messages
5. Trigger avatar animation (if enabled)

```typescript
const handleSendMessage = async (userMessage: string) => {
  setIsLoading(true)
  
  // Add user message to UI
  setMessages(prev => [...prev, {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  }])
  
  try {
    // Call backend API
    const response = await api.sendMessage(conversationId, userMessage)
    
    // Add AI response to UI
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.response,
      cite_items: response.cite_items,
      timestamp: response.timestamp
    }])
    
    // Trigger avatar (if enabled)
    if (avatarEnabled && liveAvatarRef.current) {
      await liveAvatarRef.current.playResponse(response.response)
    }
  } catch (error) {
    // Handle error
  }
  
  setIsLoading(false)
}
```

### Rendering Logic

```typescript
return (
  <div className="app">
    {setupStep !== 'ready' ? (
      // Show setup screen
      <PersonaSetup onComplete={handlePersonaSetupComplete} />
    ) : (
      // Show chat interface
      <div className="chat-container">
        {avatarEnabled && (
          <LiveAvatar
            ref={liveAvatarRef}
            personaProfile={personaProfile}
          />
        )}
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    )}
  </div>
)
```

### Usage Example

App is the root component, typically rendered in `main.tsx`:

```typescript
// src/main.tsx
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## PersonaSetup Component

**File**: [src/PersonaSetup.tsx](../src/PersonaSetup.tsx)

Component for uploading WhatsApp chat export and selecting which participant to mimic.

### Responsibilities

- Display file upload form
- Handle WhatsApp .txt file upload
- Show list of participants in the chat
- Let user select participant to mimic
- Call backend to configure persona
- Pass completed persona back to App

### Component Props

```typescript
interface PersonaSetupProps {
  onComplete: (personaProfile: PersonaProfile) => void
  defaultPersonaProfile?: PersonaProfile  // Optional default persona
}
```

### State Variables

```typescript
interface PersonaSetupState {
  whatsappFile: File | null              // Selected WhatsApp file
  participants: Participant[]            // List from preview
  selectedParticipant: string | null      // Chosen participant name
  isLoading: boolean                      // Upload/process in progress
  step: 'upload' | 'select'               // UI step
}
```

### Key Functions

#### `handleFileSelect(event: ChangeEvent<HTMLInputElement>)`
Called when user selects a WhatsApp .txt file.
1. Validate file (must be .txt)
2. Store file
3. Call `/api/persona/preview-whatsapp`
4. Display list of participants
5. Move to 'select' step

```typescript
const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file || !file.name.endsWith('.txt')) {
    alert('Please select a valid WhatsApp chat export (.txt)')
    return
  }
  
  setWhatsappFile(file)
  setIsLoading(true)
  
  try {
    // Call backend to preview
    const formData = new FormData()
    formData.append('file', file)
    
    const preview = await api.previewWhatsapp(formData)
    setParticipants(preview.participants)
    setStep('select')
  } catch (error) {
    alert(`Error: ${error.message}`)
  }
  
  setIsLoading(false)
}
```

#### `handleParticipantSelect(participantName: string)`
Called when user selects a participant from the list.
1. Store selected participant
2. Call `/api/persona/configure-whatsapp`
3. Receive persona profile
4. Call `onComplete` callback
5. Return to App with persona

```typescript
const handleParticipantSelect = async (participantName: string) => {
  setSelectedParticipant(participantName)
  setIsLoading(true)
  
  try {
    // Configure persona from WhatsApp
    const formData = new FormData()
    formData.append('file', whatsappFile)
    formData.append('selectedParticipant', participantName)
    
    const result = await api.configureWhatsapp(formData)
    
    // Return persona to parent component
    onComplete(result.personaProfile)
  } catch (error) {
    alert(`Error: ${error.message}`)
  }
  
  setIsLoading(false)
}
```

### Rendering Logic

```typescript
return (
  <div className="persona-setup">
    {step === 'upload' ? (
      // Step 1: File Upload
      <div>
        <h2>Upload WhatsApp Chat Export</h2>
        <input 
          type="file" 
          accept=".txt"
          onChange={handleFileSelect}
          disabled={isLoading}
        />
        <p>Export a WhatsApp chat to .txt format before uploading</p>
      </div>
    ) : (
      // Step 2: Participant Selection
      <div>
        <h2>Who do you want to chat with?</h2>
        <ul className="participants">
          {participants.map(p => (
            <li key={p.name} onClick={() => handleParticipantSelect(p.name)}>
              <strong>{p.name}</strong>
              <p>{p.messageCount} messages</p>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)
```

### Integration with App

```typescript
<PersonaSetup
  onComplete={handlePersonaSetupComplete}
  defaultPersonaProfile={personaProfile}
/>
```

---

## LiveAvatar Component

**File**: [src/LiveAvatar.tsx](../src/LiveAvatar.tsx)

Renders an animated 3D avatar using HeyGen's LiveAvatar SDK. Plays video and audio of avatar speaking responses.

### Responsibilities

- Integrate HeyGen LiveAvatar SDK
- Stream avatar video in video element
- Handle audio playback
- Play avatar responses to user chat
- Manage video session lifecycle
- Handle SDK initialization and cleanup

### Component Props

```typescript
interface LiveAvatarProps {
  personaProfile: PersonaProfile
  isVisible?: boolean
  apiKey?: string  // Can override from .env
}
```

### State Variables

```typescript
interface LiveAvatarState {
  session: HeyGenAvatarSession | null    // SDK session
  isSessionReady: boolean                  // Session initialized
  isPlaying: boolean                       // Currently playing video
  error: string | null                     // Error message
}
```

### Key Functions

#### `useEffect(() => { ... }, [])`
On component mount, initialize HeyGen SDK.

```typescript
useEffect(() => {
  const initializeAvatar = async () => {
    try {
      const session = new HeyGenAvatarSession({
        apiKey: apiKey || process.env.VITE_LIVEAVATAR_API_KEY,
        avatarName: personaProfile.avatarId || 'default',
      })
      
      await session.startSession()
      setSession(session)
      setIsSessionReady(true)
    } catch (error) {
      setError(`Failed to initialize avatar: ${error.message}`)
    }
  }
  
  initializeAvatar()
  
  return () => {
    // Cleanup on unmount
    session?.endSession()
  }
}, [])
```

#### `async playResponse(text: string)`
Called from App when there's a new AI response to play. Generates and plays avatar video.

```typescript
const playResponse = async (text: string) => {
  if (!session || !isSessionReady) return
  
  setIsPlaying(true)
  
  try {
    // Generate avatar video for text
    const videoData = await session.generateVideo(text, {
      personaId: personaProfile.avatarId,
      voiceId: personaProfile.voiceId,
      language: 'en'
    })
    
    // Play video in video element
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.src = videoData.url
      await videoElement.play()
    }
  } catch (error) {
    setError(`Failed to play avatar: ${error.message}`)
  }
  
  setIsPlaying(false)
}
```

### Rendering Logic

```typescript
return (
  <div className="live-avatar">
    {error && <div className="error">{error}</div>}
    
    {isSessionReady ? (
      <video
        ref={videoRef}
        autoPlay
        muted={false}
        style={{ width: '100%', maxWidth: '400px' }}
      />
    ) : (
      <p>Loading avatar...</p>
    )}
  </div>
)
```

### Using forwardRef

The component uses React `forwardRef` to expose `playResponse` to parent:

```typescript
export const LiveAvatar = forwardRef<LiveAvatarHandle, LiveAvatarProps>(
  (props, ref) => {
    // ... component code ...
    
    useImperativeHandle(ref, () => ({
      playResponse: (text: string) => playResponse(text)
    }))
    
    return (/* JSX */)
  }
)
```

### Integration with App

```typescript
const liveAvatarRef = useRef<LiveAvatarHandle>(null)

// In render
<LiveAvatar ref={liveAvatarRef} personaProfile={personaProfile} />

// When sending message
if (avatarEnabled && liveAvatarRef.current) {
  await liveAvatarRef.current.playResponse(response.response)
}
```

---

## Avatar Component

**File**: [src/Avatar.tsx](../src/Avatar.tsx)

3D character avatar using Three.js. Displays animated character model with optional animations.

### Responsibilities

- Render 3D character model (Three.js)
- Load Mixamo animations
- Control avatar animations
- Handle camera and lighting
- Respond to chat interactions

### Component Props

```typescript
interface AvatarProps {
  personaProfile: PersonaProfile
  scale?: number           // Avatar size (default 1.5)
  animationSpeed?: number  // Animation playback speed
}
```

### State Variables

```typescript
interface AvatarState {
  model: THREE.Group | null          // Loaded character model
  mixer: THREE.AnimationMixer | null  // Animation controller
  actions: THREE.AnimationAction[]    // Loaded animations
  currentAnimation: string | null      // Currently playing animation
}
```

### Key Functions

#### `useEffect(() => { ... }, [personaProfile])`
Load 3D model and animations on component mount.

```typescript
useEffect(() => {
  const loader = new GLTFLoader()
  
  // Load character model
  loader.load('models/character.glb', (gltf) => {
    const model = gltf.scene
    model.scale.set(props.scale, props.scale, props.scale)
    
    sceneRef.current?.add(model)
    
    // Setup animation mixer
    const mixer = new THREE.AnimationMixer(model)
    setMixer(mixer)
    
    // Load animations from Mixamo
    const actions = gltf.animations.map(clip => mixer.clipAction(clip))
    setActions(actions)
  })
}, [personaProfile])
```

#### `playAnimation(animationName: string)`
Play a specific animation on the avatar.

```typescript
const playAnimation = (animationName: string) => {
  const action = actions.find(a => a.getClip().name === animationName)
  
  if (action) {
    if (currentAnimation) {
      actions[currentAnimation].stop()
    }
    action.reset()
    action.play()
    setCurrentAnimation(animationName)
  }
}
```

### Rendering Logic

Uses React Three Fiber for easier Three.js integration:

```typescript
return (
  <div className="avatar-container">
    <Canvas camera={{ position: [0, 1.6, 2.5], fov: 50 }}>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      
      {/* 3D Scene */}
      <group ref={groupRef}>
        {/* Model loaded via useGLTF */}
        <Model personaProfile={personaProfile} />
      </group>
      
      {/* Controls */}
      <OrbitControls />
    </Canvas>
  </div>
)
```

### Available Animations

Mixamo provides animations like:
- `Idle` — Neutral standing pose
- `Talking` — Speaking animation (loops)
- `Breathing Idle` — Breathing while idle
- `Greeting` — Wave/greeting gesture
- `Thinking` — Hand-on-chin thinking
- `Happy` — Celebratory

---

## Integration Notes

### Data Flow Between Components

```
User Input (Browser)
    ↓
App state update
    ↓
API call to backend
    ↓
Response received
    ↓
Update messages state
    ↓
Re-render ChatDisplay
    ↓
Trigger LiveAvatar or Avatar animation
```

### API Integration (api.ts)

All API calls go through a type-safe wrapper:

```typescript
// src/api.ts
export const bootstrap = () => 
  axios.post<BootstrapResponse>('/api/personas/bootstrap')

export const sendMessage = (
  conversationId: string, 
  userMessage: string
) => axios.post<ChatResponse>('/api/chat', {
  conversationId,
  userMessage
})

export const previewWhatsapp = (formData: FormData) =>
  axios.post<WhatsappPreviewResponse>(
    '/api/persona/preview-whatsapp',
    formData
  )

export const configureWhatsapp = (formData: FormData) =>
  axios.post<WhatsappConfigureResponse>(
    '/api/persona/configure-whatsapp',
    formData
  )
```

### Styling

Components use CSS modules or vanilla CSS:

```typescript
import './App.css'

// In JSX
<div className="app">
  <div className="chat-container">
    {/* ... */}
  </div>
</div>
```

### Performance Optimization

- Memoize child components to prevent unnecessary re-renders
- Use `useCallback` for event handlers
- Lazy load heavy components (Avatar) with `React.lazy()`
- Optimize API calls: debounce rapid messages

```typescript
const memoizedChatDisplay = React.memo(ChatDisplay)

const handleSendMessage = useCallback((msg: string) => {
  // ... handler code
}, [conversationId])
```

---

## Component Development Guidelines

### Adding a New Component

1. Create file: `src/NewComponent.tsx`
2. Define prop interfaces: `interface NewComponentProps { ... }`
3. Export component: `export const NewComponent = (props) => { ... }`
4. Import in App: `import { NewComponent } from './NewComponent'`
5. Add to component hierarchy
6. Add unit tests (optional)

### Best Practices

- Keep components focused on single responsibility
- Use props for configuration, not global state (for most components)
- Document props with JSDoc comments
- Use TypeScript for type safety
- Handle loading and error states
- Make components responsive

```typescript
/**
 * Displays a chat message bubble
 * @param role - 'user' or 'assistant'
 * @param content - Message text
 * @param cite_items - Optional grounding information
 */
export const MessageBubble = ({ role, content, cite_items }: MessageBubbleProps) => {
  return (
    <div className={`bubble bubble-${role}`}>
      <p>{content}</p>
      {cite_items && <Citations items={cite_items} />}
    </div>
  )
}
```

---

## Next Steps

- **[Setup Guide](SETUP.md)** — Run the app locally
- **[Architecture](ARCHITECTURE.md)** — Understand system design
- **[API Reference](API.md)** — Integration with backend
