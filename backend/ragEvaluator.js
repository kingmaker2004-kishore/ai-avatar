/**
 * RAG Chatbot Evaluator for WhatsApp Personas
 * 
 * Evaluates retrieval quality, semantic similarity, and multi-turn consistency
 * after a WhatsApp chat is uploaded.
 */

// Helper functions (also exist in ragEngine.js)
const RAG_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it", "of", "on", "or",
  "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "why", "with", "you", "your"
]);

function normalizeForSearch(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().toLowerCase();
}

function tokenize(value) {
  const normalized = normalizeForSearch(value);
  const tokens = normalized
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !RAG_STOP_WORDS.has(token));
  return [...new Set(tokens)];
}

/**
 * Extract potential test cases from WhatsApp chat messages
 * Format: {userMessage, groundTruthReply, previousMessages}
 */
export function extractTestCasesFromChat(messages) {
  const testCases = [];
  
  for (let i = 1; i < messages.length; i++) {
    const current = messages[i];
    const previous = messages[i - 1];
    
    // We treat consecutive pairs as (userMessage, expectedReply)
    // This assumes messages alternate between parties
    if (previous && current) {
      testCases.push({
        userMessage: previous.message,
        groundTruthReply: current.message,
        sender: current.sender,
        timestamp: current.timestamp,
        previousMessages: messages.slice(Math.max(0, i - 4), i - 1) // Last 4 turns for context
      });
    }
  }
  
  return testCases;
}

/**
 * RETRIEVAL METRICS
 * Evaluate how well the RAG system retrieved relevant chunks
 */

/**
 * Calculate Precision: Of the retrieved chunks, how many were relevant?
 * Relevance is determined by token overlap with ground truth reply
 */
function calculatePrecision(retrievedChunks, groundTruthReply) {
  if (retrievedChunks.length === 0) return 0;
  
  const truthTokens = new Set(tokenize(groundTruthReply));
  const relevantCount = retrievedChunks.filter(chunk => {
    const chunkTokens = new Set(tokenize(chunk.content || ""));
    const intersection = [...truthTokens].filter(token => chunkTokens.has(token));
    return intersection.length > 0;
  }).length;
  
  return relevantCount / retrievedChunks.length;
}

/**
 * Calculate Recall: Of all potentially relevant chunks, how many were retrieved?
 * This requires knowledge of the full corpus
 */
function calculateRecall(retrievedChunks, allAvailableChunks, groundTruthReply) {
  if (allAvailableChunks.length === 0) return 0;
  
  const truthTokens = new Set(tokenize(groundTruthReply));
  
  // Find all relevant chunks in the corpus
  const relevantInCorpus = allAvailableChunks.filter(chunk => {
    const chunkTokens = new Set(tokenize(chunk.content || ""));
    const intersection = [...truthTokens].filter(token => chunkTokens.has(token));
    return intersection.length > 0;
  });
  
  if (relevantInCorpus.length === 0) return 1; // All relevant items were "retrieved" (vacuously true)
  
  // Find how many relevant items were actually retrieved
  const retrievedIds = new Set(retrievedChunks.map(c => c.id));
  const retrievedRelevant = relevantInCorpus.filter(c => retrievedIds.has(c.id)).length;
  
  return retrievedRelevant / relevantInCorpus.length;
}

/**
 * Mean Reciprocal Rank (MRR)
 * Average of reciprocal ranks of first relevant chunk
 */
function calculateMRR(retrievedChunks, groundTruthReply) {
  const truthTokens = new Set(tokenize(groundTruthReply));
  
  for (let i = 0; i < retrievedChunks.length; i++) {
    const chunk = retrievedChunks[i];
    const chunkTokens = new Set(tokenize(chunk.content || ""));
    const intersection = [...truthTokens].filter(token => chunkTokens.has(token));
    
    if (intersection.length > 0) {
      return 1 / (i + 1);
    }
  }
  
  return 0;
}

/**
 * Normalized Discounted Cumulative Gain (nDCG)
 * Position-weighted relevance score
 */
