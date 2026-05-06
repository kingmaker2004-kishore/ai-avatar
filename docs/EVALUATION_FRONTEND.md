# Frontend Integration Guide for RAG Evaluation

This guide explains how to integrate the RAG evaluation system into the React frontend.

## Step 1: Add Evaluation UI Component

Create a new file: `src/EvaluationResults.tsx`

```typescript
import React from "react";
import "./evaluation.css";

interface EvaluationScore {
  avg: number;
  min: number;
  max: number;
}

interface Evaluation {
  personaName: string;
  totalMessagesAnalyzed: number;
  testCasesGenerated: number;
  testCasesEvaluated: number;
  summary: {
    totalTests: number;
    retrieval: EvaluationScore;
    semantic: EvaluationScore;
    multiTurn: EvaluationScore;
    overall: EvaluationScore;
    strengthsAndWeaknesses: {
      strengths: string[];
      weaknesses: string[];
    };
  };
}

function getScoreColor(score: number): string {
  if (score >= 4) return "#4CAF50"; // Green
  if (score >= 3) return "#FFC107"; // Yellow
  if (score >= 2) return "#FF9800"; // Orange
  return "#F44336"; // Red
}

function getScoreLabel(score: number): string {
  if (score >= 4) return "Excellent";
  if (score >= 3) return "Good";
  if (score >= 2) return "Fair";
  return "Poor";
}

export function EvaluationResults({ evaluation }: { evaluation: Evaluation }) {
  if (!evaluation) {
    return null;
  }

  const { summary } = evaluation;
  const overallScore = summary.overall.avg;

  return (
    <div className="evaluation-container">
      <div className="evaluation-header">
        <h2>🎯 Persona Evaluation Results</h2>
        <p className="evaluation-subtitle">
          Evaluation for <strong>{evaluation.personaName}</strong>
        </p>
      </div>

      {/* Overall Score Card */}
      <div className="score-card overall">
        <div className="score-display">
          <div
            className="score-circle"
            style={{ borderColor: getScoreColor(overallScore) }}
          >
            <span className="score-value">{overallScore.toFixed(1)}</span>
            <span className="score-max">/5</span>
          </div>
          <div className="score-info">
            <h3>{getScoreLabel(overallScore)}</h3>
            <p>
              {overallScore >= 4
                ? "✅ Ready for production use"
                : overallScore >= 3
                ? "⚠️ Good, minor improvements suggested"
                : overallScore >= 2
                ? "🔧 Fair, significant improvements needed"
                : "❌ Poor, major retraining needed"}
            </p>
          </div>
        </div>

        <div className="metadata">
          <span>{evaluation.totalMessagesAnalyzed} messages analyzed</span>
          <span>{evaluation.testCasesGenerated} test cases generated</span>
          <span>{evaluation.testCasesEvaluated} cases evaluated</span>
        </div>
      </div>

      {/* Metric Scores */}
      <div className="metrics-grid">
        <MetricCard
          title="Retrieval Quality"
          score={summary.retrieval.avg}
          range={`${summary.retrieval.min} - ${summary.retrieval.max}`}
          description="How well chunks are retrieved"
        />
        <MetricCard
          title="Semantic Similarity"
          score={summary.semantic.avg}
          range={`${summary.semantic.min} - ${summary.semantic.max}`}
          description="Reply semantic match to ground truth"
        />
        <MetricCard
          title="Multi-Turn Consistency"
          score={summary.multiTurn.avg}
          range={`${summary.multiTurn.min} - ${summary.multiTurn.max}`}
          description="Context awareness & persona consistency"
        />
      </div>

      {/* Strengths & Weaknesses */}
      <div className="insights-container">
        <div className="insights-section strengths">
          <h3>✅ Strengths</h3>
          <ul>
            {summary.strengthsAndWeaknesses.strengths.map((strength, i) => (
              <li key={i}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="insights-section weaknesses">
          <h3>⚠️ Areas for Improvement</h3>
          <ul>
            {summary.strengthsAndWeaknesses.weaknesses.map((weakness, i) => (
              <li key={i}>{weakness}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations">
        <h3>💡 Recommendations</h3>
        {overallScore >= 4 ? (
          <p>Your persona is performing excellently! Continue monitoring with periodic re-evaluations.</p>
        ) : overallScore >= 3 ? (
          <ul>
            <li>Review retrieved chunks to ensure knowledge base quality</li>
            <li>Fine-tune persona to better match expected tone</li>
            <li>Add more conversation context to improve multi-turn consistency</li>
          </ul>
        ) : (
          <ul>
            <li>Retrain persona with larger, more representative chat sample</li>
            <li>Expand and improve knowledge base chunks</li>
            <li>Review and adjust RAG retrieval parameters</li>
          </ul>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  score: number;
  range: string;
  description: string;
}

function MetricCard({ title, score, range, description }: MetricCardProps) {
  const color = getScoreColor(score);

  return (
    <div className="metric-card">
      <div className="metric-header">
        <h4>{title}</h4>
        <span className="metric-range">{range}</span>
      </div>

      <div className="metric-bar">
        <div
          className="metric-fill"
          style={{
            width: `${(score / 5) * 100}%`,
            backgroundColor: color
          }}
        />
      </div>

      <div className="metric-score">
        <span className="metric-value" style={{ color }}>
          {score.toFixed(2)}/5
        </span>
        <span className="metric-label">{getScoreLabel(score)}</span>
      </div>

      <p className="metric-description">{description}</p>
    </div>
  );
}
```

