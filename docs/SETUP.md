# Developer Setup Guide

Complete instructions for setting up the AI Avatar project locally for development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Frontend Setup](#frontend-setup)
4. [Backend Setup](#backend-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Port Configuration](#port-configuration)
8. [Verification Checklist](#verification-checklist)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: v16+ (recommended: v18 or v20)
- **npm**: v8+ (comes with Node.js)
- **Git**: For cloning and version control
- **RAM**: 4GB minimum
- **Disk Space**: 2GB for node_modules (frontend + backend)

### Optional Dependencies

- **GitHub SSH Key**: For git operations (or use HTTPS with personal access token)
- **Text Editor/IDE**: VS Code recommended, with extensions:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Vue Plugin (Volar)
  - SQLite viewer

### Verify Node.js Installation

```bash
node --version   # Should output v16+
npm --version    # Should output v8+
```

## Project Structure

```
ai-avatar/
├── frontend files      (package.json, tsconfig.json, vite.config.ts, index.html)
├── src/                (React components, TypeScript)
├── public/             (Static assets, models, animations)
├── backend/            (Node.js Express server)
│   ├── server.js       (Express app, routes)
│   ├── personaEngine.js
│   ├── whatsappPersona.js
│   ├── db/
│   │   ├── index.js
│   │   └── schema.sql
│   ├── data/           (Persona profiles)
│   └── package.json
└── docs/               (This documentation)
```

**Key Files**:
- `package.json` — Frontend dependencies & scripts
- `backend/package.json` — Backend dependencies & scripts
- `vite.config.ts` — Frontend build & dev server configuration
- `tsconfig.json` — TypeScript configuration

## Frontend Setup

### Step 1: Install Frontend Dependencies

Navigate to the project root and install dependencies:

```bash
cd d:\ai-avatar
npm install
```

This installs:
- React & React DOM
- TypeScript
- Vite (build tool)
- Three.js & React Three Fiber (3D graphics)
- HeyGen LiveAvatar SDK
- Other UI utilities

**Expected output**: "added XXX packages in Xs"

### Step 2: Verify Installation

Check that frontend dependencies are installed:

```bash
npm list react react-dom vite --depth=0
```

Should show version numbers for react, react-dom, and vite.

## Backend Setup

### Step 1: Install Backend Dependencies

Navigate to the backend folder:

```bash
cd backend
npm install
```

This installs:
- Express.js (web server)
- better-sqlite3 (database)
- axios (HTTP requests)
- cors (cross-origin support)
- Other utilities

**Expected output**: "added XXX packages in Xs"

### Step 2: Verify Installation

Check backend dependencies:

```bash
npm list express better-sqlite3 --depth=0
```

Should output version numbers for express and better-sqlite3.

### Step 3: Initialize Database

The database is initialized automatically when the backend first runs. However, you can manually initialize it:

```bash
node db/index.js
```

This creates `ai.db` (SQLite database) if it doesn't exist. You should see output confirming database creation.

**Note**: The schema is defined in `db/schema.sql` and automatically applied when needed.

---

## Environment Configuration

### Step 1: Create Backend .env File

Create a `.env` file in the `backend/` folder by copying the example:

```bash
cd backend
cp .env.example .env
```

Or in PowerShell:

```powershell
cd backend
Copy-Item .env.example -Destination .env
```

### Step 2: Configure Required API Keys

Edit `backend/.env` and replace placeholder values:

```env
# Required for LLM responses
GROQ_API_KEY=your_actual_groq_api_key_here

# Optional: For animated avatar (HeyGen)
LIVEAVATAR_API_KEY=your_liveavatar_api_key
LIVEAVATAR_AVATAR_ID=your_avatar_id
LIVEAVATAR_VOICE_ID=your_voice_id

# Change for production
SESSION_SECRET=dev_secret_change_in_production

# Keep defaults (or customize)
PORT=5000
GROQ_MODEL=llama-3.3-70b-versatile
PERSONA_HISTORY_TURNS=6
PERSONA_MAX_CONTEXT_ITEMS=6
```

### Step 3: Getting API Keys

#### Groq API Key (Required for Chat)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / Log in
3. Navigate to **API Keys** section
4. Click "Create API Key"
5. Copy the key and paste into `.env` as `GROQ_API_KEY`

**Models available**:
- `llama-3.3-70b-versatile` (default, recommended)
- `mixtral-8x7b-32768`
- `gemma-7b-it`

#### HeyGen LiveAvatar API Key (Optional for Animated Avatar)

1. Go to [heygen.com](https://www.heygen.com/)
2. Sign up / Log in
3. Navigate to **API Keys** in account settings
4. Create a new API key
5. List your avatars to get `LIVEAVATAR_AVATAR_ID` and voice IDs
6. Add to `.env`

#### Session Secret (Change for Production)

For development, the default value is fine. For production, generate a random string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `.env` as `SESSION_SECRET`.

### Step 4: Verify Configuration

Frontend setup typically doesn't require a `.env` file for local development (Vite proxies `/api` calls to the backend). However, you can optionally create `frontend/.env.local`:

```env
VITE_ENABLE_AVATAR=true
```

---

## Running the Application

### Option 1: Run Both Servers (Recommended for Development)

Open **two terminal windows**:

**Terminal 1 - Backend (Port 5000)**:

```bash
cd backend
npm start
```

Expected output:
```
Express server running on port 5000
Database initialized
```

**Terminal 2 - Frontend (Port 5173 by default)**:

```bash
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### Option 2: Run Only the Backend

If you want to test just the API:

```bash
cd backend
npm start
```

Test health check:

```bash
curl http://localhost:5000/health
```

Should return status 200.

## Port Configuration

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Express) | 5000 | http://localhost:5000 |
| Database | N/A (SQLite local file) | `backend/ai.db` |

### Custom Ports

#### Backend Port

Edit `backend/package.json` or the start script:

```bash
PORT=3000 npm start
```

Or edit `backend/.env`:

```env
PORT=3000
```

#### Frontend Port

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3173,
    proxy: {
      '/api': 'http://localhost:5000',
    }
  }
})
```

---

## Verification Checklist

After setup, verify everything works:

- [ ] Node.js v16+ installed (`node --version`)
- [ ] npm v8+ installed (`npm --version`)
- [ ] Frontend dependencies installed (`npm list react`)
- [ ] Backend dependencies installed (`cd backend && npm list express`)
- [ ] `.env` file created in `backend/` folder
- [ ] `GROQ_API_KEY` configured in `.env`
- [ ] Backend starts without errors (`cd backend && npm start`)
- [ ] Backend health check passes (`curl http://localhost:5000/health`)
- [ ] Frontend starts without errors (`npm run dev`)
- [ ] App loads in browser at `http://localhost:5173`
- [ ] Chat input field appears and is interactive
- [ ] Console shows no TypeScript errors

---

## Troubleshooting

### Issue: "npm: command not found"

**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/) (includes npm)

---

### Issue: "GROQ_API_KEY not found"

**Solution**:
1. Verify `.env` file exists in `backend/` folder
2. Check `.env` has `GROQ_API_KEY=<actual_key>`
3. Restart backend: `npm start`

---

### Issue: Backend won't start on port 5000

**Causes**:
- Port 5000 is already in use
- Permission denied

**Solutions**:
```bash
# Check what's using port 5000 (Windows)
netstat -ano | findstr :5000

# Or use a different port
PORT=5001 npm start
```

---

### Issue: "Module not found" or "Cannot find module"

**Solution**:
```bash
# In the folder with error (frontend or backend/)
npm install

# Or clean cache and reinstall
rm -r node_modules package-lock.json
npm install
```

---

### Issue: Vite dev server won't start on port 5173

**Solution**: Use a different port in `vite.config.ts` or set env var:

```bash
npm run dev -- --port 5174
```

---

### Issue: CORS errors when calling backend

**Cause**: Frontend and backend not both running, or CORS not configured

**Solution**:
1. Verify backend is running: `curl http://localhost:5000/health`
2. Check `vite.config.ts` has `/api` proxy to backend
3. Verify backend has `cors` middleware enabled in server.js

---

### Issue: Database errors or schema not initialized

**Solution**:
```bash
cd backend
# Check database exists
ls ai.db

# Manually initialize database
node db/index.js

# Check schema
sqlite3 ai.db ".schema"
```

---

### Issue: TypeScript errors in IDE

**Solution**:
1. Verify `tsconfig.json` exists in project root
2. Reload VS Code: Ctrl+Shift+P → "Developer: Reload Window"
3. Check TypeScript version: `npm list typescript`

---

## Next Steps

After successful setup:

1. **Understand the Architecture** — Read [ARCHITECTURE.md](ARCHITECTURE.md)
2. **Explore Components** — Read [COMPONENTS.md](COMPONENTS.md)
3. **Review API** — Read [API.md](API.md)
4. **Start Development** — See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Still stuck?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more issues and solutions.