function calculateNDCG(retrievedChunks, groundTruthReply, k = 4) {
  const truthTokens = new Set(tokenize(groundTruthReply));
  
  // Calculate DCG
  let dcg = 0;
  for (let i = 0; i < Math.min(k, retrievedChunks.length); i++) {
    const chunk = retrievedChunks[i];
    const chunkTokens = new Set(tokenize(chunk.content || ""));
    const intersection = [...truthTokens].filter(token => chunkTokens.has(token));
    
    const relevance = intersection.length > 0 ? 1 : 0;
    const discount = 1 / Math.log2(i + 2);
    dcg += relevance * discount;
  }
  
  // Calculate IDCG (ideal case: all top-k results are relevant)
  let idcg = 0;
  for (let i = 0; i < Math.min(k, 1); i++) {
    const discount = 1 / Math.log2(i + 2);
    idcg += discount;
  }
  
  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * SEMANTIC SIMILARITY METRICS
 * Evaluate similarity between generated reply and ground truth
 */

/**
 * Simple token overlap similarity (poor man's BERTScore)
 * In production, use actual BERTScore from huggingface
 */
function calculateTokenOverlapSimilarity(generatedReply, groundTruthReply) {
  const genTokens = new Set(tokenize(generatedReply));
  const truthTokens = new Set(tokenize(groundTruthReply));
  
  const intersection = [...genTokens].filter(t => truthTokens.has(t)).length;
  const union = new Set([...genTokens, ...truthTokens]).size;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Approximate fluency score based on:
 * - Token count (too short = low fluency)
 * - Sentence structure (periods, questions)
 * - Punctuation balance
 */
function calculateFluencyScore(generatedReply) {
  if (!generatedReply || generatedReply.length === 0) return 0;
  
  const tokens = tokenize(generatedReply);
  const sentences = generatedReply.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Longer is better (but not too long)
  const lengthScore = Math.min(1, tokens.length / 20);
  
  // Sentence count should be reasonable
  const sentenceScore = sentences.length > 0 ? Math.min(1, sentences.length / 3) : 0;
  
  // Punctuation variety
  const hasQuestion = /\?/.test(generatedReply);
  const hasExclamation = /!/.test(generatedReply);
  const hasPeriod = /\./.test(generatedReply);
  const punctuationScore = [hasQuestion, hasExclamation, hasPeriod].filter(Boolean).length / 3;
  
  return (lengthScore * 0.4 + sentenceScore * 0.3 + punctuationScore * 0.3);
}

/**
 * MULTI-TURN CONSISTENCY METRICS
 */

/**
 * Conversation Relevancy: Is the reply relevant to the user's question?
 */
function evaluateConversationRelevancy(userMessage, generatedReply) {
  if (!userMessage || !generatedReply) return 0;
  
  const userTokens = new Set(tokenize(userMessage));
  const replyTokens = new Set(tokenize(generatedReply));
  
  const overlap = [...userTokens].filter(t => replyTokens.has(t)).length;
  const relevance = overlap / Math.max(userTokens.size, 1);
  
  return Math.min(1, relevance);
}

/**
 * Knowledge Retention: Does the reply reference earlier context?
 */
function evaluateKnowledgeRetention(generatedReply, previousMessages) {
  if (!previousMessages || previousMessages.length === 0) return 0.5;
  
  // Extract key entities/facts from previous messages
  const previousContent = previousMessages.map(m => m.message).join(" ");
  const previousTokens = new Set(tokenize(previousContent));
  
  const replyTokens = new Set(tokenize(generatedReply));
  const retained = [...previousTokens].filter(t => replyTokens.has(t) && t.length > 3).length;
  
  // Scale to 0-1
  return Math.min(1, retained / Math.max(previousTokens.size, 1));
}

/**
 * Conversation Completeness: Does the reply fully address the user's intent?
 */
function evaluateCompleteness(userMessage, generatedReply) {
  const minReplyLength = 5; // Minimum tokens for a complete answer
  const replyTokens = tokenize(generatedReply);
  
  if (replyTokens.length < minReplyLength) return 0.3;
  if (replyTokens.length < minReplyLength * 1.5) return 0.6;
  return 1.0;
}

/**
 * Role Adherence: Does the reply match the expected persona tone?
 * Checks for WhatsApp-like short messages, casual language, etc.
 */
function evaluateRoleAdherence(generatedReply, personaProfile = {}) {
  if (!generatedReply) return 0;
  
  const tokens = tokenize(generatedReply);
  
  // WhatsApp personas tend to use shorter messages
  const lengthScore = tokens.length < 30 ? 1.0 : 0.7;
  
  // Check for casual language markers
  const hasCasualMarkers = /\b(lol|haha|yeah|ok|sure|cool|nice)\b/i.test(generatedReply);
  const casualScore = hasCasualMarkers ? 1.0 : 0.7;
  
  // Check for overly formal language (bad for WhatsApp)
  const hasFormalMarkers = /\b(therefore|furthermore|thus|regarding)\b/i.test(generatedReply);
  const formalScore = hasFormalMarkers ? 0.3 : 1.0;
  
  return (lengthScore * 0.3 + casualScore * 0.4 + formalScore * 0.3);
}

/**
 * SCORING SYSTEM
 * Converts all metrics to 1-5 scale with justification
 */

function scoreRetrievalMetrics(metrics) {
  // Weighted average of retrieval scores
  const avgScore = (
    metrics.precision * 0.25 +
    metrics.recall * 0.25 +
    metrics.mrr * 0.25 +
    metrics.ndcg * 0.25
  );
  
  if (avgScore >= 0.8) return { score: 5, justification: "Excellent retrieval - chunks highly relevant" };
  if (avgScore >= 0.65) return { score: 4, justification: "Good retrieval - most chunks relevant" };
  if (avgScore >= 0.5) return { score: 3, justification: "Moderate retrieval - some relevant chunks" };
  if (avgScore >= 0.35) return { score: 2, justification: "Weak retrieval - few relevant chunks found" };
  return { score: 1, justification: "Poor retrieval - chunks mismatched to query" };
}

function scoreSemanticSimilarity(metrics) {
  // Weighted average of similarity scores
  const avgScore = (metrics.tokenOverlap * 0.4 + metrics.fluency * 0.6);
  
  if (avgScore >= 0.8) return { score: 5, justification: "Excellent semantic match and natural fluency" };
  if (avgScore >= 0.65) return { score: 4, justification: "Good similarity with fluent phrasing" };
  if (avgScore >= 0.5) return { score: 3, justification: "Moderate similarity, reasonable fluency" };
  if (avgScore >= 0.35) return { score: 2, justification: "Weak similarity, poor fluency" };
  return { score: 1, justification: "Very poor semantic match" };
}

function scoreMultiTurnMetrics(metrics) {
  // Weighted average of multi-turn scores
  const avgScore = (
    metrics.relevancy * 0.25 +
    metrics.knowledgeRetention * 0.25 +
    metrics.completeness * 0.25 +
    metrics.roleAdherence * 0.25
  );
  
  if (avgScore >= 0.8) return { score: 5, justification: "Excellent persona consistency and context awareness" };
  if (avgScore >= 0.65) return { score: 4, justification: "Good relevancy and persona alignment" };
  if (avgScore >= 0.5) return { score: 3, justification: "Moderate consistency, some context gaps" };
  if (avgScore >= 0.35) return { score: 2, justification: "Weak context retention and persona mismatch" };
  return { score: 1, justification: "Poor multi-turn consistency" };
}

/**
 * Evaluate a single test case
 */
export function evaluateSingleTestCase(testCase, retrievedChunks, generatedReply, allAvailableChunks = []) {
  // Retrieval Metrics
  const retrievalMetrics = {
    precision: calculatePrecision(retrievedChunks, testCase.groundTruthReply),
    recall: calculateRecall(retrievedChunks, allAvailableChunks, testCase.groundTruthReply),
    mrr: calculateMRR(retrievedChunks, testCase.groundTruthReply),
    ndcg: calculateNDCG(retrievedChunks, testCase.groundTruthReply)
  };
  
  // Semantic Similarity Metrics
  const semanticMetrics = {
    tokenOverlap: calculateTokenOverlapSimilarity(generatedReply, testCase.groundTruthReply),
    fluency: calculateFluencyScore(generatedReply)
  };
  
  // Multi-Turn Metrics
  const multiTurnMetrics = {
    relevancy: evaluateConversationRelevancy(testCase.userMessage, generatedReply),
    knowledgeRetention: evaluateKnowledgeRetention(generatedReply, testCase.previousMessages),
    completeness: evaluateCompleteness(testCase.userMessage, generatedReply),
    roleAdherence: evaluateRoleAdherence(generatedReply)
  };
  
  // Score conversions (1-5 scale)
  const retrievalScore = scoreRetrievalMetrics(retrievalMetrics);
  const semanticScore = scoreSemanticSimilarity(semanticMetrics);
  const multiTurnScore = scoreMultiTurnMetrics(multiTurnMetrics);
  
  return {
    testCase,
    retrievalMetrics,
    retrievalScore,
    semanticMetrics,
    semanticScore,
    multiTurnMetrics,
    multiTurnScore,
    overallScore: (retrievalScore.score + semanticScore.score + multiTurnScore.score) / 3
  };
}

/**
 * Evaluate multiple test cases and generate summary
 */
export function evaluateRagChatbot(evaluationResults) {
  if (!evaluationResults || evaluationResults.length === 0) {
    return {
      totalTests: 0,
      summary: "No test cases to evaluate"
    };
  }
  
  // Aggregate scores
  const retrievalScores = evaluationResults.map(r => r.retrievalScore.score);
  const semanticScores = evaluationResults.map(r => r.semanticScore.score);
  const multiTurnScores = evaluationResults.map(r => r.multiTurnScore.score);
  const overallScores = evaluationResults.map(r => r.overallScore);
  
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);
  
  const summary = {
    totalTests: evaluationResults.length,
    retrieval: {
      avg: parseFloat(avg(retrievalScores).toFixed(2)),
      min: min(retrievalScores),
      max: max(retrievalScores)
    },
    semantic: {
      avg: parseFloat(avg(semanticScores).toFixed(2)),
      min: min(semanticScores),
      max: max(semanticScores)
    },
    multiTurn: {
      avg: parseFloat(avg(multiTurnScores).toFixed(2)),
      min: min(multiTurnScores),
      max: max(multiTurnScores)
    },
    overall: {
      avg: parseFloat(avg(overallScores).toFixed(2)),
      min: min(overallScores),
      max: max(overallScores)
    },
    strengthsAndWeaknesses: generateSummaryInsights(evaluationResults)
  };
  
  return { summary, detailedResults: evaluationResults };
}

/**
 * Generate human-readable insights
 */
function generateSummaryInsights(results) {
  const strengths = [];
  const weaknesses = [];
  
  // Analyze retrieval performance
  const avgPrecision = results.reduce((sum, r) => sum + r.retrievalMetrics.precision, 0) / results.length;
  if (avgPrecision >= 0.7) {
    strengths.push("Strong chunk retrieval accuracy");
  } else {
    weaknesses.push("Weak chunk retrieval - consider improving indexing");
  }
  
  // Analyze semantic similarity
  const avgTokenOverlap = results.reduce((sum, r) => sum + r.semanticMetrics.tokenOverlap, 0) / results.length;
  if (avgTokenOverlap >= 0.6) {
    strengths.push("Good semantic alignment with ground truth");
  } else {
    weaknesses.push("Low semantic similarity - responses diverge from expected");
  }
  
  // Analyze fluency
  const avgFluency = results.reduce((sum, r) => sum + r.semanticMetrics.fluency, 0) / results.length;
  if (avgFluency >= 0.7) {
    strengths.push("Natural and fluent response generation");
  } else {
    weaknesses.push("Response fluency needs improvement");
  }
  
  // Analyze relevancy
  const avgRelevancy = results.reduce((sum, r) => sum + r.multiTurnMetrics.relevancy, 0) / results.length;
  if (avgRelevancy >= 0.7) {
    strengths.push("Responses stay relevant to user queries");
  } else {
    weaknesses.push("Responses often miss user intent");
  }
  
  // Analyze knowledge retention
  const avgRetention = results.reduce((sum, r) => sum + r.multiTurnMetrics.knowledgeRetention, 0) / results.length;
  if (avgRetention >= 0.6) {
    strengths.push("Good context memory from previous turns");
  } else {
    weaknesses.push("Poor context retention across turns");
  }
  
  // Analyze role adherence
  const avgAdherence = results.reduce((sum, r) => sum + r.multiTurnMetrics.roleAdherence, 0) / results.length;
  if (avgAdherence >= 0.7) {
    strengths.push("Strong persona consistency with WhatsApp style");
  } else {
    weaknesses.push("Persona tone doesn't match expected style");
  }
  
  return { strengths, weaknesses };
}
