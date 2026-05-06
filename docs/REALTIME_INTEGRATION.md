# Real-Time Evaluation - Quick Integration Guide

## Step 1: Backend is Ready ✅

The backend already evaluates every chat message in real-time. No changes needed!

The `/api/chat` endpoint now returns:
```json
{
  "reply": "Sure thing!",
  "evaluation": {
    "overall": 4.2,
    "relevancy": 4.5,
    "semantic": 4.1,
    "retrieval": 3.8,
    "retention": 4.0,
    "roleAdherence": 4.3,
    "details": {
      "tokenOverlapSimilarity": "68.5%",
      "fluency": "81.2%",
      "retrievedChunkCount": 2,
      "quality": "Excellent ✅"
    }
  }
}
```

## Step 2: Display Scores in Frontend (TypeScript)

Add evaluation display to your chat component:

```typescript
// In App.tsx or your chat component

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  evaluation?: {
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
  };
}

function getScoreColor(score: number): string {
  if (score >= 4) return "#4CAF50";      // Green
  if (score >= 3) return "#FFC107";      // Yellow
  if (score >= 2) return "#FF9800";      // Orange
  return "#F44336";                      // Red
}

function EvaluationScore({ evaluation }: { evaluation: ChatMessage["evaluation"] }) {
  if (!evaluation) return null;

  return (
    <div style={{
      display: "flex",
      gap: "12px",
      padding: "8px 12px",
      backgroundColor: "#f5f5f5",
      borderRadius: "6px",
      fontSize: "0.85rem",
      marginTop: "8px",
      alignItems: "center"
    }}>
      <span style={{
        fontWeight: "bold",
        color: getScoreColor(evaluation.overall),
        fontSize: "0.95rem"
      }}>
        {evaluation.overall.toFixed(1)}/5
      </span>
      
      <span style={{ color: "#999" }}>|</span>
      
      <span title="Does it answer the question?">
        🎯 {evaluation.relevancy.toFixed(1)}
      </span>
      <span title="Natural phrasing?">
        📝 {evaluation.semantic.toFixed(1)}
      </span>
      <span title="Context found?">
        📚 {evaluation.retrieval.toFixed(1)}
      </span>
      <span title="Remembers history?">
        🧠 {evaluation.retention.toFixed(1)}
      </span>
      <span title="Matches persona?">
        🎭 {evaluation.roleAdherence.toFixed(1)}
      </span>
      
      <span style={{
        marginLeft: "auto",
        padding: "2px 6px",
        backgroundColor: evaluation.overall >= 4 ? "#e8f5e9" : 
                        evaluation.overall >= 3 ? "#fff3e0" :
                        evaluation.overall >= 2 ? "#ffe0b2" : "#ffcdd2",
        borderRadius: "3px",
        fontSize: "0.75rem",
        color: evaluation.overall >= 4 ? "#2e7d32" :
               evaluation.overall >= 3 ? "#f57f17" :
               evaluation.overall >= 2 ? "#e65100" : "#b71c1c"
      }}>
        {evaluation.details.quality}
      </span>
    </div>
  );
}

// In your chat message render:
{R.map(message => (
  <article key={message.id} className={`chat-bubble ${message.role}`}>
    <p>{message.text}</p>
    {message.role === "assistant" && <EvaluationScore evaluation={message.evaluation} />}
  </article>
))}
```

## Step 3: Store Evaluation in State

When you receive a chat response, store the evaluation:

```typescript
const [messages, setMessages] = React.useState<ChatMessage[]>([]);

async function sendMessage(userMessage: string) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, conversationId })
    });

    const data = await response.json();

    // Add user message
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "user",
      text: userMessage
    }]);

    // Add bot message WITH evaluation
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "assistant",
      text: data.reply,
      evaluation: data.evaluation  // <-- Store evaluation
    }]);
  } catch (error) {
    console.error("Error:", error);
  }
}
```

## Step 4: Optional - Show Quality Indicators

Add inline quality indicator next to persona name:

