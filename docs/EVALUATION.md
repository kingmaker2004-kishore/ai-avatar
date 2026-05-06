# RAG Chatbot Evaluation Framework

This document explains the RAG evaluation system for the WhatsApp persona chatbot.

## Overview

The evaluator automatically measures RAG chatbot performance across three dimensions:

### 1. **Retrieval Metrics** (0-1 scale, converted to 1-5)
Measures how well the RAG system retrieves relevant WhatsApp chunks.

- **Precision** — Of retrieved chunks, what % were relevant to the ground truth reply?
- **Recall** — Of all potentially relevant chunks in the corpus, what % were retrieved?
- **MRR (Mean Reciprocal Rank)** — Position of the first relevant chunk (higher rank = higher score)
- **nDCG (Normalized Discounted Cumulative Gain)** — Position-weighted relevance (earlier results weighted higher)

**Scoring:**
- 5 = Excellent retrieval (avg ≥0.8)
- 4 = Good retrieval (avg ≥0.65)
- 3 = Moderate retrieval (avg ≥0.5)
- 2 = Weak retrieval (avg ≥0.35)
- 1 = Poor retrieval (avg <0.35)

### 2. **Semantic Similarity Metrics** (0-1 scale, converted to 1-5)
Measures semantic alignment between generated reply and ground truth.

- **Token Overlap** — Jaccard similarity (intersection/union) of tokens
- **Fluency Score** — Approximation based on token count, sentence structure, and punctuation variety

**Scoring:**
- 5 = Excellent match & fluency (weighted avg ≥0.8)
- 4 = Good similarity & fluency (≥0.65)
- 3 = Moderate similarity (≥0.5)
- 2 = Weak similarity (≥0.35)
- 1 = Very poor match (<0.35)

### 3. **Multi-Turn Consistency Metrics** (0-1 scale, converted to 1-5)
Ensures persona consistency and context awareness across conversation turns.

- **Conversation Relevancy** — Is reply on-topic to user's message?
- **Knowledge Retention** — Does reply reference earlier conversation context?
- **Completeness** — Does reply sufficiently address the user's intent?
- **Role Adherence** — Does reply match WhatsApp persona tone (short, casual, not formal)?

**Scoring:**
- 5 = Excellent consistency (weighted avg ≥0.8)
- 4 = Good consistency (≥0.65)
- 3 = Moderate consistency (≥0.5)
- 2 = Weak consistency (≥0.35)
- 1 = Poor multi-turn handling (<0.35)

## How It Works

### Step 1: Extract Test Cases
From the uploaded WhatsApp chat, the system extracts consecutive message pairs as test cases:
```
User Message → Expected Reply (from ground truth chat)
```

### Step 2: Run Evaluation
For each test case:
1. **Retrieve Chunks** — RAG engine searches knowledge base for relevant chunks
2. **Generate Reply** — LLM generates response using persona + retrieved context
3. **Compare** — Generated reply is scored against ground truth reply
4. **Evaluate** — Three metric dimensions are calculated

### Step 3: Generate Report
Aggregates all test case scores into:
- Average/min/max for each metric category
- Overall score (1-5 average)
- Strengths and weaknesses summary

## API Usage

### Endpoint: `/api/persona/evaluate-whatsapp`

**Request:**
```bash
POST /api/persona/evaluate-whatsapp
Content-Type: application/json

{
  "chatText": "[WhatsApp exported chat as plain text]"
}
```

**Response:**
```json
{
  "userId": "uuid",
  "evaluation": {
    "personaName": "John Doe",
    "totalMessagesAnalyzed": 150,
    "testCasesGenerated": 75,
    "testCasesEvaluated": 5,
    "summary": {
      "totalTests": 5,
      "retrieval": {
        "avg": 3.8,
        "min": 3,
        "max": 5
      },
      "semantic": {
        "avg": 4.2,
        "min": 3,
        "max": 5
      },
      "multiTurn": {
        "avg": 3.5,
        "min": 3,
        "max": 4
      },
      "overall": {
        "avg": 3.8,
        "min": 3,
        "max": 5
      },
      "strengthsAndWeaknesses": {
        "strengths": [
          "Good semantic alignment with ground truth",
          "Strong persona consistency with WhatsApp style"
        ],
        "weaknesses": [
          "Weak chunk retrieval - consider improving indexing",
          "Poor context retention across turns"
        ]
      }
    }
  }
}
```

