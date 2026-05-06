#!/usr/bin/env node

/**
 * RAG Evaluator Test Script
 * 
 * Demonstrates the evaluation system with sample WhatsApp chat data
 * Run with: node backend/evalTestDemo.js
 */

import {
  extractTestCasesFromChat,
  evaluateSingleTestCase,
  evaluateRagChatbot
} from "./ragEvaluator.js";

// Sample WhatsApp chat data for testing
const SAMPLE_CHAT = `
[1/15, 9:30 AM] Person A: Hey, did you get the report?
[1/15, 9:35 AM] Person B: Yes, reviewing it now. Will send feedback by EOD.
[1/15, 10:15 AM] Person A: Thanks! Let me know if you need any clarifications.
[1/15, 3:45 PM] Person B: Looks good overall. Few questions on section 3.
[1/15, 3:50 PM] Person A: Sure, happy to clarify. What's the question?
[1/15, 4:00 PM] Person B: The methodology in section 3.2 seems unclear. Can you walk through it?
[1/15, 4:15 PM] Person A: Of course. Basically we're using a two-step validation process.
[1/15, 4:20 PM] Person B: Got it. Makes sense now. When can we present this?
[1/15, 4:25 PM] Person A: Next week works for me. Maybe Tuesday?
[1/15, 4:30 PM] Person B: Tuesday is perfect. I'll set up the meeting.
`;

// Mock function to simulate RAG chunk retrieval
function mockRetrieveChunks(query) {
  const chunks = [
    {
      id: "chunk1",
      content: "The validation process involves multiple stages of review",
      score: 0.85
    },
    {
      id: "chunk2",
      content: "Feedback can be provided within business hours",
      score: 0.72
    },
    {
      id: "chunk3",
      content: "Meeting scheduling is done through calendar invites",
      score: 0.65
    }
  ];
  return chunks.filter(c => c.score > 0.6);
}

// Mock function to simulate LLM reply generation
function mockGenerateReply(userMessage, context) {
  // Simulate a reasonably good reply that somewhat matches the expected response
  const replies = {
    "did you get the report": "Yeah I got it. Looking through it now.",
    "Let me know if you need any clarifications": "Will do, should have comments soon.",
    "The methodology in section 3.2 seems unclear": "Sure thing, it uses a two-step validation approach.",
    "When can we present this": "Next week would work, maybe Tuesday?"
  };
  
  for (const [key, reply] of Object.entries(replies)) {
    if (userMessage.toLowerCase().includes(key)) {
      return reply;
    }
  }
  
  return "Got it, thanks for the info.";
}

/**
 * Run evaluation demo
 */
