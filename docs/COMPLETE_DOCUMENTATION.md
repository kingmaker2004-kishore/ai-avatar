# AI Avatar - Complete Creator Documentation

**Version**: 1.0  
**Date**: April 2026  
**Status**: Complete

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Developer Setup](#developer-setup)
3. [System Architecture](#system-architecture)
4. [Backend API Reference](#backend-api-reference)
5. [Frontend Components](#frontend-components)
6. [User Guide](#user-guide)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Contributing Guidelines](#contributing-guidelines)

---

# Project Overview

## What is AI Avatar?

AI Avatar is a full-stack application that creates personalized AI chatbots based on real WhatsApp chat history. Upload a chat export, select a participant, and chat with an AI trained to mimic their communication style, personality, and knowledge.

### Key Features

- 📱 **Create Personas from Chat Exports** — Upload WhatsApp conversations and select who to mimic
- 💬 **Multi-Turn Conversations** — Continuous chat with context-aware responses
- 🎬 **Animated Avatars** — Optional 3D character or HeyGen animated avatar speaking responses
- 📚 **Grounded Responses** — AI cites what it "remembers" from conversation history
- 🔄 **Multiple Personas** — Create avatars of different people from the same or different chats
- 🛡️ **Privacy-Focused** — Chat data only stays on your device during setup

### Technology Stack

**Frontend**:
- React 18+ (UI framework)
- TypeScript (type safety)
- Vite (build tool & dev server)
- Three.js (3D graphics, optional)
- HeyGen SDK (animated avatars, optional)

**Backend**:
- Node.js + Express (web server)
- SQLite (local database)
- Groq API (LLM for responses)
- Axios (HTTP client)

### Project Structure

```
ai-avatar/
├── src/                 (React components, TypeScript)
│   ├── App.tsx
│   ├── PersonaSetup.tsx
│   ├── LiveAvatar.tsx
│   ├── Avatar.tsx
│   └── api.ts
├── backend/             (Express API server)
│   ├── server.js
│   ├── personaEngine.js
│   ├── whatsappPersona.js
│   ├── db/
│   │   ├── index.js
│   │   └── schema.sql
│   ├── data/
│   │   └── persona-profile.json
│   └── package.json
├── public/              (Static assets, models, animations)
├── docs/                (Documentation files)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

# Developer Setup

## Prerequisites

### System Requirements

- **Node.js**: v16+ (recommended: v18 or v20)
- **npm**: v8+ (comes with Node.js)
- **Git**: For cloning and version control
- **RAM**: 4GB minimum
- **Disk Space**: 2GB for node_modules
- **Windows/Mac/Linux**: Any OS supported

### Verify Installation

```bash
node --version   # Should output v16+
npm --version    # Should output v8+
```

## Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/kingmaker2004-kishore/ai-avatar.git
cd ai-avatar
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

This installs React, TypeScript, Vite, Three.js, HeyGen SDK, and other dependencies.

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

This installs Express, SQLite, Axios, CORS, and other backend packages.

### Step 4: Create Backend .env File

```bash
cd backend
cp .env.example .env
```

Then edit `backend/.env` and add your API keys:

```env
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
LIVEAVATAR_API_KEY=your_liveavatar_api_key
LIVEAVATAR_AVATAR_ID=your_avatar_id
LIVEAVATAR_VOICE_ID=your_voice_id
SESSION_SECRET=dev_secret_change_in_production
GROQ_MODEL=llama-3.3-70b-versatile
PERSONA_HISTORY_TURNS=6
PERSONA_MAX_CONTEXT_ITEMS=6
PERSONA_SHARED_CONVERSATIONS=3
DATABASE_PATH=ai.db
```

### Step 5: Initialize Database

```bash
cd backend
node db/index.js
cd ..
```

## Running Locally

### Start Frontend (Vite Dev Server)

```bash
npm run dev
# Opens at http://localhost:5173
```

### Start Backend (Express API)

In a separate terminal:

```bash
cd backend
npm start
# API running at http://localhost:5000
```

## Getting API Keys

### Groq API Key (Required)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / Log in
3. Navigate to **API Keys** section
4. Click "Create API Key"
5. Copy the key and paste into `backend/.env`

**Available Models**:
- `llama-3.3-70b-versatile` (default, recommended)
- `mixtral-8x7b-32768`
- `gemma-7b-it`

### HeyGen LiveAvatar API Key (Optional)

1. Go to [heygen.com](https://www.heygen.com/)
2. Sign up / Log in
3. Navigate to **API Keys** in account settings
4. Create new API key and avatar ID
5. Add to `backend/.env`

## Commands

### Frontend Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linter (if configured)
```

### Backend Commands

```bash
cd backend
npm start        # Start Express server
npm test         # Run tests (if configured)
```

## Troubleshooting Setup

### "Cannot find module 'express'"

```bash
cd backend
npm install
npm start
```

### "Port 5000 already in use"

```bash
# Find what's using the port (Windows)
netstat -ano | findstr :5000

# Use different port
PORT=5001 npm start
```

### "GROQ_API_KEY not found"

1. Verify `backend/.env` file exists
2. Check it contains `GROQ_API_KEY=<actual_key>`
3. Restart backend

---

# System Architecture

## Architecture Overview

```
BROWSER (Client)
    │ HTTP/REST
    ▼
FRONTEND (React SPA - localhost:5173)
    │ Vite Proxy (/api → localhost:5000)
    ▼
BACKEND (Express - localhost:5000)
    │
    ├─► Groq API (LLM)
    ├─► HeyGen API (Avatar animation)
    └─► SQLite Database (ai.db)
```

## Frontend Architecture

### Component Hierarchy

```
App (Root)
├── PersonaSetup (Conditional)
│   ├── FileInput
│   └── ParticipantSelector
├── ChatInterface (Main)
│   ├── ConversationHistory
│   ├── MessageInput
│   └── ResponseDisplay
├── LiveAvatar (Optional)
│   ├── HeyGen SDK
│   └── VideoPlayer
└── Avatar (Optional 3D)
    ├── Three.js Scene
    └── CharacterModel
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **App** | src/App.tsx | Main container, state management |
| **PersonaSetup** | src/PersonaSetup.tsx | Upload WhatsApp, select participant |
| **LiveAvatar** | src/LiveAvatar.tsx | HeyGen avatar integration |
| **Avatar** | src/Avatar.tsx | 3D character model |
| **API Client** | src/api.ts | Type-safe HTTP requests |

## Backend Architecture

### Express Routes

```
GET /health                              (Health check)
POST /api/personas/bootstrap             (Load persona)
GET /api/personas/:personaId             (Get persona)
POST /api/persona/preview-whatsapp      (Preview participants)
POST /api/persona/configure-whatsapp    (Create persona from WhatsApp)
GET /api/conversations/:conversationId  (Get chat history)
POST /api/chat                           (Send message, get response)
```

### Key Services

#### personaEngine.js

Core logic for generating responses:

```javascript
buildSystemPrompt()      // Construct LLM prompt
generateResponse()       // Call Groq API
postProcessReply()       // Clean up response
retrieveContext()        // Get related knowledge
```

#### whatsappPersona.js

Parse WhatsApp exports:

```javascript
parseWhatsappExport()    // Parse .txt file
extractParticipants()    // Get unique senders
analyzePersonaFromChat() // Build persona profile
```

#### db/index.js

Database operations:

```javascript
getConversation()        // Fetch message history
saveMessage()            // Store message
getUserProfile()         // Get user preferences
initializeDatabase()     // Create tables
```

## Data Flow

### Persona Creation Flow

```
User uploads WhatsApp .txt
    ↓
POST /api/persona/preview-whatsapp
    ↓
whatsappPersona.parseWhatsappExport()
    ↓
Return list of participants
    ↓
User selects participant
    ↓
POST /api/persona/configure-whatsapp
    ↓
whatsappPersona.analyzePersonaFromChat()
    ↓
personaEngine builds persona profile
    ↓
Save to database
    ↓
Ready for chat
```

### Chat Flow

```
User message
    ↓
POST /api/chat
    ↓
1. Retrieve context
   - Message history (6 turns default)
   - Persona profile
   - Shared conversation memories (3 conversations)
    ↓
2. Build system prompt
   - persona + context + history
    ↓
3. Generate response
   - Try deterministic rules
   - Try heuristics
   - Call Groq LLM (if above fail)
    ↓
4. Post-process
   - Clean up response
   - Extract cite items
    ↓
5. Save to database
   - User message
   - Assistant response
   - Grounding data
    ↓
Return response + cite_items
    ↓
Frontend displays + optionally animates with HeyGen
```

## Database Schema

### Tables

```sql
-- User profiles
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY,
  user_id TEXT UNIQUE,
  created_at TIMESTAMP,
  current_persona_id TEXT
)

-- Conversations
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  conversation_id TEXT UNIQUE,
  user_id TEXT,
  persona_id TEXT,
  persona_profile JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Messages
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  conversation_id TEXT,
  message_number INTEGER,
  role TEXT,           -- 'user' or 'assistant'
  content TEXT,
  cite_items JSON,
  created_at TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
)
```

---

# Backend API Reference

## Base Configuration

**Base URL**: `http://localhost:5000` (development)

**Headers**: All requests should have `Content-Type: application/json`

## Endpoints

### GET /health

Health check endpoint.

**Request**:
```http
GET /health
```

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-04-15T10:30:00Z"
}
```

### POST /api/personas/bootstrap

Initialize or load a persona profile.

**Request**:
```http
POST /api/personas/bootstrap
Content-Type: application/json

{
  "personaProfilePath": "data/persona-profile.json"
}
```

**Response** (200):
```json
{
  "personaId": "default-persona",
  "personaProfile": {
    "name": "Maya",
    "role": "AI Assistant",
    "description": "A helpful AI assistant",
    "speaking_style": "friendly, conversational",
    "interests": ["technology", "creative writing"],
    "communication_style": "warm, encouraging",
    "knowledge_base": ["...", "..."],
    "shared_experiences": []
  }
}
```

### GET /api/personas/:personaId

Retrieve a specific persona.

**Request**:
```http
GET /api/personas/default-persona
```

**Response** (200):
```json
{
  "personaId": "default-persona",
  "personaProfile": { ... }
}
```

### POST /api/persona/preview-whatsapp

Preview WhatsApp chat participants before selecting.

**Request**:
```http
POST /api/persona/preview-whatsapp
Content-Type: multipart/form-data

file: [WhatsApp .txt export]
```

**Response** (200):
```json
{
  "participants": [
    {
      "name": "Alice",
      "messageCount": 245,
      "sampleMessages": ["How are you?", "That's cool"]
    },
    {
      "name": "Bob",
      "messageCount": 198,
      "sampleMessages": ["Great!", "Awesome"]
    }
  ],
  "totalMessages": 443,
  "dateRange": {
    "start": "2024-01-01",
    "end": "2026-04-15"
  }
}
```

### POST /api/persona/configure-whatsapp

Create persona from WhatsApp export.

**Request**:
```http
POST /api/persona/configure-whatsapp
Content-Type: multipart/form-data

file: [WhatsApp .txt export]
selectedParticipant: "Alice"
```

**Response** (200):
```json
{
  "personaId": "whatsapp-alice-2026",
  "personaProfile": {
    "name": "Alice",
    "role": "Friend",
    "description": "Alice is friendly and tech-savvy",
    "speaking_style": "casual, friendly, uses emojis",
    "interests": ["technology", "design", "music"],
    "communication_style": "warm, encouraging",
    "knowledge_base": ["Graduated from design school", "Works in UX/UI"],
    "shared_experiences": ["Met at work", "Worked on projects together"]
  },
  "messageAnalysis": {
    "messageCount": 245,
    "averageMessageLength": 35,
    "frequentEmojis": ["😀", "😍", "🎉"],
    "topicsMentioned": ["work", "projects", "coffee"]
  }
}
```

### GET /api/conversations/:conversationId

Retrieve conversation history.

**Request**:
```http
GET /api/conversations/conv-12345?limit=20
```

**Response** (200):
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
      "content": "I'm doing great! How can I help?",
      "cite_items": [
        {
          "type": "memory",
          "text": "You recently asked about...",
          "source": "previous conversation"
        }
      ],
      "timestamp": "2026-04-15T10:00:05Z"
    }
  ],
  "totalMessages": 2
}
```

### POST /api/chat

Send a message and get AI response.

**Request**:
```http
POST /api/chat
Content-Type: application/json

{
  "conversationId": "conv-12345",
  "userMessage": "What's your favorite programming language?"
}
```

**Response** (200):
```json
{
  "conversationId": "conv-12345",
  "userMessage": "What's your favorite programming language?",
  "response": "I love Python and TypeScript! Python for data science, TypeScript for web projects.",
  "cite_items": [
    {
      "type": "conversation",
      "text": "We previously discussed programming languages",
      "source": "previous conversation",
      "date": "2026-04-10T15:30:00Z"
    }
  ],
  "messageId": "msg-789",
  "timestamp": "2026-04-15T10:05:00Z"
}
```

## Error Handling

### Standard Error Response

```json
{
  "error": "Error title",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "2026-04-15T10:30:00Z"
}
```

### Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Response returned |
| 400 | Bad Request | Missing required field |
| 404 | Not Found | Persona doesn't exist |
| 413 | Payload Too Large | File exceeds size limit |
| 500 | Server Error | Database error |
| 503 | Unavailable | Groq API down |

---

# Frontend Components

## App Component

**File**: src/App.tsx

Main application container managing global state.

### Responsibilities

- Manage conversation state
- Handle persona setup vs chat display
- Coordinate API calls
- Manage conversation flow

### State Variables

```typescript
interface AppState {
  personaProfile: PersonaProfile | null
  conversationId: string | null
  messages: Message[]
  avatarEnabled: boolean
  isLoading: boolean
  setupStep: 'upload' | 'select' | 'ready'
}
```

### Key Functions

```typescript
// Initialize app on mount
useEffect(() => {
  const { personaProfile } = await api.bootstrap()
  setPersonaProfile(personaProfile)
  generateConversationId()
}, [])

// Handle persona setup
const handlePersonaSetupComplete = (profile: PersonaProfile) => {
  setPersonaProfile(profile)
  setSetupStep('ready')
  setMessages([])
}

// Send message and get response
const handleSendMessage = async (userMessage: string) => {
  setIsLoading(true)
  
  // Add user message to state
  setMessages(prev => [...prev, {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  }])
  
  try {
    // Call backend
    const response = await api.sendMessage(conversationId, userMessage)
    
    // Add AI response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: response.response,
      cite_items: response.cite_items,
      timestamp: response.timestamp
    }])
    
    // Trigger avatar animation
    if (avatarEnabled && liveAvatarRef.current) {
      await liveAvatarRef.current.playResponse(response.response)
    }
  } catch (error) {
    console.error('Error:', error)
  }
  
  setIsLoading(false)
}
```

## PersonaSetup Component

**File**: src/PersonaSetup.tsx

Handles WhatsApp upload and participant selection.

### Props

```typescript
interface PersonaSetupProps {
  onComplete: (personaProfile: PersonaProfile) => void
  defaultPersonaProfile?: PersonaProfile
}
```

### Key Functions

```typescript
// Upload WhatsApp file
const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  
  if (!file?.name.endsWith('.txt')) {
    alert('Please select a .txt file')
    return
  }
  
  // Preview participants
  const formData = new FormData()
  formData.append('file', file)
  
  const preview = await api.previewWhatsapp(formData)
  setParticipants(preview.participants)
  setStep('select')
}

// Select participant and create persona
const handleParticipantSelect = async (participantName: string) => {
  const formData = new FormData()
  formData.append('file', whatsappFile)
  formData.append('selectedParticipant', participantName)
  
  const result = await api.configureWhatsapp(formData)
  onComplete(result.personaProfile)
}
```

## LiveAvatar Component

**File**: src/LiveAvatar.tsx

HeyGen avatar integration for animated responses.

### Props

```typescript
interface LiveAvatarProps {
  personaProfile: PersonaProfile
  isVisible?: boolean
}
```

### Key Functions

```typescript
// Initialize HeyGen SDK
useEffect(() => {
  const session = new HeyGenAvatarSession({
    apiKey: process.env.VITE_LIVEAVATAR_API_KEY,
    avatarName: personaProfile.avatarId
  })
  
  await session.startSession()
  setSession(session)
  setIsSessionReady(true)
}, [])

// Play response with avatar
const playResponse = async (text: string) => {
  if (!session) return
  
  const videoData = await session.generateVideo(text, {
    personaId: personaProfile.avatarId,
    voiceId: personaProfile.voiceId,
    language: 'en'
  })
  
  const videoElement = videoRef.current
  videoElement.src = videoData.url
  await videoElement.play()
}
```

## Avatar Component

**File**: src/Avatar.tsx

3D character using Three.js.

### Props

```typescript
interface AvatarProps {
  personaProfile: PersonaProfile
  scale?: number
  animationSpeed?: number
}
```

### Features

- 3D character model rendering
- Mixamo animation support
- Camera and lighting control
- Interactive animations

---

# User Guide

## Creating Your First Persona

### Step 1: Export WhatsApp Chat

**iPhone**:
1. Open WhatsApp chat
2. Tap contact name at top
3. Scroll down → "Export Chat"
4. Choose "Without Media"
5. Save .txt file

**Android**:
1. Open WhatsApp chat
2. Tap menu (three dots)
3. Select "More" → "Export Chat"
4. Choose "Without Media"
5. Save .txt file

### Step 2: Upload to AI Avatar

1. Open AI Avatar in browser
2. Click "Choose File" or drag-and-drop .txt
3. Wait for file to upload

### Step 3: Select Participant

1. App shows all participants with:
   - Name
   - Message count
   - Speaking style sample
2. Click on the person you want to chat with

### Step 4: Start Chatting

1. Chat interface loads
2. Type your message
3. Press Enter or click Send
4. AI responds as that person

## Having Conversations

### Understanding Responses

Responses come from:

1. **Message History** — What was discussed before
2. **Learned Patterns** — How the person typically talks
3. **Context Items** — Related knowledge from the chat
4. **LLM Generation** — Groq API for creative responses

### Response Quality

**Good responses** have:
- ✅ Specific personal context
- ✅ Clear conversation history
- ✅ Consistent speaking style
- ✅ Longer chat export (500+ messages)

**Lower quality** when:
- ❌ Short chat export (< 50 messages)
- ❌ Generic/vague messages
- ❌ New topics not in history
- ❌ Sarcasm/context-dependent humor

### Cite Items

Each response includes what the persona is referencing:

```
Response: "I love working on design, like we did on that project"

Cite Item: 
Type: Shared experience
Text: "We worked on a UI redesign project together"
Source: Previous conversation, Jan 15, 2024
```

## Using Animated Avatar

### Enable Avatar

1. In settings, enable "Show Animated Avatar"
2. App loads HeyGen avatar
3. When persona responds, see animated character speaking

### Avatar Features

- Speech animation (mouth moves with text)
- Expressions and gestures
- Volume control
- Lip-sync with response

### Disable Avatar

If slow or having issues:

1. Go to settings
2. Toggle "Show Animated Avatar" off
3. Use text responses only

## Tips for Better Results

1. **Use longer chat exports** (500+ messages)
2. **Be specific in questions** ("Remember when we...?")
3. **Ask about shared experiences** (persona remembers these)
4. **Use animated avatar** (more engaging)
5. **Create multiple personas** (compare different people)
6. **Refine over time** (add more chat history if needed)

## FAQ

**Q: Is my chat data saved?**  
A: Chat is analyzed on upload to create persona. Original file isn't stored permanently.

**Q: Can I chat with multiple people from one group?**  
A: Yes! Upload same export multiple times, select different people each time.

**Q: Does persona learn from chats?**  
A: Currently no. Persona is static based on original export.

**Q: What if responses don't sound like the person?**  
A: Try longer chat export (500+ messages), ask about shared memories, be specific.

**Q: Can I use commercially?**  
A: Check terms of service. Personal and educational use is generally OK.

---

# Production Deployment

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] .env NOT committed to git
- [ ] Frontend built: `npm run build`
- [ ] Backend starts without errors
- [ ] All API endpoints tested
- [ ] Database initialized and backed up
- [ ] API keys valid and not rate-limited
- [ ] HTTPS enabled with valid certificate
- [ ] Session secret rotated (not development default)
- [ ] CORS configured correctly
- [ ] Reverse proxy configured
- [ ] Logging configured
- [ ] Backups automated

## Production Server Setup

### System Requirements

- **OS**: Linux (Ubuntu 20.04+) or Windows Server
- **Node.js**: v16+ (v18+ recommended)
- **npm**: v8+
- **RAM**: 4GB+
- **Disk**: 20GB+
- **Network**: 25+ Mbps

### Install Node.js (Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Frontend Build

```bash
npm run build
# Creates optimized files in dist/
```

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-*.js
│   ├── vendor-*.js
│   └── style-*.css
└── models/
```

## Backend Deployment

### Option 1: Direct Node.js

```bash
cd backend
npm install --production
npm start
```

### Option 2: PM2 (Recommended)

```bash
npm install -g pm2
pm2 start npm --name "ai-avatar-backend" -- start
pm2 startup
pm2 save
pm2 logs ai-avatar-backend
```

### Option 3: systemd Service

**File**: /etc/systemd/system/ai-avatar-backend.service

```ini
[Unit]
Description=AI Avatar Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai-avatar/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5s

Environment="NODE_ENV=production"
EnvironmentFile=/var/www/ai-avatar/backend/.env

[Install]
WantedBy=multi-user.target
```

Setup:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-avatar-backend
sudo systemctl start ai-avatar-backend
sudo systemctl status ai-avatar-backend
```

## Database Setup

### Initialize Production Database

```bash
mkdir -p /var/lib/ai-avatar
sudo chown www-data:www-data /var/lib/ai-avatar
```

Set in backend/.env:

```env
DATABASE_PATH=/var/lib/ai-avatar/ai.db
```

### Backup Database

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ai-avatar"
DB_PATH="/var/lib/ai-avatar/ai.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/ai_db_$DATE.db
gzip $BACKUP_DIR/ai_db_$DATE.db

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

Add to crontab:

```bash
0 2 * * * /usr/local/bin/backup-ai-avatar.sh
```

## Reverse Proxy Setup (nginx)

**File**: /etc/nginx/sites-available/ai-avatar

```nginx
# HTTP to HTTPS redirect
server {
  listen 80;
  listen [::]:80;
  server_name ai-avatar.example.com;
  return 301 https://ai-avatar.example.com$request_uri;
}

# HTTPS server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ai-avatar.example.com;

  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/ai-avatar.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ai-avatar.example.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;

  # Serve frontend
  root /var/www/ai-avatar/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;  # React SPA routing
  }

  # API proxy
  location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }

  # Deny hidden files
  location ~ /\. {
    deny all;
  }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/ai-avatar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/TLS Certificate

### Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d ai-avatar.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Environment Variables

**backend/.env** (Production):

```env
NODE_ENV=production
PORT=5000
GROQ_API_KEY=your_production_key
LIVEAVATAR_API_KEY=your_production_key
SESSION_SECRET=<random_secure_secret>
DATABASE_PATH=/var/lib/ai-avatar/ai.db
GROQ_MODEL=llama-3.3-70b-versatile
```

Generate secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Monitoring

### Check Backend Status

```bash
# If using systemd
systemctl status ai-avatar-backend
journalctl -u ai-avatar-backend -f

# If using pm2
pm2 logs ai-avatar-backend
pm2 monit
```

### Health Check

```bash
curl https://ai-avatar.example.com/health
```

---

# Troubleshooting

## Frontend Issues

### App Won't Load (Blank Page)

**Solutions**:

1. **Check Vite is running**:
   ```bash
   npm run dev
   ```

2. **Check browser console** (F12 → Console):
   - Look for red error messages

3. **Clear cache**:
   - Ctrl+Shift+Delete
   - Refresh page

4. **Rebuild**:
   ```bash
   npm install
   npm run dev
   ```

### API Calls Failing (404, 500)

**Solutions**:

1. **Verify backend is running**:
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check Vite proxy** in `vite.config.ts`:
   ```typescript
   proxy: {
     '/api': 'http://localhost:5000'
   }
   ```

3. **Check backend CORS** in `backend/server.js`

## Backend Issues

### Backend Won't Start

**Check**:

```bash
# Dependencies installed?
cd backend
npm list express better-sqlite3

# Port available?
netstat -ano | findstr :5000

# Environment variables?
cat .env | grep GROQ_API_KEY
```

### "GROQ_API_KEY not found"

**Solutions**:

1. Create/edit `backend/.env`
2. Add `GROQ_API_KEY=gsk_...` (starts with gsk_)
3. Restart backend

### Port Already in Use

```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or use different port
PORT=5001 npm start
```

## Chat Issues

### Chat Returns Empty Response

**Check**:

1. Browser console (F12 → Network)
2. Look for `/api/chat` error
3. Verify API key is valid
4. Try again (API might be throttled)

### Chat Very Slow (10+ seconds)

**Normal**: 1-3 seconds per response

**If slower**:

1. First request is slow (model initialization)
2. Reduce context in `backend/.env`:
   ```env
   PERSONA_HISTORY_TURNS=3
   ```
3. Check internet speed
4. Check Groq API status

### WhatsApp Upload Fails

**Check**:

1. File is .txt format
2. File size < 50MB
3. File is WhatsApp export format
4. Try different browser

## Database Issues

### "Database Locked"

```bash
cd backend
npm stop

# Remove lock files
rm ai.db-wal ai.db-shm

# Restart
npm start
```

### "Cannot Insert Message"

**Solutions**:

1. Check backend logs
2. Verify database permissions:
   ```bash
   chmod 644 backend/ai.db
   ```
3. Recreate database:
   ```bash
   rm backend/ai.db
   npm start
   ```

## Avatar Issues

### Avatar Not Showing

**Solutions**:

1. Check HeyGen API key in `backend/.env`
2. Check browser console for SDK errors
3. Try Chrome (best supported)
4. Disable avatar in settings (chat still works)

### Avatar Video Not Playing

**Check**:

1. Browser console (F12 → Console)
2. Network tab for video request
3. Disable and re-enable avatar

## GitHub Push Protection

**Issue**: "Push cannot contain secrets"

**Solution**: The .env.example file contains placeholder text (not real secrets).

**To Allow**:

1. Go to URL GitHub provided
2. Review the secret (it's a placeholder)
3. Click "Allow" to unblock

**Prevent**: Ensure .env (with real keys) is in .gitignore

---

# Contributing Guidelines

## Getting Started

### Fork & Clone

```bash
# Fork on GitHub
git clone https://github.com/YOUR_USERNAME/ai-avatar.git
cd ai-avatar

# Add upstream
git remote add upstream https://github.com/kingmaker2004-kishore/ai-avatar.git
```

### Setup Development

```bash
npm install
cd backend && npm install && cd ..

cp backend/.env.example backend/.env
# Add API keys to backend/.env

npm run dev      # Terminal 1
cd backend && npm start  # Terminal 2
```

## Code Style

### TypeScript / JavaScript

```typescript
// ✅ Good
const userName: string = "Alice"
const MAX_RETRIES = 3

function getUserProfile(userId: string): UserProfile {
  // Implementation
}

// ❌ Bad
const user_name = "Alice"
const maxRetries = 3

function get_user_profile(user_id) {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good
interface MessageProps {
  role: 'user' | 'assistant'
  content: string
}

export const Message: React.FC<MessageProps> = ({ role, content }) => {
  return <div className={`message message-${role}`}>{content}</div>
}

// ❌ Bad
export const Message = ({ role, content }) => {
  return <div>{content}</div>
}
```

### Backend Code

```javascript
// ✅ Good
async function sendMessage(conversationId, userMessage) {
  try {
    if (!conversationId || !userMessage) {
      throw new Error('Missing required fields')
    }
    
    const response = await generateResponse(userMessage)
    await database.saveMessage(conversationId, response)
    return response
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}
```

## Development Workflow

### Create Feature Branch

```bash
git checkout main
git pull upstream main

# New feature
git checkout -b feat/feature-name

# Bug fix
git checkout -b fix/bug-name

# Documentation
git checkout -b docs/page-name
```

### Commit with Clear Messages

```bash
git add .
git commit -m "feat: Add chat message counter"
git commit -m "fix: Resolve CORS error"
git commit -m "docs: Update API documentation"
```

**Format**: `<type>: <subject>`

### Push and Create PR

```bash
git push origin feat/feature-name
```

Create PR on GitHub with:

- Clear title and description
- Reference issue: `Closes #42`
- Explain what and why

## Testing

### Manual Testing

1. Test in dev environment
2. Test edge cases
3. Test different browsers
4. Test mobile view
5. Check browser console

### Automated Tests

Add tests for complex logic:

```typescript
import { render, screen } from '@testing-library/react'
import { NewFeature } from '../NewFeature'

describe('NewFeature', () => {
  it('renders input and button', () => {
    render(<NewFeature onSave={jest.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

## Documentation

### Update Docs When

- Adding/changing features
- Fixing bugs
- Changing APIs
- Improving features

### Document Format

```markdown
### New Feature Name

Brief description.

#### Key Features

- Feature 1
- Feature 2

#### Usage

\`\`\`typescript
// Code example
\`\`\`

#### Props

| Name | Type | Required | Description |
|------|------|----------|-------------|
| prop1 | string | Yes | What it does |
```

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn
- Follow project guidelines

## Questions?

- Check relevant documentation
- Open an issue on GitHub
- Ask in PR comments

---

## Support & Resources

### Documentation
- [Project Repository](https://github.com/kingmaker2004-kishore/ai-avatar)
- [Groq API Docs](https://groq.com/)
- [HeyGen Docs](https://www.heygen.com/)
- [React Docs](https://react.dev/)
- [Express Docs](https://expressjs.com/)

### Get Help
- GitHub Issues
- Documentation
- Troubleshooting Guide

---

**Last Updated**: April 2026  
**Version**: 1.0  
**License**: [Your License]

