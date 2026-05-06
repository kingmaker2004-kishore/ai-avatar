# Real-Time Chat Evaluation

The AI Avatar now evaluates **every chat message in real-time** as you talk to the chatbot. Each response gets instant quality scores.

## What Gets Evaluated

Every time you send a message and the bot replies, the system scores:

### 📊 Five Evaluation Metrics (1-5 scale)

1. **Relevancy** (1-5)
   - Does the reply address your message?
   - Token overlap between your question and bot's answer
   - **Score 4+:** Directly answers your question
   - **Score 3:** Mostly on-topic with some gaps
   - **Score <3:** Misses the point

2. **Semantic Similarity** (1-5)
   - How semantically close is the reply to what you expected?
   - Combines token overlap (40%) + fluency (60%)
   - **Score 4+:** Natural, coherent response
   - **Score 3:** Decent fluency with minor issues
   - **Score <3:** Awkward phrasing or unclear

3. **Retrieval Quality** (1-5)
   - Did the RAG system find relevant knowledge chunks?
   - Based on number of chunks retrieved
   - **Score 4+:** Rich context retrieved
   - **Score 3:** Some context found
   - **Score <3:** Little to no context

4. **Context Retention** (1-5)
   - Does the bot remember earlier conversation context?
   - Checks if reply references previous messages
   - **Score 4+:** Excellent memory of earlier points
   - **Score 3:** References some prior context
   - **Score <3:** Ignores conversation history

5. **Role Adherence** (1-5)
   - Does the reply match the persona's communication style?
   - WhatsApp persona: short messages, casual tone
   - **Score 4+:** Perfect persona match
   - **Score 3:** Generally matches persona
   - **Score <3:** Sounds generic or off-character

### 🎯 Overall Score (1-5)
- Average of all 5 metrics
- Indicates overall response quality

## API Response Format

When you send a message to `/api/chat`, the response now includes an `evaluation` object:

```json
{
  "reply": "Yeah, we can definitely do that next week.",
  "evaluation": {
    "overall": 4.2,
    "relevancy": 4.5,
    "semantic": 4.1,
    "retrieval": 3.8,
    "retention": 4.0,
    "roleAdherence": 4.3,
    "details": {
      "tokenOverlapSimilarity": "65.4%",
      "fluency": "82.3%",
      "retrievedChunkCount": 2,
      "quality": "Excellent ✅"
    }
  }
}
```

## How to Display in UI

### Example: React Component

```typescript
interface EvaluationScore {
  overall: number;
  relevancy: number;
  semantic: number;
  retrieval: number;
  retention: number;
  roleAdherence: number;
  details: {
    tokenOverlapSimilarity: string;
    fluency: string;
    retrievedChunkCount: number;
    quality: string;
  };
}

function ChatEvaluationBadge({ evaluation }: { evaluation: EvaluationScore }) {
  if (!evaluation) return null;

  const getColor = (score: number) => {
    if (score >= 4) return "#4CAF50"; // Green
    if (score >= 3) return "#FFC107"; // Yellow
    if (score >= 2) return "#FF9800"; // Orange
    return "#F44336"; // Red
  };

  return (
    <div style={{ 
      display: "flex", 
      gap: "10px", 
      padding: "10px",
      backgroundColor: "#f5f5f5",
      borderRadius: "8px",
      fontSize: "0.9rem"
    }}>
      <span style={{ color: getColor(evaluation.overall) }}>
        📊 {evaluation.overall.toFixed(1)}/5
      </span>
      <span style={{ color: getColor(evaluation.relevancy) }}>
        🎯 Relevancy: {evaluation.relevancy.toFixed(1)}
      </span>
      <span style={{ color: getColor(evaluation.semantic) }}>
        📝 Semantic: {evaluation.semantic.toFixed(1)}
      </span>
      <span style={{ color: getColor(evaluation.retrieval) }}>
        📚 Retrieval: {evaluation.retrieval.toFixed(1)}
      </span>
      <span>{evaluation.details.quality}</span>
    </div>
  );
}
```

### Display Below Chat Bubble

```typescript
{/* Assistant message bubble */}
<div className="message assistant">
  <p>{message.text}</p>
  {message.evaluation && <ChatEvaluationBadge evaluation={message.evaluation} />}
</div>
```

### Display as Inline Indicator

```typescript
<div style={{
  display: "flex",
  alignItems: "center",
  gap: "8px"
}}>
  <span className="chat-bubble-content">{message.text}</span>
  <span style={{
    fontSize: "0.8rem",
    backgroundColor: evaluation.overall >= 4 ? "#e8f5e9" : "#fff3e0",
    padding: "4px 8px",
    borderRadius: "4px",
    color: evaluation.overall >= 4 ? "#2e7d32" : "#e65100"
  }}>
    {evaluation.overall.toFixed(1)}/5
  </span>
</div>
```

## Understanding the Scores

### Excellent Response (4.0+) ✅

```
Overall: 4.5
├─ Relevancy: 4.8 (directly answers the question)
├─ Semantic: 4.3 (natural phrasing)
├─ Retrieval: 4.2 (good context chunks)
├─ Retention: 4.5 (references earlier context)
└─ Role: 4.4 (matches persona perfectly)

→ Bot is performing great!
```