```typescript
function QualityIndicator({ evaluation }: { evaluation?: ChatMessage["evaluation"] }) {
  if (!evaluation) return null;

  const quality = evaluation.overall >= 4 ? "🟢" : 
                  evaluation.overall >= 3 ? "🟡" : 
                  evaluation.overall >= 2 ? "🟠" : "🔴";

  return <span title={`Quality: ${evaluation.overall.toFixed(1)}/5`}>{quality}</span>;
}

// Use in chat header:
<h2>
  {personaName}
  <QualityIndicator evaluation={lastMessageEvaluation} />
</h2>
```

## Step 5: Optional - Conversation Summary

Show average quality of entire conversation:

```typescript
function ConversationQuality({ messages }: { messages: ChatMessage[] }) {
  const evaluations = messages
    .filter(m => m.evaluation)
    .map(m => m.evaluation!.overall);

  if (evaluations.length === 0) return null;

  const avg = evaluations.reduce((a, b) => a + b) / evaluations.length;
  const trend = evaluations.length > 1 
    ? (evaluations[evaluations.length - 1] - evaluations[0]) 
    : 0;

  return (
    <div style={{
      padding: "12px",
      backgroundColor: "#f9f9f9",
      borderRadius: "6px",
      fontSize: "0.9rem",
      marginBottom: "16px"
    }}>
      <strong>Conversation Quality: </strong>
      <span style={{ color: getScoreColor(avg) }}>
        {avg.toFixed(2)}/5
      </span>
      {trend > 0 && " 📈"}
      {trend < 0 && " 📉"}
      {trend === 0 && " ➡️"}
    </div>
  );
}
```

## Step 6: Optional - Export Results

Let users download evaluation report:

```typescript
function exportConversationReport(messages: ChatMessage[], personaName: string) {
  const evaluations = messages
    .filter(m => m.evaluation)
    .map((m, i) => ({
      turn: i + 1,
      userMessage: m.text,
      botReply: messages[i + 1]?.text || "",
      overall: m.evaluation!.overall,
      metrics: {
        relevancy: m.evaluation!.relevancy,
        semantic: m.evaluation!.semantic,
        retrieval: m.evaluation!.retrieval,
        retention: m.evaluation!.retention,
        roleAdherence: m.evaluation!.roleAdherence
      }
    }));

  const report = {
    persona: personaName,
    date: new Date().toISOString(),
    totalMessages: messages.length,
    evaluatedMessages: evaluations.length,
    averageScore: (evaluations.reduce((a, b) => a + b.overall, 0) / evaluations.length).toFixed(2),
    evaluations
  };

  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evaluation-${Date.now()}.json`;
  a.click();
}
```

## Testing It Out

1. **Start backend:**
   ```bash
   cd backend
   node server.js
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Create a persona** (upload WhatsApp chat)

4. **Send messages** - you'll see evaluation scores appear below each response

5. **Watch the scores** change based on response quality

## What the Scores Mean

| Score | Meaning | Visual |
|-------|---------|--------|
| 4.5-5.0 | Excellent response | 🟢 Green |
| 3.5-4.5 | Good response | 🟡 Yellow |
| 2.5-3.5 | Fair response | 🟠 Orange |
| 1.0-2.5 | Poor response | 🔴 Red |

## Common Patterns

**High scores (4+):**
- Reply directly answers the question
- Natural, conversational tone
- References earlier context
- Well-written and fluent

**Low scores (<2):**
- Reply doesn't address question
- Awkward or formal phrasing
- Ignores conversation history
- Generic or off-character

## Troubleshooting

**Scores always low:**
- Check knowledge base is populated (retrieval metric)
- Verify persona matches expected style (role adherence)
- Ensure conversation context is passed to LLM

**Scores fluctuate wildly:**
- Normal behavior - depends on message content
- Short messages may score lower on fluency
- Open-ended questions may score lower on relevancy

**Evaluation not showing:**
- Check browser console for errors
- Verify `data.evaluation` exists in response
- Ensure chat component updates when message received

## Next Steps

- Display evaluation in UI (this guide ✅)
- Track scores over time
- Create analytics dashboard
- Set up alerts for low scores
- Compare different personas with scores

---

See [REALTIME_EVALUATION.md](./REALTIME_EVALUATION.md) for full documentation.