## Integration with UI

To add evaluation to the frontend, after persona is created:

```javascript
async function evaluatePersona(chatText) {
  const response = await fetch("/api/persona/evaluate-whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatText })
  });
  
  if (!response.ok) {
    throw new Error("Evaluation failed");
  }
  
  return response.json();
}
```

Then display results with visual indicators:
- Scores 4-5: Green (✓ Excellent)
- Scores 3-4: Yellow (! Good)
- Scores 2-3: Orange (⚠ Weak)
- Scores 1-2: Red (✗ Poor)

## Understanding Results

### Strong Evaluation (Avg 4+)
- ✅ Persona captures target communication style well
- ✅ RAG retrieval pulls relevant context
- ✅ Responses maintain context across turns
- → Ready for production use

### Moderate Evaluation (Avg 3)
- ⚠️ Some persona style inconsistency
- ⚠️ Retrieval occasionally misses relevant chunks
- ⚠️ Occasional context gaps
- → Consider fine-tuning persona or improving knowledge base

### Weak Evaluation (Avg <2)
- ❌ Persona doesn't match expected style
- ❌ RAG struggles to find relevant information
- ❌ Multi-turn consistency problems
- → Retrain persona or improve knowledge base

## Extending the Evaluator

### Add BERTScore (Real Implementation)
Replace `calculateTokenOverlapSimilarity` with actual BERTScore:

```javascript
import { BertScore } from "@nlpjs/bert-score";

async function calculateBERTScore(generated, groundTruth) {
  const scorer = new BertScore();
  const scores = await scorer.score([generated], [groundTruth]);
  return scores.f1;
}
```

### Add Custom Metrics
Create new evaluation functions and add to the scoring system:

```javascript
function evaluateCustomMetric(reply, context) {
  // Custom logic
  return score; // 0-1
}
```

### Integrate Real-Time Evaluation
Evaluate each chat message as it's generated:

```javascript
app.post("/api/chat", async (req, res) => {
  // ... existing chat logic ...
  
  // Evaluate the generated reply
  const evaluation = evaluateSingleTestCase(
    { userMessage, groundTruthReply: userMessage }, // Simplified
    retrievedChunks,
    generatedReply
  );
  
  res.json({
    // ... reply data ...
    evaluation // Include scores in response
  });
});
```

## Best Practices

1. **Test on Representative Data** — Use actual WhatsApp exports from target users
2. **Sample Size** — Evaluate 5-10 test cases for quick assessment; 20+ for thorough analysis
3. **Iterate** — Re-evaluate after improving persona or knowledge base
4. **Monitor** — Track evaluation scores over time as system improves
5. **Context** — Remember context affects results; same question asked differently may score differently

## Limitations

- **Token-Based Retrieval** — Current system uses simple token overlap; semantic similarity is basic
- **No Multi-Modal** — Cannot evaluate images, audio, or video content
- **Limited Corpus** — Recall metric requires full knowledge base; partial corpus overestimates recall
- **Simulated Replies** — Currently uses ground truth as mock generated reply; integrate real LLM for production
- **Language Specific** — Optimized for English; multilingual support needed for other languages

## Future Improvements

- [ ] Real BERTScore integration from HuggingFace
- [ ] DeepEval framework for deeper multi-turn analysis
- [ ] Real-time evaluation dashboard
- [ ] A/B testing framework for persona variations
- [ ] Multilingual support
- [ ] Image/audio context evaluation
- [ ] Historical score tracking and trend analysis