function runEvaluationDemo() {
  console.log("=".repeat(70));
  console.log("RAG CHATBOT EVALUATOR DEMO");
  console.log("=".repeat(70));
  console.log("");

  // Step 1: Parse and extract test cases
  console.log("📊 STEP 1: Extracting test cases from WhatsApp chat...");
  
  // Simple chat parser (mock - in real code this uses parseWhatsAppChat)
  const mockParsedMessages = [
    { message: "Hey, did you get the report?", sender: "Person A", timestamp: "1/15, 9:30 AM" },
    { message: "Yes, reviewing it now. Will send feedback by EOD.", sender: "Person B", timestamp: "1/15, 9:35 AM" },
    { message: "Thanks! Let me know if you need any clarifications.", sender: "Person A", timestamp: "1/15, 10:15 AM" },
    { message: "Looks good overall. Few questions on section 3.", sender: "Person B", timestamp: "1/15, 3:45 PM" },
    { message: "Sure, happy to clarify. What's the question?", sender: "Person A", timestamp: "1/15, 3:50 PM" },
    { message: "The methodology in section 3.2 seems unclear. Can you walk through it?", sender: "Person B", timestamp: "1/15, 4:00 PM" },
    { message: "Of course. Basically we're using a two-step validation process.", sender: "Person A", timestamp: "1/15, 4:15 PM" },
    { message: "Got it. Makes sense now. When can we present this?", sender: "Person B", timestamp: "1/15, 4:20 PM" },
    { message: "Next week works for me. Maybe Tuesday?", sender: "Person A", timestamp: "1/15, 4:25 PM" },
    { message: "Tuesday is perfect. I'll set up the meeting.", sender: "Person B", timestamp: "1/15, 4:30 PM" }
  ];
  
  const testCases = extractTestCasesFromChat(mockParsedMessages);
  console.log(`✓ Extracted ${testCases.length} test cases\n`);
  
  // Step 2: Evaluate sample test cases
  console.log("⚙️  STEP 2: Evaluating test cases...\n");
  
  const evaluationResults = [];
  const sampleSize = Math.min(3, testCases.length);
  
  for (let i = 0; i < sampleSize; i++) {
    const testCase = testCases[i];
    console.log(`\n▶ Test Case ${i + 1}: "${testCase.userMessage}"`);
    console.log(`  Ground Truth: "${testCase.groundTruthReply}"`);
    
    // Simulate RAG retrieval and LLM generation
    const retrievedChunks = mockRetrieveChunks(testCase.userMessage);
    const generatedReply = mockGenerateReply(testCase.userMessage, null);
    
    console.log(`  Generated Reply: "${generatedReply}"`);
    console.log(`  Retrieved ${retrievedChunks.length} chunks`);
    
    // Evaluate
    const result = evaluateSingleTestCase(
      testCase,
      retrievedChunks,
      generatedReply,
      [] // allAvailableChunks
    );
    
    evaluationResults.push(result);
    
    console.log(`  📈 Retrieval Score: ${result.retrievalScore.score}/5 (${result.retrievalScore.justification})`);
    console.log(`  📝 Semantic Score: ${result.semanticScore.score}/5 (${result.semanticScore.justification})`);
    console.log(`  💬 Multi-Turn Score: ${result.multiTurnScore.score}/5 (${result.multiTurnScore.justification})`);
    console.log(`  ⭐ Overall: ${result.overallScore.toFixed(1)}/5`);
  }
  
  // Step 3: Generate summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 EVALUATION SUMMARY");
  console.log("=".repeat(70) + "\n");
  
  const { summary } = evaluateRagChatbot(evaluationResults);
  
  console.log(`Total Test Cases Evaluated: ${summary.totalTests}`);
  console.log("");
  
  console.log("RETRIEVAL METRICS:");
  console.log(`  Average: ${summary.retrieval.avg.toFixed(2)}/5`);
  console.log(`  Range: ${summary.retrieval.min} - ${summary.retrieval.max}`);
  console.log("");
  
  console.log("SEMANTIC SIMILARITY:");
  console.log(`  Average: ${summary.semantic.avg.toFixed(2)}/5`);
  console.log(`  Range: ${summary.semantic.min} - ${summary.semantic.max}`);
  console.log("");
  
  console.log("MULTI-TURN CONSISTENCY:");
  console.log(`  Average: ${summary.multiTurn.avg.toFixed(2)}/5`);
  console.log(`  Range: ${summary.multiTurn.min} - ${summary.multiTurn.max}`);
  console.log("");
  
  console.log("OVERALL SCORE:");
  console.log(`  Average: ${summary.overall.avg.toFixed(2)}/5`);
  console.log(`  Range: ${summary.overall.min} - ${summary.overall.max}`);
  console.log("");
  
  console.log("STRENGTHS:");
  summary.strengthsAndWeaknesses.strengths.forEach(s => {
    console.log(`  ✓ ${s}`);
  });
  console.log("");
  
  console.log("WEAKNESSES:");
  summary.strengthsAndWeaknesses.weaknesses.forEach(w => {
    console.log(`  ✗ ${w}`);
  });
  
  console.log("\n" + "=".repeat(70));
  console.log("Interpretation Guide:");
  console.log("  4.0+ : Excellent - Ready for production");
  console.log("  3.0-4.0 : Good - Minor improvements suggested");
  console.log("  2.0-3.0 : Fair - Significant improvements needed");
  console.log("  <2.0 : Poor - Major retrain or data improvements needed");
  console.log("=".repeat(70) + "\n");
}

// Run the demo
runEvaluationDemo();