**What this means:**
- Reply fully addresses user intent
- Tone matches persona style
- References prior conversation points
- Uses context from knowledge base
- Natural, fluent language

### Good Response (3.0-4.0) ⭐

```
Overall: 3.6
├─ Relevancy: 3.9 (mostly on-topic)
├─ Semantic: 3.5 (decent fluency)
├─ Retrieval: 3.2 (some context found)
├─ Retention: 3.8 (remembers some context)
└─ Role: 3.5 (mostly matches persona)

→ Bot is doing well with minor improvements possible
```

**What this means:**
- Reply generally addresses the question
- Some relevance to persona style
- References some earlier points
- Limited context retrieval
- Mostly natural language

### Fair Response (2.0-3.0) ⚠️

```
Overall: 2.7
├─ Relevancy: 2.8 (partially addresses)
├─ Semantic: 2.4 (awkward phrasing)
├─ Retrieval: 2.1 (minimal context)
├─ Retention: 2.5 (forgetting context)
└─ Role: 2.9 (inconsistent persona)

→ Bot needs improvements
```

**What this means:**
- Reply partially misses the point
- Language could be more natural
- Not using knowledge base effectively
- Forgetting conversation history
- Persona tone inconsistent

### Poor Response (<2.0) ❌

```
Overall: 1.6
├─ Relevancy: 1.5 (misses the question)
├─ Semantic: 1.2 (very awkward)
├─ Retrieval: 1.0 (no context)
├─ Retention: 1.3 (no memory)
└─ Role: 2.1 (doesn't match persona)

→ Significant issues - consider retraining
```

**What this means:**
- Reply doesn't address the user's intent
- Very unnatural phrasing
- RAG not retrieving relevant content
- Ignoring entire conversation history
- Persona completely mismatched

## Real-Time Workflow

```
User: "Can you help with the report?"
      ↓
[Processing...]
      ↓
Bot: "Sure, I can review the report methodology."
      ↓
⚡ EVALUATION RUNS (instant)
      ↓
Overall: 4.3/5 ✅ Excellent
├─ Relevancy: 4.5
├─ Semantic: 4.2
├─ Retrieval: 4.1
├─ Retention: 4.0
└─ Role: 4.3
      ↓
Display score to user
```

## Performance Monitoring

Track evaluation scores over a conversation:

```typescript
const conversationScores = messages
  .filter(m => m.evaluation)
  .map(m => m.evaluation.overall);

const avgScore = conversationScores.reduce((a, b) => a + b) / conversationScores.length;
const trend = conversationScores[conversationScores.length - 1] - conversationScores[0];

console.log(`Average score: ${avgScore.toFixed(2)}/5`);
console.log(`Trend: ${trend > 0 ? "Improving ↗️" : "Declining ↘️"}`);
```

### Dashboard Example

```typescript
<div style={{ padding: "20px", backgroundColor: "#f9f9f9" }}>
  <h3>Conversation Quality</h3>
  <p>Average Score: <strong>{avgScore.toFixed(2)}/5</strong></p>
  <p>Messages Evaluated: <strong>{conversationScores.length}</strong></p>
  <p>Best Response: <strong>{Math.max(...conversationScores).toFixed(1)}/5</strong></p>
  <p>Worst Response: <strong>{Math.min(...conversationScores).toFixed(1)}/5</strong></p>
  <p>Trend: {trend > 0 ? "📈 Improving" : trend < 0 ? "📉 Declining" : "➡️ Stable"}</p>
</div>
```

## Limitations

- **Token-based similarity** — Uses word overlap, not semantic understanding
- **Quick scoring** — Designed to be fast (under 50ms per message)
- **No LLM cost** — Doesn't call external APIs, purely heuristic
- **English optimized** — Works best with English text
- **Context window** — Only checks last few messages for retention

## Improving Scores

### To increase Relevancy:
- Ask clearer, more specific questions
- Make sure persona understands context
- Add more example conversations to persona

### To increase Semantic:
- Ensure knowledge base has clear, concise chunks
- Tune persona to be more conversational
- Add more diverse response examples

### To increase Retrieval:
- Expand knowledge base with relevant documents
- Improve chunk organization/tagging
- Use more specific queries

### To increase Retention:
- Ensure conversation history is passed to LLM
- Add context from previous turns to prompts
- Train persona with multi-turn examples

### To increase Role Adherence:
- Retrain persona with target communication style
- Adjust persona profile rules
- Use more representative WhatsApp samples

## Next Features

- [ ] Historical score tracking across conversations
- [ ] Export evaluation report as CSV/JSON
- [ ] Alerts when scores drop below threshold
- [ ] A/B testing different personas with score comparison
- [ ] Real BERTScore from HuggingFace for better semantic matching
- [ ] Multi-language support
- [ ] Integration with analytics dashboard

---

**See Also:**
- [Chat API Endpoint](./API.md#post-apichat)
- [Evaluation Framework](./EVALUATION.md)
