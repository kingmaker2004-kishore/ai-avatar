# Contributing Guide

Guidelines for contributing to the AI Avatar project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Code Style & Standards](#code-style--standards)
3. [Development Workflow](#development-workflow)
4. [Creating Features](#creating-features)
5. [Testing](#testing)
6. [Pull Requests](#pull-requests)
7. [Issues & Bugs](#issues--bugs)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js v16+ installed
- git configured with your name/email
- GitHub account
- Fork of the repository

### Fork & Clone

1. **Fork on GitHub**:
   - Click "Fork" on https://github.com/kingmaker2004-kishore/ai-avatar
   - Creates your own copy

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-avatar.git
   cd ai-avatar
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/kingmaker2004-kishore/ai-avatar.git
   git remote -v  # Verify both origin and upstream exist
   ```

### Initial Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Create .env file for backend
cp backend/.env.example backend/.env
# (Add your Groq API key for testing)

# Start development
npm run dev
```

---

## Code Style & Standards

### TypeScript / JavaScript

- **Use TypeScript** for all frontend code (`.tsx`)
- **Use modern JavaScript** (ES6+)
- **Variable naming**: camelCase
- **Function naming**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Classes**: PascalCase

```typescript
// ✅ Good
const userName: string = "Alice"
const MAX_RETRIES = 3

function getUserProfile(userId: string): UserProfile {
  // ...
}

class APIClient {
  // ...
}

// ❌ Bad
const user_name = "Alice"
const maxRetries = 3

function get_user_profile(user_id) {
  // ...
}
```

### React Components

- **Functional components** (hooks preferred over class components)
- **Props interface** defined above component
- **TypeScript types** for all props and state
- **Memoize** when performance-critical

```typescript
// ✅ Good
interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const Message: React.FC<MessageProps> = ({ role, content, timestamp }) => {
  return <div className={`message message-${role}`}>{content}</div>
}

// ❌ Bad
export const Message = ({ role, content, timestamp }) => {
  return <div className={`message message-${role}`}>{content}</div>
}
```

### Backend Code (Node.js)

- **Use async/await** for async operations
- **Error handling** with try/catch
- **Validation** of all inputs
- **Comments** for complex logic

```javascript
// ✅ Good
async function sendMessage(conversationId, userMessage) {
  try {
    // Validate input
    if (!conversationId || !userMessage) {
      throw new Error('Missing required fields')
    }

    // Process message
    const response = await generateResponse(userMessage)
    
    // Save to database
    await database.saveMessage(conversationId, response)
    
    return response
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}
```

### CSS

- **Use CSS modules** when possible
- **Responsive design** (mobile-first)
- **Avoid inline styles** unless necessary
- **Use CSS variables** for theming

```css
/* ✅ Good */
.container {
  display: flex;
  gap: 1rem;
  padding: 2rem;
}

.message {
  --bg-color: #f0f0f0;
  background-color: var(--bg-color);
}

/* ❌ Bad */
<div style="display: flex; gap: 10px;">
```

---

## Development Workflow

### Create a Feature Branch

```bash
# Update main first
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feat/your-feature-name
# Or for bugs: git checkout -b fix/bug-description
```

**Branch naming**:
- `feat/feature-name` — New feature
- `fix/bug-name` — Bug fix
- `docs/page-name` — Documentation
- `refactor/component-name` — Code improvements
- `test/feature-name` — Tests

### Make Changes

Edit files in your feature branch:

```bash
# In one terminal: Frontend
npm run dev

# In another terminal: Backend
cd backend
npm start

# In another terminal: Editing
git status  # See which files changed
```

### Commit Changes

Write clear commit messages:

```bash
git add .
git commit -m "feat: Add chat message counter"
# Or
git commit -m "fix: Resolve CORS error in production"
# Or
git commit -m "docs: Update API documentation"
```

**Message format**:
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples**:
```
feat: Add avatar animation support

- Integrate HeyGen LiveAvatar SDK
- Add video streaming to responses
- Update PersonaSetup component

Closes #42
```

---

## Creating Features

### Step 1: Plan

Before coding, discuss the change:

1. **Check existing issues** — Avoid duplicates
2. **Open an issue** if no discussion exists
3. **Get feedback** on design/approach
4. **Reference the issue** in your PR

### Step 2: Implement

Follow these steps:

1. **Update types** (TypeScript interfaces)
2. **Add backend changes** if needed
3. **Add frontend changes**
4. **Update tests**
5. **Update documentation** (docs/ folder)

### Step 3: Test

Test your changes locally:

```bash
# Frontend
npm run dev
# Visit http://localhost:5173
# Test your feature manually

# Backend
cd backend
npm start
# Test API endpoints with curl or Postman
```

### Step 4: Frontend Examples

#### Adding a new component

```typescript
// src/NewFeature.tsx
interface NewFeatureProps {
  onSave: (data: string) => Promise<void>
}

export const NewFeature: React.FC<NewFeatureProps> = ({ onSave }) => {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(value)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleSave} disabled={loading}>
        Save
      </button>
    </div>
  )
}
```

#### Adding an API endpoint integration

In `src/api.ts`:

```typescript
export const newFeatureAPI = (param: string) =>
  axios.post<NewFeatureResponse>('/api/new-feature', { param })
```

In component:

```typescript
const { data } = await newFeatureAPI('value')
```

### Step 5: Backend Examples

#### Adding a new route

In `backend/server.js`:

```javascript
app.post('/api/new-feature', async (req, res) => {
  try {
    const { param } = req.body

    // Validate
    if (!param) {
      return res.status(400).json({ error: 'Missing param' })
    }

    // Process
    const result = await processFeature(param)

    // Return
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

#### Adding to personaEngine.js

```javascript
async function newPersonaFeature(personaId, data) {
  // Retrieve persona
  const persona = await database.getPersona(personaId)

  // Process with persona data
  const result = applyPersonaLogic(persona, data)

  return result
}
```

---

## Testing

### Manual Testing

1. **Test your feature** in dev environment
2. **Test edge cases** (empty inputs, errors)
3. **Test on different browsers** (Chrome, Firefox, Safari)
4. **Test mobile** (use responsive mode in dev tools)

### Automated Tests (Optional)

If adding complex logic, add tests:

```typescript
// src/__tests__/newFeature.test.ts
import { render, screen } from '@testing-library/react'
import { NewFeature } from '../NewFeature'

describe('NewFeature', () => {
  it('renders input and save button', () => {
    render(<NewFeature onSave={jest.fn()} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('calls onSave when button clicked', async () => {
    const onSave = jest.fn()
    render(<NewFeature onSave={onSave} />)
    // ... test implementation
  })
})
```

---

## Pull Requests

### Before Creating PR

- [ ] All tests pass (manual)
- [ ] Code follows style guide
- [ ] Commit messages are clear
- [ ] Documentation updated

### Create PR

1. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

2. **Open PR on GitHub**:
   - Title: Clear and descriptive
   - Description: Explain what and why
   - Reference related issue: `Closes #42`

3. **PR Template**:
   ```markdown
   ## What
   Brief description of changes

   ## Why
   Why is this change needed?

   ## How
   How does it work?

   ## Testing
   How to test the change manually?

   ## Closes
   Closes #<issue_number>
   ```

### During Review

- **Respond to comments** promptly
- **Make requested changes** in new commits
- **Request re-review** when ready
- **Don't force-push** to main/master

### After Approval

- Maintainer merges PR
- Your changes are live!
- Congratulations! 🎉

---

## Issues & Bugs

### Report a Bug

1. **Search existing issues** — Avoid duplicates
2. **Open new issue** with title like "Bug: Chat not working"
3. **Include**:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment (OS, browser, Node version)
   - Error messages/screenshots

### Request a Feature

1. **Check existing discussions**
2. **Open issue** with title like "Feature: Add dark mode"
3. **Describe**:
   - What feature and why it's needed
   - How it should work
   - Possible implementation

### Pick Up an Issue

1. **Comment** on issue to let others know you're working on it
2. **Create feature branch** referencing the issue
3. **Implement the fix/feature**
4. **Submit PR** referencing the issue

---

## Documentation

### Update Docs When

- Adding/changing features
- Fixing bugs that affect users
- Changing APIs
- Improving existing features

### Where to Update

- `docs/README.md` — Overview
- `docs/SETUP.md` — Setup changes
- `docs/ARCHITECTURE.md` — Architecture changes
- `docs/API.md` — API changes
- `docs/COMPONENTS.md` — Component changes
- `docs/CONTRIBUTING.md` — Process changes

### Documentation Template

```markdown
### New Feature Name

**File**: [relative/path/to/file.tsx](relative/path/to/file.tsx)

Brief description of what it does.

#### Key Features

- Feature 1
- Feature 2

#### Usage Example

\`\`\`typescript
const example = 'code'
\`\`\`

#### Props/Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| prop1 | string | Yes | What it does |
```

---

## Questions?

- **About process?** Check this guide
- **About code?** Check relevant doc in `docs/`
- **Still stuck?** Open an issue or ask in PR

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and improve
- Follow project guidelines

---

**Thank you for contributing!** 🙏

Your contributions make AI Avatar better for everyone.

