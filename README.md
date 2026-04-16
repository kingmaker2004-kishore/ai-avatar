# AI Avatar 🤖

Create personalized conversational AI avatars from WhatsApp chat exports. Chat with an AI trained on real messages to mimic someone's communication style, personality, and knowledge.

## ✨ Features

- 📱 **Create Personas from Chat Exports** — Upload WhatsApp conversations and select who to mimic
- 💬 **Multi-Turn Conversations** — Continuous chat with context-aware responses
- 🎬 **Animated Avatars** — Optional 3D character or HeyGen animated avatar speaking responses
- 📚 **Grounded Responses** — AI cites what it "remembers" from conversation history
- 🔄 **Multiple Personas** — Create avatars of different people from the same or different chats
- 🛡️ **Privacy-Focused** — Chat data only stays on your device during setup; persona is extracted and stored

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ ([Download](https://nodejs.org/))
- npm v8+ (comes with Node.js)
- Groq API key ([Get free key](https://console.groq.com/)) for LLM responses
- WhatsApp chat export (`.txt` format)

### Installation

```bash
# Clone repository
git clone https://github.com/kingmaker2004-kishore/ai-avatar.git
cd ai-avatar

# Install dependencies
npm install
cd backend && npm install && cd ..

# Create backend environment file
cp backend/.env.example backend/.env

# Add your Groq API key to backend/.env
# GROQ_API_KEY=your_key_here
```

### Run Locally

**Terminal 1 — Frontend** (Vite dev server):
```bash
npm run dev
# Visit http://localhost:5173
```

**Terminal 2 — Backend** (Express API):
```bash
cd backend
npm start
# API running on http://localhost:5000
```

### Create Your First Avatar

1. **Export a WhatsApp Chat**:
   - iPhone: Chat → Contact name → Export Chat → Without Media
   - Android: Chat → Menu → More → Export Chat → Without Media

2. **Upload and Select**:
   - In the app, click "Choose File" and select your .txt export
   - The app shows all participants
   - Click on the person you want to chat with

3. **Start Chatting**:
   - Type a message
   - AI responds as that person
   - Continue the conversation

## 📚 Documentation

Comprehensive guides for everyone:

### For Everyone
- **[Project Overview](README.md)** (this file) — What AI Avatar does

### For Users
- **[User Guide](docs/USER_GUIDE.md)** — How to create avatars, chat, use animated features

### For Developers
- **[Setup Guide](docs/SETUP.md)** — Install and run locally for development
- **[Architecture](docs/ARCHITECTURE.md)** — System design, component relationships, data flow
- **[Frontend Components](docs/COMPONENTS.md)** — React component documentation
- **[API Reference](docs/API.md)** — Backend endpoints with examples
- **[Contributing](docs/CONTRIBUTING.md)** — Code style, workflow, adding features

### For DevOps / Deployment
- **[Deployment Guide](docs/DEPLOYMENT.md)** — Production setup, database, security
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** — Common issues and solutions

**[→ Full Documentation Index](docs/README.md)**

## 🏗️ Technology Stack

### Frontend
- **React 18** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool & dev server
- **Three.js** — 3D graphics (optional)
- **HeyGen SDK** — Animated avatars (optional)

### Backend
- **Node.js + Express** — Web server
- **SQLite** — Local database
- **Groq API** — LLM for responses
- **Axios** — HTTP client

## 📋 Project Structure

```
ai-avatar/
├── src/                 (React components, TypeScript)
│   ├── App.tsx         (Main component)
│   ├── PersonaSetup.tsx
│   ├── LiveAvatar.tsx
│   └── ...
├── backend/            (Express API server)
│   ├── server.js
│   ├── personaEngine.js
│   ├── whatsappPersona.js
│   ├── db/             (Database layer)
│   └── package.json
├── public/             (Static assets, models, animations)
├── docs/               (Complete documentation)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🔄 How It Works

### Persona Creation

```
WhatsApp Export (.txt)
    ↓
[Parse chat, extract participant messages]
    ↓
[Analyze speaking style, interests, patterns]
    ↓
Persona Profile Created
    ↓
Ready to chat!
```

### Chat Flow

```
User Message
    ↓
[Retrieve context: history, persona, memories]
    ↓
[Build system prompt with persona profile]
    ↓
[Generate response via Groq LLM]
    ↓
AI Response
    ↓
[Optional: Animate with HeyGen avatar]
    ↓
Display in Chat Interface
```

## 🛠️ Commands

### Frontend

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linter
```

### Backend

```bash
cd backend
npm start        # Start Express server (localhost:5000)
npm test         # Run tests (if configured)
```

## 🔐 API Keys

### Required: Groq API

For AI conversations:

1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up / Log in
3. Create API key
4. Add to `backend/.env`: `GROQ_API_KEY=gsk_...`

### Optional: HeyGen LiveAvatar

For animated avatar responses:

1. Go to [heygen.com](https://www.heygen.com/)
2. Sign up / Log in
3. Get API key and avatar ID
4. Add to `backend/.env`:
   ```env
   LIVEAVATAR_API_KEY=...
   LIVEAVATAR_AVATAR_ID=...
   LIVEAVATAR_VOICE_ID=...
   ```

## 🌐 Deployment

For production deployment, see [Deployment Guide](docs/DEPLOYMENT.md):

- Linux server setup (Ubuntu)
- Build frontend for production
- Run backend with process manager
- Configure reverse proxy (nginx)
- SSL/HTTPS setup
- Database backups
- Secrets management

## 🐛 Troubleshooting

Common issues and solutions:

- **App won't load?** → See [Troubleshooting](docs/TROUBLESHOOTING.md)
- **API errors?** → Check [API Reference](docs/API.md)
- **Setup problems?** → Follow [Setup Guide](docs/SETUP.md)
- **Chat not working?** → See [Common Issues](docs/TROUBLESHOOTING.md#api--chat-issues)

## 📝 Examples

### Creating a Persona from Group Chat

```
Group: "Project Team"
Members: Alice, Bob, Charlie

[Export group chat to .txt]
[Upload in AI Avatar]
[Select: Alice]
[Answer questions as Alice would]
```

### Using with Professional Contacts

```
Export: Email conversation with mentor
Avatar: Mimics mentor's advice-giving style
Use: Get thoughts on career decisions
```

### Fun Exploration

```
Export: Old group chats with friends
Avatar: Chat with them in your favorite era
Use: Nostalgic conversations, remember old jokes
```

## ⚙️ Configuration

### Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Required
GROQ_API_KEY=your_groq_api_key

# Optional
LIVEAVATAR_API_KEY=your_liveavatar_key
LIVEAVATAR_AVATAR_ID=your_avatar_id
LIVEAVATAR_VOICE_ID=your_voice_id

# Defaults (customize if needed)
PORT=5000
GROQ_MODEL=llama-3.3-70b-versatile
PERSONA_HISTORY_TURNS=6
PERSONA_MAX_CONTEXT_ITEMS=6
```

## 🤝 Contributing

Contributions welcome! See [Contributing Guide](docs/CONTRIBUTING.md) for:

- Code style and standards
- Development workflow
- Creating features
- Submitting pull requests

## 📄 License

[Your License Here] — Update this section with appropriate license

## 🔗 Related Links

- **[Groq API Docs](https://groq.com/)** — LLM service
- **[HeyGen Docs](https://www.heygen.com/)** — Avatar animation
- **[React Docs](https://react.dev/)** — Frontend framework
- **[Express Docs](https://expressjs.com/)** — Backend framework

## ❓ FAQ

**Q: Is my chat data safe?**  
A: Your chat is only analyzed during upload to create the persona. The original file isn't stored permanently. See [User Guide FAQ](docs/USER_GUIDE.md#faq) for more.

**Q: Can I chat with multiple people from the same group?**  
A: Yes! Upload the same export multiple times and create personas for different participants.

**Q: Does the persona learn from conversations?**  
A: Currently no. The persona is static based on the original export. Future versions may support learning.

**Q: What if responses don't sound like the person?**  
A: Export longer chat history (500+ messages) for better accuracy. See [User Guide](docs/USER_GUIDE.md#what-if-the-persona-doesnt-sound-like-the-real-person).

**Q: Can I use this commercially?**  
A: Check the terms of service. Personal and educational use is generally OK. See [User Guide FAQ](docs/USER_GUIDE.md#faq).

## 🚀 Next Steps

1. **New to the project?** → Start with [Setup Guide](docs/SETUP.md)
2. **Want to understand how it works?** → Read [Architecture](docs/ARCHITECTURE.md)
3. **Ready to develop?** → See [Contributing Guide](docs/CONTRIBUTING.md)
4. **Deploying to production?** → Follow [Deployment Guide](docs/DEPLOYMENT.md)
5. **Having issues?** → Check [Troubleshooting](docs/TROUBLESHOOTING.md)

---

**[→ Full Documentation](docs/README.md)** | **[Report Issue](https://github.com/kingmaker2004-kishore/ai-avatar/issues)** | **[GitHub Repo](https://github.com/kingmaker2004-kishore/ai-avatar)**

Made with ❤️ by the AI Avatar community.
