# RAG Evaluation System - Quick Start Guide

The AI Avatar now includes **automatic evaluation** of the RAG chatbot after uploading a WhatsApp chat!

## What Gets Evaluated?

When you upload a WhatsApp chat and create a persona, the system automatically evaluates:

### 📊 Three Dimensions:

1. **Retrieval Quality** (1-5 score)
   - Are relevant chunks being pulled from the knowledge base?
   - Measures: Precision, Recall, MRR, nDCG

2. **Semantic Similarity** (1-5 score)
   - Does the generated reply match the expected ground truth?
   - Measures: Token overlap, Fluency

3. **Multi-Turn Consistency** (1-5 score)
   - Does the reply stay relevant across conversation turns?
   - Does it remember context from earlier messages?
   - Measures: Relevancy, Knowledge Retention, Completeness, Role Adherence

## How It Works

```
1. Upload WhatsApp .txt export
           ↓
2. Select persona to mimic
           ↓
3. System extracts test cases (user message → expected reply pairs)
           ↓
4. For each test case:
   - Retrieve relevant chunks from knowledge base
   - Generate reply using persona + context
   - Compare with ground truth reply
           ↓
5. Aggregate scores into report
           ↓
6. Display evaluation results with:
   - Overall score (1-5)
   - Breakdown by metric
   - Strengths & weaknesses
   - Recommendations
```

## Score Interpretation

**5.0 - Excellent** ✅
- Persona perfectly captures communication style
- Responses maintain context across turns
- Ready for production use

**4.0-5.0 - Good** ⭐
- Persona generally matches expected style
- Minor inconsistencies in context
- Good for most use cases

**3.0-4.0 - Moderate** 📊
- Persona captured but some style mismatch
- Occasional context gaps
- Improvements suggested

**2.0-3.0 - Fair** ⚠️
- Significant persona inconsistency
- Retrieval or context issues
- Major improvements needed

**<2.0 - Poor** ❌
- Persona doesn't match expected style
- Retrieval struggles to find relevant info
- Retrain recommended

## Using the Evaluation

### In the UI

1. **Upload Chat** → Select persona → Wait for evaluation
2. **View Results** → Modal shows detailed breakdown
3. **Review Recommendations** → Follow suggestions for improvements
4. **Re-evaluate** → Upload improved chat to see progress

### Via API

```bash
curl -X POST http://localhost:5000/api/persona/evaluate-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "chatText": "[WhatsApp chat export text here]"
  }'
```

### Test It Locally

```bash
cd backend
node evalTestDemo.js
```

This runs a demo evaluation on sample chat data and shows you the output format.

## What the Scores Tell You

### High Retrieval Score (4+)
- ✓ Knowledge base is well-indexed
- ✓ RAG system finds relevant chunks
- → Keep your RAG chunks concise and relevant

### Low Retrieval Score (< 3)
- ✗ Chunks may be poorly indexed
- ✗ Query terms don't match chunk content
- → Review and reorganize knowledge base
- → Add more diverse keywords to chunks

### High Semantic Score (4+)
- ✓ LLM generates replies similar to ground truth
- ✓ Tone and style are appropriate
- → Persona is well-trained

### Low Semantic Score (< 3)
- ✗ Generated replies diverge from expected
- ✗ Style/tone mismatch
- → Re-train persona with more representative samples
- → Check if persona name is correctly selected

### High Multi-Turn Score (4+)
- ✓ Bot remembers conversation context
- ✓ Replies stay relevant across turns
- ✓ Persona consistency maintained

### Low Multi-Turn Score (< 3)
- ✗ Context memory issues
- ✗ Replies sometimes miss the point
- ✗ Tone inconsistency
- → Add more conversation history to prompts
- → Verify conversation context is being passed

## Next Steps

### For Better Evaluation Results:

1. **Larger Chat Sample**
   - Use 20+ minute WhatsApp exports (not just 5 messages)
   - Includes natural variations in tone and style

2. **Diverse Content**
   - Include various conversation types
   - Mix casual chat with structured discussions

3. **Clear Personalities**
   - Select personas with distinct communication styles
   - Avoid ambiguous or generic speakers

### To Improve Your Persona Score:

**If Retrieval is Low:**
- Expand your knowledge base
- Add more relevant documents/chunks
- Use clearer, more specific chunk titles

**If Semantic Similarity is Low:**
- Retrain persona with different chat sample
- Ensure correct person is selected
- Check that persona profile captures their style

**If Multi-Turn Consistency is Low:**
- Add more conversation context to system prompt
- Increase conversation history window
- Verify previous messages are being retrieved

## Architecture

```
Backend:
├── ragEvaluator.js          ← Core evaluation logic
├── server.js               ← /api/persona/evaluate-whatsapp endpoint
└── evalTestDemo.js         ← Test/demo script

Frontend:
├── EvaluationResults.tsx    ← UI component (see docs/EVALUATION_FRONTEND.md)
└── evaluation.css           ← Styling

Documentation:
├── EVALUATION.md            ← Detailed framework explanation
├── EVALUATION_FRONTEND.md   ← Frontend integration guide
└── QUICKSTART.md           ← This file
```

## Troubleshooting

**"No test cases found"**
- Upload chat must have at least 4+ messages
- Messages must alternate between people

**"Failed to evaluate RAG chatbot"**
- Check server logs: `cd backend && npm start`
- Verify API is running on localhost:5000

**Scores seem low despite good chat**
- Current implementation uses token overlap (not real BERTScore)
- Integrate HuggingFace BERTScore for better results
- See docs/EVALUATION.md for improvements section

**Want real LLM integration?**
- Current system uses mock replies for demo
- To use real LLM: Update `evaluateRagChatbot()` to call actual LLM
- See docs/EVALUATION.md § "Extending the Evaluator"

## Full Documentation

- **[EVALUATION.md](./EVALUATION.md)** — Technical details on all metrics
- **[EVALUATION_FRONTEND.md](./EVALUATION_FRONTEND.md)** — React component guide
- **[API.md](./API.md)** — Backend endpoint reference

## Key Features

✅ **Automatic** — Runs right after persona creation  
✅ **Comprehensive** — Measures retrieval, semantic, and multi-turn quality  
✅ **Actionable** — Provides specific strengths and weaknesses  
✅ **Extensible** — Easy to add BERTScore, DeepEval, or custom metrics  
✅ **Fast** — Evaluates sample of test cases (not entire chat)  
✅ **No Dependencies** — Works with existing RAG system  

## Examples

### Example 1: Perfect Score

```json
{
  "overall": { "avg": 4.8 },
  "strengths": [
    "Excellent retrieval accuracy",
    "Strong semantic alignment with ground truth",
    "Excellent persona consistency"
  ],
  "weaknesses": []
}
→ Ready for production!
```

### Example 2: Needs Improvement

```json
{
  "overall": { "avg": 2.5 },
  "strengths": [
    "Good persona tone consistency"
  ],
  "weaknesses": [
    "Weak chunk retrieval",
    "Low semantic similarity",
    "Poor context retention"
  ]
}
→ Retrain persona with larger sample
→ Expand knowledge base
→ Add more conversation context
```

---

**Next:** See [EVALUATION_FRONTEND.md](./EVALUATION_FRONTEND.md) to integrate the UI component.