## Step 2: Add CSS Styling

Create: `src/evaluation.css`

```css
.evaluation-container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.evaluation-header {
  margin-bottom: 2rem;
}

.evaluation-header h2 {
  font-size: 1.8rem;
  margin: 0 0 0.5rem 0;
  color: #333;
}

.evaluation-subtitle {
  color: #666;
  margin: 0;
  font-size: 0.95rem;
}

/* Overall Score Card */
.score-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  border-left: 4px solid #4CAF50;
}

.score-card.overall {
  border-left-color: currentColor;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
}

.score-max {
  font-size: 0.9rem;
  color: #999;
}

.score-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  color: #333;
}

.score-info p {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.metadata {
  display: flex;
  gap: 2rem;
  padding: 1rem 0;
  border-top: 1px solid #eee;
  font-size: 0.9rem;
  color: #666;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.metric-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.metric-range {
  font-size: 0.8rem;
  color: #999;
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.metric-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.metric-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.metric-score {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-weight: bold;
  font-size: 1.1rem;
}

.metric-label {
  font-size: 0.85rem;
  color: #666;
}

.metric-description {
  margin: 0;
  font-size: 0.85rem;
  color: #999;
}

/* Insights */
.insights-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.insights-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.insights-section.weaknesses {
  border-left-color: #FF9800;
}

.insights-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
}

.insights-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.insights-section li {
  padding: 0.5rem 0;
  color: #666;
  font-size: 0.95rem;
}

.insights-section li:before {
  content: "✓ ";
  color: #4CAF50;
  margin-right: 0.5rem;
  font-weight: bold;
}

.insights-section.weaknesses li:before {
  content: "⚠ ";
  color: #FF9800;
}

/* Recommendations */
.recommendations {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #2196F3;
}

.recommendations h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
}

.recommendations ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #666;
}

.recommendations li {
  margin-bottom: 0.5rem;
}

.recommendations p {
  margin: 0;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .evaluation-container {
    padding: 1rem;
  }

  .score-display {
    flex-direction: column;
    text-align: center;
  }

  .metadata {
    flex-direction: column;
    gap: 0.5rem;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .insights-container {
    grid-template-columns: 1fr;
  }
}
```

## Step 3: Integrate into PersonaSetup Component

Update `src/PersonaSetup.tsx` to trigger evaluation after persona is configured:

```typescript
// After persona is successfully created:
const handlePersonaCreated = async (persona) => {
  // ... existing code ...
  
  // Trigger evaluation
  try {
    const evalResponse = await fetch("/api/persona/evaluate-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatText: rawChatText })
    });
    
    if (evalResponse.ok) {
      const evalData = await evalResponse.json();
      setEvaluationResults(evalData.evaluation);
      setShowEvaluation(true);
    }
  } catch (error) {
    console.warn("Evaluation failed (non-critical):", error);
  }
};
```

## Step 4: Display Evaluation Modal

Add to the UI after persona creation:

```typescript
{showEvaluation && evaluationResults && (
  <div className="modal">
    <div className="modal-content">
      <button className="close-button" onClick={() => setShowEvaluation(false)}>×</button>
      <EvaluationResults evaluation={evaluationResults} />
    </div>
  </div>
)}
```

## Usage Flow

1. **User uploads WhatsApp chat** → System parses and creates persona
2. **Persona is created** → System automatically runs evaluation
3. **Evaluation completes** → Results displayed in modal/panel
4. **User sees scores** → Understands persona quality before using
5. **Optional: Re-evaluate** → After improvements, re-run evaluation

## Customizing Evaluation Display

### Show/Hide Sections

```typescript
<EvaluationResults
  evaluation={evaluation}
  showMetrics={true}
  showInsights={true}
  showRecommendations={true}
/>
```

### Custom Color Scheme

Modify `evaluation.css`:

```css
/* Change from green to custom brand color */
.score-card { border-left-color: #your-color; }
.metric-fill { background-color: #your-color; }
```

### Export Results

```typescript
function exportEvaluation(evaluation: Evaluation) {
  const report = {
    personaName: evaluation.personaName,
    date: new Date().toISOString(),
    scores: evaluation.summary,
    metadata: {
      messagesAnalyzed: evaluation.totalMessagesAnalyzed,
      testCases: evaluation.testCasesEvaluated
    }
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

## Testing the Integration

1. Upload a WhatsApp chat export
2. Select a persona
3. Wait for evaluation to complete
4. View results in modal
5. Check console for any errors

## Troubleshooting

**Evaluation not showing:**
- Check browser console for errors
- Verify `/api/persona/evaluate-whatsapp` endpoint responds
- Ensure chat parsing extracted test cases

**Scores seem off:**
- Remember: scores use token-overlap similarity (not real BERTScore)
- Mock LLM replies affect semantic similarity scores
- Integrate real LLM for production-ready evaluation

**Performance issues:**
- Limit evaluation to 5-10 test cases
- Run evaluation in background worker
- Cache evaluation results

## Next Steps

1. Integrate real BERTScore from HuggingFace
2. Add real LLM integration (currently uses mock)
3. Implement historical score tracking
4. Create comparison view for before/after improvements
5. Add A/B testing framework
