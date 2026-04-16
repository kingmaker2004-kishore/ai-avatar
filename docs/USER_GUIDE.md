# User Guide

Complete guide for end-users on how to create and use AI Avatar personas.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Persona](#creating-your-first-persona)
3. [Having a Conversation](#having-a-conversation)
4. [Using the Animated Avatar](#using-the-animated-avatar)
5. [Understanding Responses](#understanding-responses)
6. [Tips & Tricks](#tips--tricks)
7. [FAQ](#faq)

---

## Getting Started

### What is AI Avatar?

AI Avatar lets you create a personalized AI chatbot based on someone's real chat messages. Upload a WhatsApp chat export, select who you want to chat with, and you'll get an AI that mimics their communication style, personality, and knowledge.

**Key Features**:
- 🤖 Create personas from real chat history
- 💬 Multi-turn conversations with context awareness
- 🎬 Optional animated avatar for responses
- 📚 Grounded responses citing what the persona "remembers"
- 🔄 Multiple conversations with the same persona

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (modern version)
- **Internet**: Broadband connection (for API calls)
- **WhatsApp**: Chat export capability (feature varies by platform)

---

## Creating Your First Persona

### Step 1: Export a WhatsApp Chat

#### From iPhone

1. Open WhatsApp and go to the chat you want to export
2. Tap the contact name at the top
3. Scroll down and tap **"Export Chat"**
4. Choose **"Without Media"** (smaller file)
5. Select how to save (email, cloud drive, etc.)
6. Download the .txt file to your computer

#### From Android

1. Open WhatsApp and go to the chat you want to export
2. Tap the menu (three dots) at the top
3. Select **"More" → "Export Chat"**
4. Choose **"Without Media"**
5. Select where to save (email, cloud drive, etc.)
6. Download the .txt file to your computer

#### Exported File Format

The file looks like this:

```
[1/15/2024, 10:30:45 AM] Alice: Hey, how are you?
[1/15/2024, 10:31:12 AM] Bob: I'm doing great! Just finished a project
[1/15/2024, 10:32:00 AM] Alice: That's awesome! What kind of project?
[1/15/2024, 10:33:45 AM] Bob: It's a web app for managing tasks
```

### Step 2: Launch AI Avatar

1. Open AI Avatar in your web browser
2. You'll see the **"Create Your Persona"** screen
3. Click **"Choose File"** or drag-and-drop your WhatsApp .txt export

### Step 3: Select Who to Chat With

1. The app will scan your chat and show all participants
2. A list appears with:
   - **Name** — Person's name from chat
   - **Message Count** — How many messages they sent
   - **Preview** — Sample of their speaking style

Example:
```
Alice (245 messages)
"Hey, how are you? I'm doing great! That sounds cool"

Bob (198 messages)
"I'm awesome! Let's go! That sounds fun"
```

3. Click on the person you want to chat with

### Step 4: Persona Ready!

Once selected, the app will:
1. Analyze their messages
2. Extract their personality, interests, and speaking style
3. Create a persona profile
4. Load the chat interface

You're now ready to chat!

---

## Having a Conversation

### Starting a Chat

1. You'll see a chat interface with:
   - **Message history** (empty for new conversations)
   - **Input field** — Type your message here
   - **Send button** — Send your message

### Typing Your Message

1. Click in the text field
2. Type your message (up to 2,000 characters)
3. Press **Enter** or click **Send**

**Example**:
```
You: Hey! How have you been?
```

### AI Response

The persona will respond based on:
- **Their personality** — How they usually act
- **Their knowledge** — What they know from your chats
- **Conversation context** — Previous messages in this conversation
- **Shared experiences** — Memories from other conversations with them

**Example response**:
```
Person: I've been really well, thanks for asking! 
Just wrapped up that project we talked about. 
How about you? What have you been up to?
```

### Conversation Features

#### View Grounding Information

Responses include **cite items** — what the persona is referencing:

```
Response: "I love working on design, like we did on that UI project"

Cite Item: "Shared experience: We worked on a UI redesign project together"
```

This helps you understand where the response comes from.

#### Start a New Conversation

To chat about different topics, you can start a new conversation:
1. Click **"New Chat"** button
2. Same persona, fresh conversation history
3. No previous messages in the new chat

#### Load Previous Conversations

To go back to an earlier conversation:
1. Go to **"Conversation History"**
2. Select the date/topic
3. Previous messages reload
4. Continue where you left off

---

## Using the Animated Avatar

### Enable Avatar Display

If available, you can see an animated avatar speaking responses:

1. In settings, enable **"Show Animated Avatar"**
2. The app loads the avatar
3. When persona responds, you'll see:
   - Animated character speaking
   - Lip-sync with the text
   - Gestures and animations

### Avatar Features

- **Speech Animation** — Mouth moves with text
- **Expressions** — Avatar reacts to conversation
- **Gestures** — Hand movements for emphasis
- **Volume Control** — Adjust voice volume (if audio enabled)

### Disable Avatar

If avatar is slow or causes issues:
1. Go to settings
2. Toggle **"Show Animated Avatar"** off
3. You'll see text responses only

---

## Understanding Responses

### How Responses Are Generated

The AI persona uses multiple approaches:

#### 1. Learned Patterns (Fast)
The persona learns how they typically respond:
- Common phrases
- Speaking style
- Tone

If this matches the conversation, a response is generated instantly.

#### 2. Context from Chat History
The persona remembers:
- What you talked about before
- Shared experiences
- Interests mentioned

This grounds responses in real memories.

#### 3. LLM (Groq) - When Needed
If the above approaches can't generate a response, the system uses a large language model:
- More creative responses
- Better handling of new topics
- More human-like conversation

### Response Quality

**High-quality responses** come from:
✅ Specific, personal context ("We talked about...")  
✅ Clear conversation history  
✅ Enough message examples in export  
✅ Consistent speaking style in original chats  

**Lower-quality responses** may occur with:
❌ Very short chat export (< 50 messages)  
❌ Generic/vague messages in original chat  
❌ New topics not mentioned in history  
❌ Sarcasm or context-dependent humor  

### Cite Items Explained

Each response includes cite items showing where context came from:

**Type: Memory**
```
"We worked on a Python project together"
Source: Previous conversation, Jan 15, 2024
```

**Type: Knowledge**
```
"You're interested in machine learning"
Source: Messages mentioning ML and AI
```

**Type: Conversation**
```
"We discussed recent movie recommendations"
Source: Earlier in this conversation
```

---

## Tips & Tricks

### 1. Get Better Responses with a Longer Chat Export

**Better**:
- Export a group chat with 500+ messages (more patterns)
- Export a one-on-one with extended history (more context)

**Worse**:
- Export a brand new group (< 50 messages)
- Export a brief conversation

### 2. Be Specific in Your Questions

**Better**:
```
"Remember that time we went hiking? What was your favorite part?"
```

**Gets generic response**:
```
"What do you think about nature?"
```

### 3. Ask About Shared Experiences

The persona remembers things you both discussed:

```
You: Hey, how did that interview go? 
     (if you discussed it before)

Persona: Great! I was nervous at first, 
         but remembered what you said about...
```

### 4. Use the Animated Avatar

The avatar makes responses feel more personal:
- More engaging than text alone
- Easier to understand tone
- Better for presentations/demos

### 5. Save Interesting Conversations

Most conversations are saved automatically, but:
1. Go to **"Conversation History"**
2. Mark important conversations as **"Favorite"**
3. Find them easily later

### 6. Try Different Personas

You can create multiple personas:
- Different people in same group chat
- Multiple group chats
- Same person at different times (v1, v2)

Compare how different they chat!

### 7. Refine Your Persona Over Time

Start with a smaller export, then:
1. Ask a few test questions
2. See if responses feel authentic
3. Add more chat history if needed
4. Recreate the persona
5. Test again

---

## FAQ

### Q: Is my chat data secure?

**A**: Your chat is only used to create the persona. It's not stored permanently:
- File is processed only on upload
- Persona insights are extracted and stored
- Original chat file is not kept
- Data is not shared with external services

(However, Groq API receives text for LLM processing - see their privacy policy)

---

### Q: Can I chat with someone who blocked me or isn't available?

**A**: Yes! The persona is based on:
- Historical chat messages
- Extracted personality and interests
- Learned communication style

It's meant for fun, memory, or exploring "what would they say?" It's not a replacement for real conversations.

---

### Q: What if the persona doesn't sound like the real person?

**A**: This can happen if:
- Chat export is too short (< 100 messages)
- Person's style varies a lot (sarcastic, context-dependent)
- They used mostly emojis or abbreviations

**Fix**:
1. Try a longer chat export
2. Be more specific in your questions
3. Ask about shared experiences
4. Adjust how you phrase questions

---

### Q: Can I export and chat with multiple people from the same group?

**A**: Yes! Upload the same group chat multiple times:
1. Create persona for person 1
2. Start conversation with person 1
3. Create new persona for person 2
4. Chat with person 2

Each has their own personality.

---

### Q: What file format do I need?

**A**: WhatsApp exports as `.txt` (plain text):
- **With Media**: Includes pictures, videos (larger file)
- **Without Media**: Text only (recommended, faster)

The app only processes text anyway, so "Without Media" is better.

---

### Q: Why is it slow to generate responses?

**A**: Typical response time: 1-3 seconds

**Slow response (5+ seconds)?**
1. First request: Model is initializing (might take longer)
2. Complex query: System is thinking hard
3. Network: Your internet connection

Wait and refresh if timeout occurs.

---

### Q: Can I delete conversations?

**A**: Currently, all conversations are kept. 

**In future versions**, there will be options to:
- Delete specific conversations
- Clear all conversation history
- Export conversations

For now, conversations are permanent.

---

### Q: What languages does AI Avatar support?

**A**: Currently English only.

The system could support other languages via:
- Exporting chats in other languages
- Using multilingual LLM models

This may be added in future versions.

---

### Q: Can I use this for business/commercial purposes?

**A**: Depends on the terms of service for the platform.

Generally:
- ✅ Personal use (chat with friends/family)
- ✅ Educational use (learn about AI/NLP)
- ⚠️ Commercial use (check terms first)

---

### Q: Is this the same as hiring someone?

**A**: No. AI Avatar:
- Mimics communication style
- Lacks true decision-making
- Can't remember across conversations
- Not a replacement for real people

It's for fun, memory, or exploring "what would they say?"

---

### Q: Can the persona learn from new conversations?

**A**: Currently, no. The persona is static based on:
- The original chat export
- Messages at time of creation

Future versions might support:
- Updating persona with new chats
- Learning from recent conversations
- Persona evolution over time

---

## Need Help?

- **Problem with upload?** See [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
- **Technical question?** See [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- **Want to extend the app?** See [CONTRIBUTING.md](../docs/CONTRIBUTING.md)

---

Happy chatting! 🚀
