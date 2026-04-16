# Troubleshooting Guide

Common issues, error messages, and solutions for AI Avatar.

## Table of Contents

1. [Frontend Issues](#frontend-issues)
2. [Backend Issues](#backend-issues)
3. [API & Chat Issues](#api--chat-issues)
4. [Avatar & Media Issues](#avatar--media-issues)
5. [Database Issues](#database-issues)
6. [Deployment Issues](#deployment-issues)
7. [Git & Version Control](#git--version-control)
8. [General Debugging](#general-debugging)

---

## Frontend Issues

### Issue: App Won't Load (Blank Page)

**Symptom**: Browser shows blank page, no content

**Causes**:
- Vite dev server not running
- Build error
- JavaScript broken

**Solutions**:

1. **Check Vite is running**:
   ```bash
   npm run dev
   # Should show: Local: http://localhost:5173/
   ```

2. **Check browser console** (F12 → Console tab):
   - Look for red error messages
   - Screenshot/note the error
   - Google the error message

3. **Rebuild**:
   ```bash
   npm install
   npm run dev
   ```

4. **Clear cache**:
   - Ctrl+Shift+Delete (Chrome)
   - Empty browser cache
   - Refresh page (Ctrl+R)

---

### Issue: "Cannot GET /" 

**Symptom**: Error page when visiting localhost:5173

**Cause**: Vite dev server not running

**Solution**:
```bash
npm run dev
# Wait for "ready in XXX ms"
# Visit localhost:5173 again
```

---

### Issue: Slow Startup / "Module not found" Errors

**Symptom**: App slow to load or "fs" module not found

**Cause**: Dependencies not installed or npm cache corrupted

**Solutions**:
```bash
# Clean install
rm -r node_modules package-lock.json
npm install

# Or on Windows (PowerShell)
Remove-Item -Recurse node_modules
Remove-Item package-lock.json
npm install
```

---

### Issue: TypeScript Errors in IDE

**Symptom**: Red squiggles in VS Code, errors like "Cannot find module"

**Solutions**:

1. **Restart TypeScript server**:
   - Ctrl+Shift+P → "TypeScript: Restart TS Server"

2. **Check tsconfig.json exists**:
   ```bash
   ls tsconfig.json
   ```

3. **Install TypeScript locally**:
   ```bash
   npm install typescript
   ```

---

### Issue: API Calls Failing (404, 500 errors)

**Symptom**: Chat not working, see errors like "POST /api/chat 404"

**Cause**: Backend not running or URL wrong

**Solutions**:

1. **Verify backend is running**:
   ```bash
   curl http://localhost:5000/health
   # Should return: {"status":"ok"}
   ```

2. **Check Vite proxy configuration**:
   - Open `vite.config.ts`
   - Verify proxy: `/api → http://localhost:5000`

3. **Check backend server.js**:
   - Routes should start with `/api`
   - CORS should be enabled

---

## Backend Issues

### Issue: Backend Won't Start

**Symptom**: Error when running `npm start`

**Common Errors**:

#### "Cannot find module 'express'"
```bash
cd backend
npm install
npm start
```

#### "Port 5000 already in use"
```bash
# Find what's using port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or use different port
PORT=5001 npm start
```

#### "'require' is not defined"
Make sure you're in the `backend/` folder:
```bash
cd backend
npm start
```

---

### Issue: "ENOENT: no such file or directory" for .env

**Symptom**: Backend error about missing `.env` file

**Solution**:
```bash
cd backend
cp .env.example .env
# Now edit .env and add your API keys
```

---

### Issue: "GROQ_API_KEY not found" or API Key Invalid

**Symptom**: Backend starts but chat returns error

**Causes**:
- API key missing from `.env`
- API key expired/revoked
- API key wrong format

**Solutions**:

1. **Check .env file**:
   ```bash
   cat backend/.env | grep GROQ
   # Should show: GROQ_API_KEY=gsk_XXXXX
   ```

2. **Verify API key format**:
   - Groq keys start with `gsk_`
   - Should be long string (80+ characters)

3. **Get new API key**:
   - Go to [console.groq.com](https://console.groq.com)
   - Create new API key
   - Copy and paste into `.env`
   - Restart backend: `npm start`

4. **Test API key directly**:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.groq.com/openai/v1/models
   ```

---

### Issue: "Unexpected end of JSON input"

**Symptom**: Chat response is blank or error

**Cause**: Invalid JSON response from Groq API

**Solutions**:

1. **Check API key is valid**
2. **Check network connection**
3. **Try again** (might be temporary Groq outage)
4. **Check Groq status page**: https://status.groq.com

---

## API & Chat Issues

### Issue: Chat Returns Empty Response

**Symptom**: Submit message, get blank AI response

**Causes**:
- Groq API error
- Response post-processing failed
- Network timeout

**Solutions**:

1. **Check browser console** (F12 → Network tab):
   - Look for `/api/chat` request
   - Check response body for error

2. **Check backend logs**:
   ```bash
   # If using pm2
   pm2 logs ai-avatar-backend
   ```

3. **Verify API key**:
   - See [GROQ_API_KEY issue](#issue-groq_api_key-not-found-or-api-key-invalid) above

4. **Try simple test**:
   ```bash
   curl -X POST http://localhost:5000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"conversationId":"test","userMessage":"Hi"}'
   ```

---

### Issue: Chat Very Slow (10+ seconds)

**Symptom**: Long wait for AI response

**Normal**: 1-3 seconds per response

**Possible Causes**:
- First request (model initialization)
- Groq API slow
- Large conversation history
- Network latency

**Solutions**:

1. **First request is normal**: Model loads, might take 5+ seconds

2. **Shorten conversation history**:
   - In `backend/.env`: `PERSONA_HISTORY_TURNS=3` (reduce from 6)
   - Fewer messages = faster processing

3. **Check Groq status**:
   - May be rate-limited or overloaded
   - Try again in a few minutes

4. **Check internet speed**:
   - Run speed test at speedtest.net
   - Ensure 25+ Mbps

---

### Issue: "WhatsApp Upload Fails"

**Symptom**: Upload button doesn't work or error during upload

**Causes**:
- File size too large
- Wrong file format
- File encoding issue

**Solutions**:

1. **Check file format**:
   - Must be `.txt` (plain text)
   - Must be WhatsApp export format
   - File size < 50MB

2. **Check file encoding**:
   - Export without media
   - Re-export the chat

3. **Try different browser**:
   - Some browsers have file upload limits
   - Try Chrome, Firefox, or Safari

---

## Avatar & Media Issues

### Issue: Animated Avatar Not Showing

**Symptom**: Avatar section blank or says "Loading avatar..."

**Causes**:
- HeyGen API key missing
- SDK not loading
- Browser compatibility

**Solutions**:

1. **Check HeyGen API key**:
   ```bash
   cat backend/.env | grep LIVEAVATAR
   # Should have LIVEAVATAR_API_KEY=...
   ```

2. **Check browser console**:
   - F12 → Console
   - Look for HeyGen SDK errors
   - Try Chrome (best supported)

3. **Disable avatar for now**:
   - In settings, turn off "Show Animated Avatar"
   - Chat still works with text responses

---

### Issue: Avatar Video Not Playing

**Symptom**: Avatar area blank, no video

**Causes**:
- Video generation failed
- Video URL invalid
- Playback issue

**Solutions**:

1. **Check browser console** for errors

2. **Check network tab**:
   - Look for video request
   - Check response status (should be 200)

3. **Disable and re-enable avatar**:
   - Turn off in settings
   - Refresh page
   - Turn back on

---

## Database Issues

### Issue: "Database Locked" Error

**Symptom**: Backend error "database is locked"

**Cause**: Multiple processes accessing database

**Solutions**:

```bash
# Stop backend
cd backend
npm stop
# Or Ctrl+C if running in terminal

# Clean up lock files
rm ai.db-wal ai.db-shm

# Restart
npm start
```

---

### Issue: "SQLITE_CANTOPEN"

**Symptom**: Backend won't start, can't open database

**Cause**: Database file path issue or permissions

**Solutions**:

1. **Check database path**:
   ```bash
   ls -la backend/ai.db
   # File should exist, -rw- permissions
   ```

2. **Fix permissions**:
   ```bash
   chmod 644 backend/ai.db
   ```

3. **Recreate database**:
   ```bash
   rm backend/ai.db
   npm start
   # Will auto-create and initialize
   ```

---

### Issue: Messages Not Saving

**Symptom**: Chat works but messages disappear

**Cause**: Database save failed silently

**Solutions**:

1. **Check database**:
   ```bash
   sqlite3 backend/ai.db "SELECT COUNT(*) FROM messages;"
   ```

2. **Check backend logs** for errors

3. **Verify permissions**:
   ```bash
   chmod 755 backend/
   chmod644 backend/ai.db
   ```

---

## Deployment Issues

### Issue: Deployed App Blank or 502 Error

**Symptom**: After deploy, app shows error or blank

**Causes**:
- Build not deployed
- Backend not running
- Wrong configuration
- Port issues

**Solutions**:

1. **Check build deployed**:
   ```bash
   # On server
   ls -la /var/www/ai-avatar/dist/
   # Should have index.html, assets/ folder
   ```

2. **Check backend running**:
   ```bash
   ps aux | grep node
   systemctl status ai-avatar-backend
   pm2 status
   ```

3. **Check nginx config**:
   ```bash
   nginx -t  # Test syntax
   tail -f /var/log/nginx/error.log
   ```

4. **Check port conflicts**:
   ```bash
   netstat -tuln | grep 5000
   ```

---

### Issue: CORS Error in Production

**Symptom**: Browser error about CORS

**Solution** - Update `backend/server.js`:

```javascript
app.use(cors({
  origin: ['https://ai-avatar.example.com'],
  credentials: true
}))
```

---

## Git & Version Control

### Issue: "Push Declined - Secret Scanning"

**Symptom**: Git push blocked by GitHub

**Cause**: Groq API key exposed in `.env.example` or code

**Current Status**: This is a known issue with the `.env.example` file which contains placeholder text.

**Solution**:

The `.env.example` only contains **placeholder values** like `your_groq_api_key`, not real secrets. GitHub may be over-sensitive.

**To resolve**:

1. **For now** - Allow the push on GitHub:
   - Go to the URL GitHub provided
   - Review the secret
   - Click "Allow" to unblock

2. **Prevent future blocks**:
   - Ensure `.env` (with real keys) is in `.gitignore`
   - Only commit `.env.example` with placeholders
   - Never commit `.env` file

3. **Check .gitignore**:
   ```bash
   cat .gitignore
   # Should contain: backend/.env
   ```

---

## General Debugging

### Enable Debug Logging

In `backend/server.js`, add debug output:

```javascript
// At top of file
const DEBUG = process.env.DEBUG === 'true'

// In routes
if (DEBUG) console.log('Received message:', userMessage)
```

Run with debug:
```bash
DEBUG=true npm start
```

---

### Check Health Endpoints

```bash
# Backend health
curl http://localhost:5000/health
# Expected: {"status":"ok"}

# Frontend (if running)
curl http://localhost:5173/
# Expected: HTML content
```

---

### Inspect Network Requests

1. Open browser dev tools (F12)
2. Go to **Network** tab
3. Perform action (send chat message)
4. Look for relevant request
5. Check:
   - Status code (200 = good, 4xx = client error, 5xx = server error)
   - Response body
   - Request headers

---

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | OK | Working normally |
| 400 | Bad Request | Invalid input, check message format |
| 404 | Not Found | API route not found, check backend route |
| 500 | Server Error | Backend error, check logs |
| 503 | Unavailable | API service down (Groq), try later |

---

### Useful Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# List running processes
ps aux | grep node

# Check ports in use
netstat -tuln | grep LISTEN

# View file
cat filename

# Search file content
grep "search term" filename

# Kill process
kill -9 <PID>
```

---

## Still Stuck?

1. **Check error message** — Google the exact error text
2. **Check logs**:
   - Browser console (F12)
   - Backend terminal output
   - System logs
3. **Check networking**:
   - Firewall blocking ports?
   - VPN interfering?
4. **Try isolation tests**:
   - Test API directly with curl
   - Test with minimal code
5. **Ask for help**:
   - GitHub Issues
   - See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Happy troubleshooting!** 🔧
