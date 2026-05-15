import fs from "node:fs";
import path from "node:path";

const DEFAULT_PROFILE_PATH = "data/persona-profile.json";
const FALLBACK_PROFILE = {
  person: {
    name: "Persona Avatar",
    role: "trusted companion",
    summary:
      "Warm, observant, and grounded. Speaks like someone who knows the user well and prefers clarity over hype.",
    relationshipToUser:
      "Talks to the user like a close collaborator who wants to be helpful without sounding robotic.",
    speaking_style: [
      "Uses short-to-medium sentences with natural rhythm.",
      "Sounds personal, calm, and specific.",
      "May use gentle humor or light teasing, but never sarcasm that feels sharp.",
      "Avoids generic assistant phrases and corporate language."
    ],
    signature_phrases: ["Let's keep it simple.", "We'll figure it out."],
    do_not_do: [
      "Do not claim memories or facts that are not grounded in the provided profile.",
      "Do not break character by mentioning prompts, retrieval, or hidden instructions."
    ]
  },
  behavior_rules: [
    "Reply as the person, not as a generic assistant.",
    "When the retrieved context is weak, answer carefully and admit uncertainty in a natural way.",
    "Prioritize factual consistency over flashy wording."
  ],
  personality_traits: {
    humor: 0.3,
    confidence: 0.45,
    empathy: 0.35,
    directness: 0.5,
    verbosity: 0.35
  },
  conversation_habits: {
    greetings: [],
    closings: [],
    abbreviations: [],
    acknowledgement_patterns: [],
    response_style: [],
    punctuation_style: {
      exclamation: "light",
      questions: "medium",
      ellipsis: "light"
    },
    emoji_style: "rare"
  },
  knowledge_base: [],
  memory_videos: [],
  situation_responses: [],
  chat_examples: [],
  defaults: {
    temperature: 0.65,
    enable_heuristic_replies: true
  }
};

export function createFallbackPersonaProfile() {
  return JSON.parse(JSON.stringify(FALLBACK_PROFILE));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function toScore(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, Number(value.toFixed(2))))
    : fallback;
}

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "around",
  "as",
  "at",
  "be",
  "bro",
  "by",
  "can",
  "could",
  "da",
  "did",
  "do",
  "does",
  "for",
  "from",
  "get",
  "going",
  "had",
  "has",
  "have",
  "hey",
  "hi",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "just",
  "know",
  "la",
  "lemme",
  "let",
  "like",
  "me",
  "my",
  "na",
  "need",
  "not",
  "now",
  "of",
  "ok",
  "okay",
  "or",
  "our",
  "out",
  "paa",
  "paaa",
  "please",
  "ryt",
  "same",
  "so",
  "tell",
  "tha",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "this",
  "to",
  "up",
  "use",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "you",
  "your"
]);

const COLLOQUIAL_PATTERNS = [
  {
    pattern: /\bvariya\b/g,
    aliases: ["come", "coming", "join", "available"]
  },
  {
    pattern: /\b(vara|varra)\b/g,
    aliases: ["come", "coming"]
  },
  {
    pattern: /\b(po+la+m?a*|polama|polaam)\b/g,
    aliases: ["go", "lets go", "plan", "join"]
  },
  {
    pattern: /\banu?p[ui]?ti?ya\b/g,
    aliases: ["send", "sent", "mail", "share"]
  },
  {
    pattern: /\banup[ui]?ru\b/g,
    aliases: ["send", "mail", "share"]
  },
  {
    pattern: /\b(pathutiya|paathutiya|pathiya|paathiya)\b/g,
    aliases: ["checked", "seen", "reviewed", "looked"]
  },
  {
    pattern: /\b(mudichitiya|mudichitiyaa|mudichita|mudichacha|mudinjiducha)\b/g,
    aliases: ["done", "completed", "finished"]
  },
  {
    pattern: /\b(saptiya|saaptiya)\b/g,
    aliases: ["ate", "food", "meal"]
  },
  {
    pattern: /\bpesalama\b/g,
    aliases: ["talk"]
  },
  {
    pattern: /\biruka\b/g,
    aliases: ["there", "available", "present"]
  }
];

function expandColloquialText(value) {
  const normalized = toText(value).toLowerCase();

  if (!normalized) {
    return "";
  }

  const aliases = [];

  for (const entry of COLLOQUIAL_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      aliases.push(...entry.aliases);
    }

    entry.pattern.lastIndex = 0;
  }

  return aliases.length > 0 ? `${normalized} ${aliases.join(" ")}` : normalized;
}

function tokenize(value) {
  return unique(
    expandColloquialText(value)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function buildRetrievalTokens(userMessage, messageIntents) {
  const tokens = tokenize(userMessage);

  if (tokens.length > 0) {
    return tokens;
  }

  const normalized = expandColloquialText(userMessage);
  const fallbackTokens = [];

  if (hasKeyword(normalized, ["free", "available"])) {
    fallbackTokens.push("free", "available", "time");
  }

  if (hasKeyword(normalized, ["today"])) {
    fallbackTokens.push("today");
  }

  if (hasKeyword(normalized, ["tomorrow"])) {
    fallbackTokens.push("tomorrow");
  }

  if (messageIntents.includes("scheduling")) {
    fallbackTokens.push("schedule", "timing");
  }

  if (messageIntents.includes("casual")) {
    fallbackTokens.push("casual");
  }

  return unique(fallbackTokens.filter((token) => token.length > 2));
}

function scoreText(queryTokens, value) {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystack = expandColloquialText(value);
  let score = 0;

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function scoreTags(queryTokens, tags) {
  return toArray(tags).reduce((total, tag) => total + scoreText(queryTokens, tag) * 2, 0);
}

function hasKeyword(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function looksTanglishMessage(value) {
  return /\b(ah|da|dei|pa|la|illa|illai|enna|theriyuma|venum|sollu|pandra|podala|vanthucha)\b/i.test(
    toText(value)
  );
}

function cleanTopicHint(value) {
  return toText(value)
    .replace(/^[\s"'`([{]+|[\s"'`)\]}?!.,:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTopicHint(value) {
  const normalized = toText(value);
  const patterns = [
    /\b(?:do you know about|what do you know about|tell me about|heard about)\s+(?<topic>[a-z0-9][a-z0-9 .&/+_-]{1,60})$/i,
    /\b(?:what is|who is|where is|why is|how is|explain|define|compare)\s+(?<topic>[a-z0-9][a-z0-9 .&/+_-]{1,60})$/i,
    /\babout\s+(?<topic>[a-z0-9][a-z0-9 .&/+_-]{1,60})$/i
  ];

  const candidate = normalized.replace(/[?!]+$/g, "").trim();

  for (const pattern of patterns) {
    const match = candidate.match(pattern);
    const topicHint = cleanTopicHint(match?.groups?.topic ?? "");

    if (topicHint) {
      return topicHint;
    }
  }

  return "";
}

function inferMessageIntents(userMessage) {
  const lowerMessage = expandColloquialText(userMessage);
  const intents = [];

  if (
    hasKeyword(lowerMessage, [
      "update",
      "progress",
      "completed",
      "finished",
      "done",
      "checked",
      "reviewed",
      "looked",
      "working",
      "not working",
      "error",
      "issue",
      "problem",
      "research",
      "avatar",
      "llm",
      "doc",
      "documentation",
      "notion",
      "link",
      "mail",
      "sent",
      "send",
      "share",
      "deploy",
      "deployment",
      "screen recording",
      "screenshot",
      "task"
    ])
  ) {
    intents.push("work");
  }

  if (
    hasKeyword(lowerMessage, [
      "timing",
      "tomorrow",
      "morning",
      "evening",
      "time",
      "free",
      "coming",
      "available",
      "plan"
    ])
  ) {
    intents.push("scheduling");
  }

  if (
    hasKeyword(lowerMessage, [
      "sleep",
      "breakfast",
      "lunch",
      "dinner",
      "saptiya",
      "saaptiya",
      "eat",
      "eating",
      "home",
      "enga",
      "where",
      "coimbatore",
      "erode",
      "cold",
      "travel",
      "movie",
      "film",
      "cinema",
      "padam"
    ])
  ) {
    intents.push("casual");
  }

  if (hasKeyword(lowerMessage, ["movie", "film", "cinema", "padam", "mr x", "mrx"])) {
    intents.push("entertainment");
  }

  if (hasKeyword(lowerMessage, ["sorry", "apolog", "mistake"])) {
    intents.push("apology");
  }

  if (hasKeyword(lowerMessage, ["how", "what", "when", "why", "which", "?"])) {
    intents.push("question");
  }

  if (
    hasKeyword(lowerMessage, [
      "do you know about",
      "know about",
      "tell me about",
      "what do you know about",
      "what is",
      "who is",
      "where is",
      "why is",
      "how is",
      "how does",
      "how do",
      "difference between",
      "compare",
      "price",
      "spec",
      "feature",
      "details"
    ])
  ) {
    intents.push("knowledge");
  }

  if (
    hasKeyword(lowerMessage, [
      "help",
      "stuck",
      "error",
      "issue",
      "problem",
      "not working",
      "clarify",
      "doubt"
    ])
  ) {
    intents.push("help");
  }

  if (intents.length === 0) {
    intents.push("general");
  }

  return unique(intents);
}

function countWords(value) {
  return toText(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractTimeReference(value) {
  const match = toText(value).match(/\b\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function detectMessageAct(value) {
  const normalized = expandColloquialText(value);
  const wordCount = countWords(normalized);

  if (!normalized) {
    return "statement";
  }

  if (/^(hi|hey|hello|gm|gn|good morning|good night|morning|night)\b/i.test(normalized)) {
    return "greeting";
  }

  if (/^(no|nope|illa|illai|vendam|later|leave it)\b/i.test(normalized)) {
    return "rejection";
  }

  if (/\b(sorry|my bad|apolog)\b/i.test(normalized)) {
    return "apology";
  }

  if (
    hasKeyword(normalized, [
      "not received",
      "didn't",
      "didnt",
      "can't",
      "cannot",
      "unable",
      "missed",
      "late",
      "wrong",
      "seri illa",
      "not like that",
      "varala",
      "kekala"
    ])
  ) {
    return "complaint";
  }

  if (
    hasKeyword(normalized, [
      "illa",
      "wrong",
      "not like that",
      "should be",
      "should've",
      "poi illa",
      "instead"
    ])
  ) {
    return "correction";
  }

  if (
    /\b(?:free|available)\s+ah\b/i.test(normalized) ||
    /\b(?:poriya|variya|varriya|irukiya|irukkiya|poviya|varuva|varuviya|venuma|mudiyuma|theriyuma|sollava|collage poriya)\b/i.test(
      normalized
    ) ||
    /\b[a-z0-9]+\s+ah\b/i.test(normalized)
  ) {
    return "question";
  }

  if (
    normalized.includes("?") ||
    /^(what|why|when|where|who|how|which|evalo|epo|eppo|enga)\b/i.test(normalized)
  ) {
    return "question";
  }

  if (
    /^(ok|okay|kk|k|hmm|hm|mm|seri|sari|ryt|right|sure|fine|cool|done|ok da|okay da)\b/i.test(
      normalized
    ) &&
    !normalized.includes("?") &&
    wordCount <= 4
  ) {
    return "confirmation";
  }

  if (
    /\b(let'?s|lets|shall we|can we|we can)\b/i.test(normalized) ||
    /\b(polam|polaam|polama|variya)\b/i.test(normalized)
  ) {
    return "proposal";
  }

  if (
    /\b(can you|could you|please|need you|help me)\b/i.test(normalized) ||
    /^(send|share|check|come|give|tell|make|bring|put|confirm|book|transfer)\b/i.test(
      normalized
    )
  ) {
    return "request";
  }

  if (
    hasKeyword(normalized, [
      "done",
      "completed",
      "finished",
      "sent",
      "started",
      "reached",
      "left",
      "booked",
      "coming",
      "on the way"
    ])
  ) {
    return "update";
  }

  if (
    wordCount <= 3 &&
    (/\b\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?\b/i.test(normalized) ||
      /^(time|timing|amount|price|place|location|address|details?)\b/i.test(normalized))
  ) {
    return "detail-request";
  }

  if (wordCount <= 4) {
    return "detail";
  }

  return "statement";
}

function getLastAssistantMessage(recentMessages) {
  const recent = Array.isArray(recentMessages) ? [...recentMessages].reverse() : [];

  for (const message of recent) {
    if (message?.role === "assistant" && toText(message?.content)) {
      return toText(message.content);
    }
  }

  return "";
}

function getLastUserMessage(recentMessages) {
  const recent = Array.isArray(recentMessages) ? [...recentMessages].reverse() : [];

  for (const message of recent) {
    if (message?.role === "user" && toText(message?.content)) {
      return toText(message.content);
    }
  }

  return "";
}

function getConversationState(userMessage, recentMessages = []) {
  const lastAssistantMessage = getLastAssistantMessage(recentMessages);
  const lastUserMessage = getLastUserMessage(recentMessages);
  const currentUserAct = detectMessageAct(userMessage);
  const lastAssistantAct = detectMessageAct(lastAssistantMessage);
  const lastUserAct = detectMessageAct(lastUserMessage);

  let pendingState = "";

  if (
    lastAssistantAct === "question" &&
    ["detail", "detail-request", "statement", "update", "confirmation", "question"].includes(
      currentUserAct
    )
  ) {
    pendingState = "answering-question";
  }

  if (
    !pendingState &&
    lastUserAct === "request" &&
    ["confirmation", "statement", "update"].includes(lastAssistantAct) &&
    ["complaint", "correction", "detail", "detail-request", "question"].includes(currentUserAct)
  ) {
    pendingState = "unresolved-request-follow-up";
  }

  if (
    !pendingState &&
    ["confirmation", "update", "statement"].includes(lastAssistantAct) &&
    currentUserAct === "complaint"
  ) {
    pendingState = "challenge-after-claim";
  }

  if (
    !pendingState &&
    ["proposal", "confirmation", "statement"].includes(lastAssistantAct) &&
    currentUserAct === "detail-request"
  ) {
    pendingState = "proposal-follow-up";
  }

  if (
    !pendingState &&
    ["detail", "statement"].includes(lastAssistantAct) &&
    currentUserAct === "correction"
  ) {
    pendingState = "correction-after-detail";
  }

  if (!pendingState && currentUserAct === "detail" && countWords(userMessage) <= 3) {
    pendingState = "short-follow-up";
  }

  return {
    lastAssistantMessage,
    lastUserMessage,
    currentUserAct,
    lastAssistantAct,
    lastUserAct,
    pendingState
  };
}

function isAffirmativeReply(value) {
  return /^(yes|yeah|yep|ok|okay|seri|sari|ryt|right|sure|vaa|varaen|coming|ama|aama|amam)$/i.test(toText(value));
}

function isNegativeReply(value) {
  return /^(no|nope|illa|illai|vendam|later)$/i.test(toText(value));
}

function shouldUseShortCasualMode(userMessage, messageIntents, queryTokens) {
  const normalized = toText(userMessage);
  const lowerMessage = expandColloquialText(normalized);
  const wordCount = countWords(normalized);
  const hasWorkIntent = messageIntents.includes("work") || messageIntents.includes("help");
  const hasCasualIntent =
    messageIntents.includes("casual") || messageIntents.includes("scheduling");
  const hasKnowledgeIntent = messageIntents.includes("knowledge");
  const isShortWorkFollowUp =
    messageIntents.includes("work") &&
    !messageIntents.includes("help") &&
    wordCount <= 3 &&
    hasKeyword(lowerMessage, [
      "update",
      "done",
      "completed",
      "finished",
      "sent",
      "send",
      "mail",
      "checked",
      "reviewed",
      "looked"
    ]);
  const hasShortCue = hasKeyword(lowerMessage, [
    "free",
    "coming",
    "time",
    "timing",
    "update",
    "done",
    "sent",
    "where",
    "when",
    "morning",
    "evening",
    "check",
    "share",
    "today",
    "tomorrow"
  ]);

  return (
    isShortWorkFollowUp ||
    (!hasWorkIntent &&
      !hasKnowledgeIntent &&
      hasCasualIntent &&
      (wordCount <= 5 || queryTokens.length <= 3 || normalized.length <= 32 || hasShortCue))
  );
}

function formatMessageGuidance(guidance) {
  if (!Array.isArray(guidance) || guidance.length === 0) {
    return "- None";
  }

  return guidance.map((item) => `- ${item}`).join("\n");
}

function hasSpecificTopicCue(normalizedMessage, queryTokens, topicHint) {
  return (
    Boolean(topicHint) ||
    queryTokens.length >= 2 ||
    hasKeyword(normalizedMessage, [
      "today",
      "tomorrow",
      "morning",
      "evening",
      "time",
      "price",
      "feature",
      "details",
      "error",
      "issue",
      "problem",
      "update",
      "send",
      "share",
      "check",
      "compare",
      "movie",
      "film",
      "cinema",
      "padam"
    ])
  );
}

function buildPersonaMessageAnalysis(userMessage, recentMessages = [], existingMessageNeed = null) {
  const normalizedMessage = toText(userMessage);
  const lowerMessage = expandColloquialText(normalizedMessage);
  const messageIntents = inferMessageIntents(normalizedMessage);
  const queryTokens = buildRetrievalTokens(normalizedMessage, messageIntents);
  const conversationState = getConversationState(normalizedMessage, recentMessages);
  const currentSituation = detectSituationType(normalizedMessage);
  const topicHint = extractTopicHint(normalizedMessage);
  const messageNeed =
    existingMessageNeed ?? analyzePersonaReplyNeed(normalizedMessage, recentMessages);
  const shortReplyMode = shouldUseShortCasualMode(normalizedMessage, messageIntents, queryTokens);
  const wordCount = countWords(normalizedMessage);

  return {
    normalizedMessage,
    lowerMessage,
    messageIntents,
    queryTokens,
    conversationState,
    currentSituation,
    topicHint,
    messageNeed,
    shortReplyMode,
    wordCount
  };
}

function assessMessageClarity(userMessage, recentMessages = [], existingAnalysis = null) {
  const analysis = existingAnalysis ?? buildPersonaMessageAnalysis(userMessage, recentMessages);
  const {
    normalizedMessage,
    lowerMessage,
    queryTokens,
    messageIntents,
    conversationState,
    messageNeed,
    topicHint,
    wordCount
  } = analysis;

  const hasAmbiguousReference =
    /\b(this|that|it|same|here|there|that one|this one)\b/i.test(normalizedMessage);
  const isWorkLike = messageIntents.includes("work") || messageIntents.includes("help");
  const isQuestionLike = ["question", "detail-request", "request", "proposal"].includes(
    conversationState.currentUserAct
  );
  const hasContextThread =
    Boolean(conversationState.pendingState) ||
    Boolean(conversationState.lastAssistantMessage) ||
    Boolean(conversationState.lastUserMessage);
  const specificTopic = hasSpecificTopicCue(lowerMessage, queryTokens, topicHint);

  if (messageNeed.responseMode === "clarify-topic") {
    return {
      shouldClarify: true,
      reason: "broad-topic-check",
      guidance:
        "The user is checking topic familiarity first, so confirm and ask which aspect they want."
    };
  }

  if (messageNeed.responseMode === "external-knowledge") {
    return {
      shouldClarify: false,
      reason: "specific-knowledge-question",
      guidance: "The user asked a direct factual question."
    };
  }

  if (hasAmbiguousReference && !hasContextThread && !specificTopic) {
    return {
      shouldClarify: true,
      reason: "ambiguous-reference",
      guidance:
        "The message depends on missing context, so ask a short clarifying question before answering."
    };
  }

  if (isWorkLike && isQuestionLike && queryTokens.length <= 1 && wordCount <= 5 && !specificTopic) {
    return {
      shouldClarify: true,
      reason: "underspecified-work-request",
      guidance:
        "The user sounds task-focused but did not specify enough detail to answer confidently."
    };
  }

  if (wordCount <= 2 && isQuestionLike && !hasContextThread && !specificTopic) {
    return {
      shouldClarify: true,
      reason: "too-brief-without-context",
      guidance:
        "The message is too short to infer intent safely, so ask what exactly they mean."
    };
  }

  return {
    shouldClarify: false,
    reason: "clear-enough",
    guidance: "The message is specific enough to answer."
  };
}

function buildGenericClarifyingReply(userMessage, analysis) {
  const { normalizedMessage, lowerMessage, messageIntents, topicHint } = analysis;

  if (topicHint) {
    if (looksTanglishMessage(normalizedMessage)) {
      return `${topicHint} la enna venum?\nOverview ah, details ah, illa comparison ah?`;
    }

    return `${topicHint} about what exactly?\nOverview, details, or comparison?`;
  }

  if (looksTanglishMessage(normalizedMessage)) {
    if (messageIntents.includes("work") || messageIntents.includes("help")) {
      return "Seri\nExact-a enna check panna venum?";
    }

    if (hasKeyword(lowerMessage, ["time", "timing", "today", "tomorrow"])) {
      return "Seri\nExact timing ah illa full plan ah?";
    }

    return "Konjam clear-ah sollu\nExact-a enna venum?";
  }

  if (messageIntents.includes("work") || messageIntents.includes("help")) {
    return "Sure.\nWhat exactly do you want me to check or help with?";
  }

  return "Can you be a bit more specific?\nWhat exactly do you want?";
}

function hasGroundedAnswerContext(retrievedContext, documentContext) {
  return (
    toArray(documentContext?.chunks).length > 0 ||
    toArray(retrievedContext?.knowledge).length > 0 ||
    toArray(retrievedContext?.memories).length > 0
  );
}

function buildInsufficientContextReply(analysis) {
  if (looksTanglishMessage(analysis.normalizedMessage)) {
    return "Andha detail context la illa\nSpecific-a send pannu";
  }

  return "I don't have that detail here.\nSend the exact context and I'll answer.";
}

function requiresGroundedContextForAnswer(analysis) {
  const normalized = analysis.lowerMessage;

  return hasKeyword(normalized, [
    "remember",
    "what did i",
    "what i said",
    "i told",
    "you said",
    "we discussed",
    "our chat",
    "previous chat",
    "uploaded",
    "document",
    "notes",
    "context la",
    "chat la"
  ]);
}

export function analyzePersonaReplyNeed(userMessage, recentMessages = []) {
  const normalizedMessage = toText(userMessage);
  const lowerMessage = expandColloquialText(normalizedMessage);
  const topicHint = extractTopicHint(normalizedMessage);
  const broadTopicCheck =
    Boolean(topicHint) &&
    hasKeyword(lowerMessage, [
      "do you know about",
      "know about",
      "heard about",
      "tell me about",
      "what do you know about"
    ]);
  const specificKnowledgeQuestion =
    !broadTopicCheck &&
    (hasKeyword(lowerMessage, [
      "what is",
      "who is",
      "where is",
      "why is",
      "how is",
      "how does",
      "how do",
      "difference between",
      "compare",
      "price",
      "spec",
      "feature",
      "details"
    ]) ||
      (Boolean(topicHint) && lowerMessage.includes("?")));
  const lastAssistantMessage = getLastAssistantMessage(recentMessages);
  const lastAssistantAct = detectMessageAct(lastAssistantMessage);

  if (broadTopicCheck) {
    return {
      responseMode: "clarify-topic",
      topicHint,
      guidance: [
        "The user is checking whether you know a topic, not asking for a full explanation yet.",
        "Confirm briefly, then ask one short clarifying question about which aspect they want.",
        "Do not answer with a non sequitur, random catchphrase, or recycled sample line."
      ]
    };
  }

  if (specificKnowledgeQuestion) {
    return {
      responseMode: "external-knowledge",
      topicHint,
      guidance: [
        "The user is asking for factual or external-topic information.",
        "Use relevant retrieved context when it directly helps.",
        "If retrieved context is missing or unrelated but the topic is public/general, answer directly using general knowledge in the persona's WhatsApp tone.",
        "Do not invent personal memories, private facts, or document details."
      ]
    };
  }

  if (lastAssistantAct === "question" && /^(what|who|where|why|how)\b/i.test(normalizedMessage)) {
    return {
      responseMode: "follow-up-question",
      topicHint,
      guidance: [
        "This looks like a direct follow-up to the immediate conversation.",
        "Answer the latest question clearly before adding style."
      ]
    };
  }

  return {
    responseMode: "persona-chat",
    topicHint,
    guidance: []
  };
}

export function buildDeterministicPersonaReply(userMessage, recentMessages = []) {
  const analysis = buildPersonaMessageAnalysis(userMessage, recentMessages);
  const clarity = assessMessageClarity(userMessage, recentMessages, analysis);

  if (!clarity.shouldClarify) {
    return "";
  }

  return buildGenericClarifyingReply(userMessage, analysis);
}

export function normalizePersonaProfile(rawProfile, resolvedPath = "runtime") {
  return {
    sourcePath: resolvedPath,
    person: {
      name: toText(rawProfile?.person?.name, FALLBACK_PROFILE.person.name),
      role: toText(rawProfile?.person?.role, FALLBACK_PROFILE.person.role),
      summary: toText(rawProfile?.person?.summary, FALLBACK_PROFILE.person.summary),
      relationshipToUser: toText(
        rawProfile?.person?.relationshipToUser,
        FALLBACK_PROFILE.person.relationshipToUser
      ),
      speakingStyle: unique([
        ...FALLBACK_PROFILE.person.speaking_style,
        ...toArray(rawProfile?.person?.speaking_style).map((item) => toText(item)).filter(Boolean)
      ]),
      signaturePhrases: unique(
        toArray(rawProfile?.person?.signature_phrases).map((item) => toText(item)).filter(Boolean)
      ),
      doNotDo: unique([
        ...FALLBACK_PROFILE.person.do_not_do,
        ...toArray(rawProfile?.person?.do_not_do).map((item) => toText(item)).filter(Boolean)
      ])
    },
    personalityTraits: {
      humor: toScore(
        rawProfile?.personality_traits?.humor,
        FALLBACK_PROFILE.personality_traits.humor
      ),
      confidence: toScore(
        rawProfile?.personality_traits?.confidence,
        FALLBACK_PROFILE.personality_traits.confidence
      ),
      empathy: toScore(
        rawProfile?.personality_traits?.empathy,
        FALLBACK_PROFILE.personality_traits.empathy
      ),
      directness: toScore(
        rawProfile?.personality_traits?.directness,
        FALLBACK_PROFILE.personality_traits.directness
      ),
      verbosity: toScore(
        rawProfile?.personality_traits?.verbosity,
        FALLBACK_PROFILE.personality_traits.verbosity
      )
    },
    conversationHabits: {
      greetings: unique(
        toArray(rawProfile?.conversation_habits?.greetings).map((item) => toText(item)).filter(Boolean)
      ),
      closings: unique(
        toArray(rawProfile?.conversation_habits?.closings).map((item) => toText(item)).filter(Boolean)
      ),
      abbreviations: unique(
        toArray(rawProfile?.conversation_habits?.abbreviations)
          .map((item) => toText(item))
          .filter(Boolean)
      ),
      acknowledgementPatterns: unique(
        toArray(rawProfile?.conversation_habits?.acknowledgement_patterns)
          .map((item) => toText(item))
          .filter(Boolean)
      ),
      responseStyle: unique(
        toArray(rawProfile?.conversation_habits?.response_style)
          .map((item) => toText(item))
          .filter(Boolean)
      ),
      punctuationStyle: {
        exclamation: toText(
          rawProfile?.conversation_habits?.punctuation_style?.exclamation,
          FALLBACK_PROFILE.conversation_habits.punctuation_style.exclamation
        ),
        questions: toText(
          rawProfile?.conversation_habits?.punctuation_style?.questions,
          FALLBACK_PROFILE.conversation_habits.punctuation_style.questions
        ),
        ellipsis: toText(
          rawProfile?.conversation_habits?.punctuation_style?.ellipsis,
          FALLBACK_PROFILE.conversation_habits.punctuation_style.ellipsis
        )
      },
      emojiStyle: toText(
        rawProfile?.conversation_habits?.emoji_style,
        FALLBACK_PROFILE.conversation_habits.emoji_style
      )
    },
    behaviorRules: unique([
      ...FALLBACK_PROFILE.behavior_rules,
      ...toArray(rawProfile?.behavior_rules).map((item) => toText(item)).filter(Boolean)
    ]),
    knowledgeBase: toArray(rawProfile?.knowledge_base).map((item, index) => ({
      id: toText(item?.id, `fact-${index + 1}`),
      title: toText(item?.title, `Fact ${index + 1}`),
      content: toText(item?.content),
      tags: unique(toArray(item?.tags).map((tag) => toText(tag)).filter(Boolean)),
      personalSignificance: toText(item?.personal_significance),
      expertiseLevel: toText(item?.expertise_level),
      emotionalTone: toText(item?.emotional_tone),
      frequency: toText(item?.frequency)
    })),
    memoryVideos: toArray(rawProfile?.memory_videos).map((item, index) => ({
      id: toText(item?.id, `memory-${index + 1}`),
      title: toText(item?.title, `Memory ${index + 1}`),
      summary: toText(item?.summary),
      tone: toText(item?.tone),
      tags: unique(toArray(item?.tags).map((tag) => toText(tag)).filter(Boolean)),
      transcriptSnippets: unique(
        toArray(item?.transcript_snippets).map((snippet) => toText(snippet)).filter(Boolean)
      )
    })),
    situationResponses: toArray(rawProfile?.situation_responses).map((item, index) => ({
      id: toText(item?.id, `situation-${index + 1}`),
      title: toText(item?.title, `Situation ${index + 1}`),
      summary: toText(item?.summary),
      guidance: toText(item?.guidance),
      commonCharacteristics: unique(
        toArray(item?.common_characteristics).map((entry) => toText(entry)).filter(Boolean)
      ),
      personalityTraitsShown: unique(
        toArray(item?.personality_traits_shown).map((entry) => toText(entry)).filter(Boolean)
      ),
      exampleIds: unique(toArray(item?.example_ids).map((entry) => toText(entry)).filter(Boolean)),
      frequency: toText(item?.frequency)
    })),
    chatExamples: toArray(rawProfile?.chat_examples).map((item, index) => ({
      id: toText(item?.id, `example-${index + 1}`),
      previousAssistant: toText(item?.previous_assistant),
      previousAssistantAct: toText(item?.previous_assistant_act),
      user: toText(item?.user),
      assistant: toText(item?.assistant),
      notes: toText(item?.notes),
      tags: unique(toArray(item?.tags).map((tag) => toText(tag)).filter(Boolean)),
      intents: unique(toArray(item?.intents).map((intent) => toText(intent)).filter(Boolean)),
      userMessageAct: toText(item?.user_message_act),
      assistantMessageAct: toText(item?.assistant_message_act),
      situationType: toText(item?.situation_type),
      responseCharacteristics: unique(
        toArray(item?.response_characteristics).map((entry) => toText(entry)).filter(Boolean)
      ),
      personalityTraitsShown: unique(
        toArray(item?.personality_traits_shown).map((entry) => toText(entry)).filter(Boolean)
      ),
      contextRichness: toText(item?.context_richness, "single-turn")
    })),
    styleSamples: unique(
      toArray(rawProfile?.style_samples)
        .map((item) => toText(item))
        .filter(Boolean)
    ).slice(0, 12),
    defaults: {
      temperature:
        typeof rawProfile?.defaults?.temperature === "number"
          ? rawProfile.defaults.temperature
          : FALLBACK_PROFILE.defaults.temperature,
      enableHeuristicReplies:
        typeof rawProfile?.defaults?.enable_heuristic_replies === "boolean"
          ? rawProfile.defaults.enable_heuristic_replies
          : FALLBACK_PROFILE.defaults.enable_heuristic_replies
    }
  };
}

export function resolveProfilePath(baseDirectory, configuredPath) {
  if (!configuredPath) {
    return path.join(baseDirectory, DEFAULT_PROFILE_PATH);
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(baseDirectory, configuredPath);
}

export function loadPersonaProfile(baseDirectory, configuredPath) {
  const resolvedPath = resolveProfilePath(baseDirectory, configuredPath);

  if (!fs.existsSync(resolvedPath)) {
    return normalizePersonaProfile(FALLBACK_PROFILE, resolvedPath);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    return normalizePersonaProfile(parsed, resolvedPath);
  } catch (error) {
    console.warn("Failed to load persona profile, using fallback:", error);
    return normalizePersonaProfile(FALLBACK_PROFILE, resolvedPath);
  }
}

function rankItems(items, queryTokens, projector) {
  return items
    .map((item) => ({
      item,
      score: projector(item, queryTokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function countIntentOverlap(left, right) {
  const rightSet = new Set(right);
  return left.reduce((total, item) => total + (rightSet.has(item) ? 1 : 0), 0);
}

function getDominantPersonalityTraits(profile) {
  return Object.entries(profile.personalityTraits ?? {})
    .filter(([, score]) => typeof score === "number" && score >= 0.55)
    .sort((left, right) => right[1] - left[1])
    .map(([trait]) => trait)
    .slice(0, 3);
}

function detectSituationType(userMessage) {
  const normalized = expandColloquialText(userMessage);
  const userAct = detectMessageAct(userMessage);

  if (["apology", "complaint"].includes(userAct)) {
    return "bad-news";
  }

  if (
    userAct === "update" &&
    hasKeyword(normalized, ["done", "completed", "finished", "selected", "won", "success", "finally"])
  ) {
    return "celebration";
  }

  if (hasKeyword(normalized, ["error", "issue", "problem", "bug", "fix", "stuck", "help"])) {
    return "problem-solving";
  }

  if (userAct === "correction") {
    return "correction";
  }

  if (
    hasKeyword(normalized, [
      "free",
      "available",
      "time",
      "timing",
      "today",
      "tomorrow",
      "morning",
      "evening",
      "schedule",
      "plan"
    ])
  ) {
    return "scheduling";
  }

  if (userAct === "request" || userAct === "proposal") {
    return "request";
  }

  if (userAct === "question" || userAct === "detail-request") {
    return "question";
  }

  return "general-chat";
}

function getExpectedReplyActs(currentUserAct, lastAssistantAct, pendingState) {
  if (pendingState === "answering-question") {
    return ["statement", "update", "confirmation", "detail"];
  }

  if (pendingState === "unresolved-request-follow-up") {
    return ["question", "statement", "confirmation", "detail"];
  }

  if (pendingState === "challenge-after-claim") {
    return ["statement", "question", "confirmation", "request"];
  }

  if (pendingState === "proposal-follow-up") {
    return ["detail", "statement", "question"];
  }

  if (pendingState === "correction-after-detail") {
    return ["confirmation", "statement", "detail"];
  }

  if (lastAssistantAct === "question") {
    return ["statement", "detail", "update", "confirmation"];
  }

  switch (currentUserAct) {
    case "question":
    case "detail-request":
      return ["statement", "detail", "question"];
    case "request":
    case "proposal":
      return ["confirmation", "question", "rejection", "statement"];
    case "complaint":
    case "correction":
      return ["statement", "question", "confirmation"];
    case "update":
    case "detail":
      return ["confirmation", "statement", "question"];
    case "confirmation":
      return ["question", "statement", "confirmation"];
    case "rejection":
      return ["statement", "confirmation"];
    default:
      return ["statement", "confirmation", "question"];
  }
}

function scoreConversationActMatch(item, conversationState) {
  const itemUserAct = toText(item.userMessageAct);
  const itemAssistantAct = toText(item.assistantMessageAct);
  const itemPreviousAssistantAct = toText(item.previousAssistantAct);
  const expectedReplyActs = getExpectedReplyActs(
    conversationState.currentUserAct,
    conversationState.lastAssistantAct,
    conversationState.pendingState
  );
  const compatibleUserActs = new Set([conversationState.currentUserAct]);

  if (conversationState.currentUserAct === "question") {
    compatibleUserActs.add("detail-request");
  }

  if (conversationState.currentUserAct === "detail-request") {
    compatibleUserActs.add("question");
  }

  if (conversationState.currentUserAct === "complaint") {
    compatibleUserActs.add("correction");
  }

  if (conversationState.currentUserAct === "correction") {
    compatibleUserActs.add("complaint");
  }

  let score = 0;

  if (itemUserAct && compatibleUserActs.has(itemUserAct)) {
    score += 7;
  }

  if (itemAssistantAct && expectedReplyActs.includes(itemAssistantAct)) {
    score += 5;
  }

  if (
    conversationState.lastAssistantAct &&
    itemPreviousAssistantAct &&
    conversationState.lastAssistantAct === itemPreviousAssistantAct
  ) {
    score += 4;
  }

  return score;
}

function scoreSituationMatch(item, queryTokens, currentSituation, messageIntents) {
  let score = 0;

  if (item.id === currentSituation) {
    score += 8;
  }

  score += scoreText(queryTokens, `${item.title} ${item.summary} ${item.guidance}`);
  score += scoreTags(queryTokens, item.commonCharacteristics);
  score += countIntentOverlap(messageIntents, item.commonCharacteristics) * 2;

  if (item.frequency === "high") {
    score += 2;
  } else if (item.frequency === "medium") {
    score += 1;
  }

  return score;
}

function scoreExampleMatch(
  item,
  queryTokens,
  messageIntents,
  conversationState = {},
  currentSituation = "",
  dominantTraits = []
) {
  const previousAssistantScore = scoreText(
    tokenize(conversationState.lastAssistantMessage ?? ""),
    item.previousAssistant
  );
  const userScore = scoreText(queryTokens, item.user) * 4;
  const assistantScore = scoreText(queryTokens, item.assistant) * 2;
  const notesScore = scoreText(queryTokens, item.notes);
  const tagScore = scoreTags(queryTokens, item.tags);
  const intentScore = countIntentOverlap(messageIntents, item.intents) * 5;

  let score =
    userScore + assistantScore + notesScore + tagScore + intentScore + previousAssistantScore * 5;

  const itemTags = new Set(item.tags);
  const itemIntents = new Set(item.intents);
  const isWorkMessage = messageIntents.includes("work");
  const isCasualMessage = messageIntents.includes("casual");
  const isSchedulingMessage = messageIntents.includes("scheduling");

  if (
    isCasualMessage &&
    !isWorkMessage &&
    (itemTags.has("work") ||
      itemTags.has("progress") ||
      itemTags.has("nudge") ||
      itemIntents.has("work") ||
      itemIntents.has("deadline"))
  ) {
    score -= 6;
  }

  if (isSchedulingMessage && (itemTags.has("timing") || itemTags.has("schedule"))) {
    score += 4;
  }

  if (currentSituation && item.situationType === currentSituation) {
    score += 7;
  }

  score += scoreConversationActMatch(item, conversationState);

  score += countIntentOverlap(dominantTraits, item.personalityTraitsShown ?? []) * 2;

  if (
    queryTokens.length <= 2 &&
    itemTags.has("short-reply")
  ) {
    score += 4;
  }

  if (queryTokens.length >= 4 && item.contextRichness === "threaded") {
    score += 3;
  } else if (queryTokens.length >= 3 && item.contextRichness === "multi-turn") {
    score += 2;
  }

  if (
    queryTokens.length <= 2 &&
    !isWorkMessage &&
    (itemTags.has("nudge") || itemIntents.has("nudge"))
  ) {
    score -= 4;
  }

  return score;
}

export function retrievePersonaContext(
  profile,
  userMessage,
  maxItems = 6,
  recentMessages = [],
  analysis = null
) {
  const activeAnalysis = analysis ?? buildPersonaMessageAnalysis(userMessage, recentMessages);
  const { messageIntents, queryTokens, shortReplyMode, currentSituation, conversationState } =
    activeAnalysis;
  const dominantTraits = getDominantPersonalityTraits(profile);
  const knowledgeMatches = rankItems(profile.knowledgeBase, queryTokens, (item, tokens) => {
    return scoreText(tokens, `${item.title} ${item.content}`) + scoreTags(tokens, item.tags);
  });
  const memoryMatches = rankItems(profile.memoryVideos, queryTokens, (item, tokens) => {
    return (
      scoreText(tokens, `${item.title} ${item.summary} ${item.transcriptSnippets.join(" ")}`) +
      scoreTags(tokens, item.tags)
    );
  });
  const situationMatches = rankItems(profile.situationResponses, queryTokens, (item, tokens) =>
    scoreSituationMatch(item, tokens, currentSituation, messageIntents)
  );
  const exampleMatches = rankItems(profile.chatExamples, queryTokens, (item, tokens) =>
    scoreExampleMatch(
      item,
      tokens,
      messageIntents,
      conversationState,
      currentSituation,
      dominantTraits
    )
  );
  const minimumKnowledgeScore = 2;
  const minimumMemoryScore = 2;
  const minimumSituationScore = 6;
  const minimumExampleScore = queryTokens.length <= 1 ? 10 : 8;

  return {
    knowledge: knowledgeMatches
      .filter((entry) => entry.score >= minimumKnowledgeScore)
      .slice(0, Math.min(2, maxItems))
      .map((entry) => entry.item),
    memories: memoryMatches
      .filter((entry) => entry.score >= minimumMemoryScore)
      .slice(0, Math.min(2, maxItems))
      .map((entry) => entry.item),
    situations: situationMatches
      .filter((entry) => entry.score >= minimumSituationScore)
      .slice(0, Math.min(2, maxItems))
      .map((entry) => entry.item),
    examples: exampleMatches
      .filter((entry) => entry.score >= minimumExampleScore)
      .slice(0, Math.min(3, maxItems))
      .map((entry) => entry.item),
    currentSituation,
    currentUserAct: conversationState.currentUserAct,
    lastAssistantAct: conversationState.lastAssistantAct,
    pendingState: conversationState.pendingState,
    messageIntents,
    shortReplyMode
  };
}

function isCompatibleMessageAct(exampleAct, currentAct) {
  if (!exampleAct || !currentAct) {
    return false;
  }

  if (exampleAct === currentAct) {
    return true;
  }

  const pairs = [
    ["question", "detail-request"],
    ["detail-request", "question"],
    ["complaint", "correction"],
    ["correction", "complaint"]
  ];

  return pairs.some(([left, right]) => left === exampleAct && right === currentAct);
}

function getRecentConversationText(recentMessages = [], userMessage = "", conversationState = {}) {
  return [
    ...toArray(recentMessages).map((message) => message?.content),
    conversationState.lastAssistantMessage,
    conversationState.lastUserMessage,
    userMessage
  ]
    .map((item) => expandColloquialText(item))
    .filter(Boolean)
    .join(" ");
}

function hasMovieContext(recentMessages = [], userMessage = "", conversationState = {}) {
  return hasKeyword(getRecentConversationText(recentMessages, userMessage, conversationState), [
    "movie",
    "film",
    "cinema",
    "padam"
  ]);
}

function extractMovieTitle(value) {
  const normalized = toText(value)
    .replace(/\b(movie|film|cinema|padam|da|bro|dei|pa)\b/gi, " ")
    .replace(/[?!]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  if (/^mr\.?\s*x$/i.test(normalized)) {
    return "Mr. X";
  }

  if (countWords(normalized) <= 4 && /[a-z0-9]/i.test(normalized)) {
    return normalized
      .split(/\s+/)
      .map((part) => (/^x$/i.test(part) ? "X" : part.charAt(0).toUpperCase() + part.slice(1)))
      .join(" ");
  }

  return "";
}

function buildContextualShortReply(userMessage, recentMessages, analysis, profile) {
  const { normalizedMessage, conversationState } = analysis;
  const personaAbbreviations = profile?.conversationHabits?.abbreviations || [];
  const okReply = personaAbbreviations.includes("seri") ? "Seri" : "Ok";
  const movieContext = hasMovieContext(recentMessages, normalizedMessage, conversationState);
  const movieTitle = extractMovieTitle(normalizedMessage);

  if (movieContext && isAffirmativeReply(normalizedMessage)) {
    return `${okReply}\nAppo movie polam`;
  }

  if (
    movieContext &&
    analysis.conversationState.currentUserAct === "proposal" &&
    !movieTitle
  ) {
    return "Which movie?";
  }

  if (
    movieContext &&
    movieTitle &&
    (conversationState.lastAssistantAct === "question" ||
      conversationState.pendingState === "answering-question")
  ) {
    return `${okReply}\n${movieTitle} polam`;
  }

  return "";
}

function pickReusableFastPathExample(examples, conversationState, currentSituation) {
  for (const example of toArray(examples)) {
    if (!toText(example?.assistant) || countWords(example.assistant) > 14) {
      continue;
    }

    // Filter out examples that are topic-specific unless the current context mentions that topic
    const exampleText = `${example.user} ${example.assistant} ${example.notes || ""}`.toLowerCase();
    const isFoodRelated = exampleText.includes("saapadu") || exampleText.includes("eat") || exampleText.includes("food");
    const isWorkRelated = exampleText.includes("work") || exampleText.includes("send") || exampleText.includes("code");
    
    // Don't use topic-specific examples unless the conversation is about that topic
    const lastUserMessage = toText(conversationState.lastUserMessage).toLowerCase();
    if (isFoodRelated && !hasKeyword(lastUserMessage, ["eat", "food", "saapadu"])) {
      continue;
    }
    if (isWorkRelated && !hasKeyword(lastUserMessage, ["work", "send", "code", "task"])) {
      continue;
    }

    if (
      currentSituation &&
      currentSituation !== "general-chat" &&
      toText(example?.situationType) &&
      example.situationType !== currentSituation
    ) {
      continue;
    }

    if (
      conversationState.currentUserAct &&
      toText(example?.userMessageAct) &&
      !isCompatibleMessageAct(example.userMessageAct, conversationState.currentUserAct)
    ) {
      continue;
    }

    if (
      conversationState.lastAssistantMessage &&
      conversationState.pendingState === "answering-question" &&
      !toText(example?.previousAssistant)
    ) {
      continue;
    }

    return example;
  }

  return null;
}

export function buildHeuristicPersonaReply(
  userMessage,
  recentMessages,
  retrievedContext,
  profile,
  analysis = null
) {
  const activeAnalysis = analysis ?? buildPersonaMessageAnalysis(userMessage, recentMessages);
  const { normalizedMessage, lowerMessage, conversationState, wordCount } = activeAnalysis;
  const timeReference = extractTimeReference(normalizedMessage);
  const contextualShortReply = buildContextualShortReply(
    userMessage,
    recentMessages,
    activeAnalysis,
    profile
  );

  if (contextualShortReply) {
    return contextualShortReply;
  }
  
  // Use persona's signature phrases and abbreviations if available
  const personaAbbreviations = profile?.conversationHabits?.abbreviations || [];
  const personaAcknowledgements = profile?.conversationHabits?.acknowledgementPatterns || [];
  const personaSignatures = profile?.person?.signaturePhrases || [];
  
  // Get default fallback phrases - prefer persona's actual phrases
  const fallbackAcknowledge = personaAbbreviations[0] || personaAcknowledgements[0] || "Ok";
  const fallbackCheck = personaSignatures.includes("Naa Podala") ? "Check pannu" : "Check pannu";
  
  // CRITICAL: Don't use heuristic reply for messages expressing intent, need, or desire
  const expressesIntent = /want|need|talk|please|help|ask|discuss|say|tell|explain|understand/i.test(normalizedMessage);
  const expressesFeeling = /feel|think|believe|seem|look|seem|appear/i.test(normalizedMessage);
  
  // CRITICAL: Don't use heuristic reply if the user is asking a substantive question or expressing clear intent
  const isSubstantiveQuestion = /^(how|what|why|when|where|which|who|do you|can you|will you|should|tell|explain|describe)/i.test(normalizedMessage);
  const isNegativeSentiment = /^(no|nope|dont|don't|nothing|illa|illai|vendam|nah)/i.test(normalizedMessage);
  const isComplexStatement = wordCount > 4 && (/i dont want|i don't want|nothing|don't need|not interested|dont need|just need to|need to talk/i.test(normalizedMessage) || (expressesIntent && wordCount > 3));
  
  // If message expresses intent/feeling and has more than 3 words, let LLM handle it
  if ((expressesIntent || expressesFeeling || isComplexStatement || isSubstantiveQuestion) && wordCount > 3) {
    return ""; // Let LLM handle intentful statements
  }
  
  const allowFastPath =
    retrievedContext?.shortReplyMode ||
    Boolean(conversationState.pendingState) ||
    Boolean(timeReference) ||
    isAffirmativeReply(normalizedMessage) ||
    isNegativeReply(normalizedMessage) ||
    ["question", "detail-request", "complaint", "correction", "detail"].includes(
      conversationState.currentUserAct
    );

  if (!allowFastPath) {
    return "";
  }

  // For complex negatives, don't use examples
  if (isNegativeSentiment && wordCount > 2) {
    return "";
  }

  const reusableExample = pickReusableFastPathExample(
    retrievedContext?.examples,
    conversationState,
    retrievedContext?.currentSituation
  );
  
  const isConfirmation =
    timeReference &&
    (/\bok\b/i.test(normalizedMessage) ||
      /\bokay\b/i.test(normalizedMessage) ||
      /\bok va\b/i.test(lowerMessage) ||
      wordCount <= 4);

  if (isAffirmativeReply(normalizedMessage)) {
    if (conversationState.lastAssistantAct === "question") {
      return fallbackAcknowledge;
    }

    if (conversationState.lastAssistantAct === "proposal") {
      return personaAbbreviations.includes("seri") ? "Seri" : fallbackAcknowledge;
    }

    return fallbackAcknowledge;
  }

  if (isNegativeReply(normalizedMessage)) {
    // For negative replies with complex context or more than one word, let LLM handle it
    if (isComplexStatement || wordCount > 2) {
      return "";
    }
    
    if (conversationState.lastAssistantAct === "question" || conversationState.lastAssistantAct === "proposal") {
      const negativeFallback = personaAbbreviations.includes("seri") 
        ? "Seri\nLater sollu" 
        : fallbackAcknowledge + "\nLater";
      return negativeFallback;
    }

    return personaAbbreviations.includes("seri") ? "Seri" : fallbackAcknowledge;
  }

  if (isConfirmation) {
    return reusableExample?.assistant || `${fallbackAcknowledge}\n${timeReference}`;
  }

  if (conversationState.pendingState === "challenge-after-claim") {
    return reusableExample?.assistant || fallbackCheck;
  }

  if (conversationState.pendingState === "proposal-follow-up") {
    // Don't use generic examples for follow-ups - needs context
    return "";
  }

  if (conversationState.pendingState === "correction-after-detail") {
    return reusableExample?.assistant || (personaAbbreviations.includes("seri") ? "Seri seri" : "Ok ok");
  }

  if (
    conversationState.pendingState === "answering-question" ||
    conversationState.pendingState === "unresolved-request-follow-up" ||
    conversationState.pendingState === "short-follow-up"
  ) {
    if (reusableExample?.assistant) {
      return reusableExample.assistant;
    }
  }

  if (conversationState.currentUserAct === "detail-request") {
    // Don't use examples for detail requests - needs understanding
    return "";
  }

  if (conversationState.currentUserAct === "complaint") {
    return reusableExample?.assistant || fallbackCheck;
  }

  if (conversationState.currentUserAct === "question" && wordCount <= 3) {
    // For very short questions, prefer example-based reply
    return reusableExample?.assistant || "";
  }

  return reusableExample?.assistant || "";
}

export function planPersonaReply({
  profile,
  userMessage,
  recentMessages = [],
  maxContextItems = 6,
  documentContext = null
}) {
  const analysis = buildPersonaMessageAnalysis(userMessage, recentMessages);
  const clarity = assessMessageClarity(userMessage, recentMessages, analysis);
  const retrievedContext = retrievePersonaContext(
    profile,
    userMessage,
    maxContextItems,
    recentMessages,
    analysis
  );
  const lacksGroundedAnswer =
    analysis.messageNeed.responseMode === "external-knowledge" &&
    requiresGroundedContextForAnswer(analysis) &&
    !hasGroundedAnswerContext(retrievedContext, documentContext);
  const deterministicReply = clarity.shouldClarify
    ? buildGenericClarifyingReply(userMessage, analysis)
    : lacksGroundedAnswer
      ? buildInsufficientContextReply(analysis)
      : "";
  const isWhatsAppPersona = /whatsapp chat persona/i.test(toText(profile?.person?.role));
  const canUseHeuristicReply =
    profile?.defaults?.enableHeuristicReplies &&
    !isWhatsAppPersona &&
    !clarity.shouldClarify &&
    !lacksGroundedAnswer &&
    analysis.messageNeed.responseMode === "persona-chat" &&
    (!documentContext || !Array.isArray(documentContext.chunks) || documentContext.chunks.length === 0);
  const heuristicReply = canUseHeuristicReply
    ? buildHeuristicPersonaReply(userMessage, recentMessages, retrievedContext, profile, analysis)
    : "";
  const reply = deterministicReply || heuristicReply;

  return {
    analysis,
    clarity,
    messageNeed: analysis.messageNeed,
    retrievedContext,
    deterministicReply,
    heuristicReply,
    lacksGroundedAnswer,
    reply,
    replyStrategy: clarity.shouldClarify
      ? "clarify"
      : lacksGroundedAnswer
        ? "insufficient-context"
        : heuristicReply
          ? "heuristic"
          : "llm",
    shouldCallLlm: !reply
  };
}

function formatList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatTraitScore(score) {
  if (score >= 0.75) {
    return "very high";
  }

  if (score >= 0.55) {
    return "high";
  }

  if (score >= 0.35) {
    return "medium";
  }

  return "low";
}

function formatPersonalityTraits(personalityTraits) {
  return [
    `- Humor: ${formatTraitScore(personalityTraits.humor)} (${personalityTraits.humor})`,
    `- Confidence: ${formatTraitScore(personalityTraits.confidence)} (${personalityTraits.confidence})`,
    `- Empathy: ${formatTraitScore(personalityTraits.empathy)} (${personalityTraits.empathy})`,
    `- Directness: ${formatTraitScore(personalityTraits.directness)} (${personalityTraits.directness})`,
    `- Verbosity: ${formatTraitScore(personalityTraits.verbosity)} (${personalityTraits.verbosity})`
  ].join("\n");
}

function formatConversationHabits(conversationHabits) {
  return [
    `- Response style: ${
      conversationHabits.responseStyle.length > 0
        ? conversationHabits.responseStyle.join(", ")
        : "No strong pattern extracted"
    }`,
    `- Greetings: ${
      conversationHabits.greetings.length > 0 ? conversationHabits.greetings.join(", ") : "none observed"
    }`,
    `- Closings: ${
      conversationHabits.closings.length > 0 ? conversationHabits.closings.join(", ") : "none observed"
    }`,
    `- Abbreviations: ${
      conversationHabits.abbreviations.length > 0
        ? conversationHabits.abbreviations.join(", ")
        : "none observed"
    }`,
    `- Acknowledgements: ${
      conversationHabits.acknowledgementPatterns.length > 0
        ? conversationHabits.acknowledgementPatterns.join(", ")
        : "none observed"
    }`,
    `- Punctuation: exclamation ${conversationHabits.punctuationStyle.exclamation}, questions ${conversationHabits.punctuationStyle.questions}, ellipsis ${conversationHabits.punctuationStyle.ellipsis}`,
    `- Emoji style: ${conversationHabits.emojiStyle}`
  ].join("\n");
}

function formatKnowledge(knowledge) {
  if (knowledge.length === 0) {
    return "- None";
  }

  return knowledge
    .map(
      (item) =>
        `- ${item.title}: ${item.content}${
          item.tags.length ? ` [tags: ${item.tags.join(", ")}]` : ""
        }${
          item.personalSignificance ? ` [personal significance: ${item.personalSignificance}]` : ""
        }${item.expertiseLevel ? ` [expertise: ${item.expertiseLevel}]` : ""}${
          item.emotionalTone ? ` [tone: ${item.emotionalTone}]` : ""
        }${item.frequency ? ` [frequency: ${item.frequency}]` : ""}`
    )
    .join("\n");
}

function formatMemories(memories) {
  if (memories.length === 0) {
    return "- None";
  }

  return memories
    .map((item) => {
      const snippets = item.transcriptSnippets.length
        ? ` Snippets: ${item.transcriptSnippets.join(" | ")}`
        : "";
      const tone = item.tone ? ` Tone: ${item.tone}.` : "";
      return `- ${item.title}: ${item.summary}.${tone}${snippets}`;
    })
    .join("\n");
}

function formatExamples(examples) {
  if (examples.length === 0) {
    return "- None";
  }

  return examples
    .map(
      (item) =>
        `- ${item.previousAssistant ? `Previous assistant: ${item.previousAssistant}\n  ` : ""}${
          item.user ? `User: ${item.user}` : "User context: unavailable"
        }\n  ${
          item.assistant ? `Reply: ${item.assistant}` : "Reply: n/a"
        }${
          item.notes ? `\n  Notes: ${item.notes}` : ""
        }${item.intents.length ? `\n  Intents: ${item.intents.join(", ")}` : ""}${
          item.previousAssistantAct ? `\n  Previous assistant act: ${item.previousAssistantAct}` : ""
        }${
          item.userMessageAct ? `\n  User act: ${item.userMessageAct}` : ""
        }${
          item.assistantMessageAct ? `\n  Reply act: ${item.assistantMessageAct}` : ""
        }${
          item.tags.length ? `\n  Tags: ${item.tags.join(", ")}` : ""
        }${item.situationType ? `\n  Situation: ${item.situationType}` : ""}${
          item.responseCharacteristics.length
            ? `\n  Response characteristics: ${item.responseCharacteristics.join(", ")}`
            : ""
        }${
          item.personalityTraitsShown.length
            ? `\n  Traits shown: ${item.personalityTraitsShown.join(", ")}`
            : ""
        }${item.contextRichness ? `\n  Context richness: ${item.contextRichness}` : ""}`
    )
    .join("\n");
}

function formatSituationResponses(situations, currentSituation) {
  if (!Array.isArray(situations) || situations.length === 0) {
    return "- None";
  }

  return situations
    .map(
      (item) =>
        `- ${item.title}${item.id === currentSituation ? " [current match]" : ""}: ${item.summary}${
          item.guidance ? ` Guidance: ${item.guidance}` : ""
        }`
    )
    .join("\n");
}

function formatStyleSamples(styleSamples) {
  if (styleSamples.length === 0) {
    return "- None";
  }

  return styleSamples.map((item) => `- ${item}`).join("\n");
}

export function buildPersonaPrompt(profile, retrievedContext, messageNeed) {
  const { person } = profile;
  const activeMessageNeed = messageNeed ?? {
    responseMode: "persona-chat",
    topicHint: "",
    guidance: []
  };
  
  // Build signature phrase instruction with examples
  const signaturePhrasesFormatted = person.signaturePhrases && person.signaturePhrases.length > 0
    ? `Signature phrases to use naturally when appropriate: ${person.signaturePhrases.join(", ")}\n- Use these phrases when they fit the conversational moment; do not force them.\n- These are how ${person.name} naturally ends or responds in matching situations.`
    : "Signature phrases: (none extracted)";
  
  // Build acknowledgement patterns instruction
  const acknowledgements = profile.conversationHabits?.acknowledgementPatterns || [];
  const acknowledgementInstruction = acknowledgements.length > 0
    ? `\nCommon acknowledgement replies: ${acknowledgements.join(", ")}\n- Use brief acknowledgements like these for quick confirmations or short follow-ups.\n- These match how ${person.name} naturally confirms or acknowledges.`
    : "";

  return `
You are speaking as ${person.name}.
Identity: ${person.summary}
Role: ${person.role}
Relationship to the user: ${person.relationshipToUser}

Primary objective:
- Mimic how ${person.name} naturally speaks using the grounded evidence below.
- Sound human, specific, and emotionally consistent with the source material.
- Keep the answer faithful to the person's known knowledge, memories, and tone.
- Prefer the exact chat rhythm from the examples over generic polished writing.
- When appropriate, use the characteristic short replies and signature phrases shown below.

Strict WhatsApp reply contract:
- Output only the final reply, never analysis, labels, candidate lists, or explanations.
- Maximum 2 short lines.
- Privately consider 2-3 possible replies, then send only the best one.
- If the latest user message is vague or ambiguous, ask one specific clarification question.
- Use retrieved context only when it directly relates to the latest user message.
- Ignore unrelated or weakly related retrieved context completely.
- Do not invent facts, memories, links, times, plans, or document details beyond the grounded context.
- Sound like a real WhatsApp contact, not an assistant.

Rules:
${formatList(profile.behaviorRules)}

Speaking style:
${formatList(person.speakingStyle)}

${signaturePhrasesFormatted}${acknowledgementInstruction}

Avoid:
${formatList(person.doNotDo)}

Grounded knowledge:
${formatKnowledge(retrievedContext.knowledge)}

Relevant memories from videos:
${formatMemories(retrievedContext.memories)}

Style examples from prior chats:
${formatExamples(retrievedContext.examples)}

Canonical message samples from the person:
${formatStyleSamples(profile.styleSamples)}

Current user-message cues:
${formatList(retrievedContext.messageIntents)}

Current conversation acts:
- Current user act: ${retrievedContext.currentUserAct || "statement"}
- Previous assistant act: ${retrievedContext.lastAssistantAct || "none"}
- Pending flow: ${retrievedContext.pendingState || "none"}

Personality traits:
${formatPersonalityTraits(profile.personalityTraits)}

Conversation habits:
${formatConversationHabits(profile.conversationHabits)}

Situation guidance:
${formatSituationResponses(retrievedContext.situations, retrievedContext.currentSituation)}

Latest message handling:
- Response mode: ${activeMessageNeed.responseMode}
- Topic hint: ${activeMessageNeed.topicHint || "None"}
- Situation type: ${retrievedContext.currentSituation || "general-chat"}
${formatMessageGuidance(activeMessageNeed.guidance)}

Reply mode:
- ${retrievedContext.shortReplyMode ? "Short casual WhatsApp reply." : "Normal persona reply."}

Response guidelines:
- **PRIORITY 1: Answer the user's literal question first.** Ignore style, just answer what they asked.
- **PRIORITY 2: Match the persona's speaking style.** Only after the answer is clear, apply the tone.
- For public/general topics not found in chat examples, answer directly using general knowledge in the same WhatsApp tone.
- For personal memories, uploaded documents, or previous-chat claims, only answer when grounded context supports it.
- Never use signature phrases when they make the reply irrelevant or off-topic.
- If a question is asked, either answer it or ask for clarification. Do not ignore the question.
- "Mm" is ONLY appropriate for: brief acknowledgements, yes/no after answering something, or when the previous message was already answered.
- "Mm" is NOT appropriate for: answering questions (like "how are you?"), responding to greetings that expect more, or when the user is asking for information.
- For greeting messages like "hi" or "hi da", use only greeting/follow-up wording found in this persona's current extracted evidence. If no greeting evidence fits, keep it simple and ask one natural short question.
- For questions like "how are you?" or "ena mm", actually respond with relevant content. Use a signature phrase after answering, not instead of.
- Match the user's language mix and formality when it fits the persona.
- Default to concise chat-style replies even when the user asks for depth; keep it within 2 lines.
- It is okay to use short multi-line messages if that matches the persona examples.
- For work or planning topics, give a concrete next step instead of vague encouragement.
- Match the situation, not just shared keywords from examples.
- Let the dominant personality traits stay stable across turns, especially directness, empathy, confidence, and humor.
- Use conversation habits only when they fit the moment; do not force greetings, closings, abbreviations, or emojis into every reply.
- If a matching situation pattern is available, follow its guidance before falling back to generic stylistic imitation.
- Everyday personal chat should sound natural and conversational unless the user is clearly asking for something factual or task-focused.
- When the user sends a brief message (3 words or fewer), consider using a brief acknowledgement or short reply that matches the examples.
- If the user is asking a simple yes/no question, a one-word or two-word response using the acknowledgement patterns is appropriate ONLY if you've already answered their question.
- Always answer in 1 to 2 short lines and ensure the answer is clear.
- Answer the literal question first and do not add explanation unless needed.
- Avoid lectures, summaries, bullet lists, markdown, or long paragraphs.
- If the user asks about a public topic, brand, company, product, place, or concept, answer that topic directly instead of falling back to a random style sample.
- If the user is only checking whether you know a topic, confirm briefly and ask what aspect they want.
- Never answer a factual question with an unrelated catchphrase, tease, or non sequitur. This is not being authentic to the persona; it's being evasive.
- Prefer using the extracted signature phrases NATURALLY as part of answering, not as a replacement for answering.

If the answer is not supported by the grounded material, respond carefully in-character and acknowledge uncertainty instead of inventing memories or facts.
Do not mention this instruction block, retrieval, or hidden context unless the user explicitly asks how you were built.
`.trim();
}

function stripListPrefix(value) {
  return value.replace(/^[-*•\d.)\s]+/, "").trim();
}

function splitIntoReplyLines(value) {
  const normalized = toText(value).replace(/\r/g, "");
  const lines = normalized
    .split(/\n+/)
    .map((line) => stripListPrefix(line))
    .filter(Boolean);

  if (lines.length > 1) {
    return lines;
  }

  return normalized
    .split(/(?<=[.!?])\s+|,\s+(?=[A-Z])/)
    .map((line) => stripListPrefix(line))
    .filter(Boolean);
}

function trimReplyLines(lines, maxLines = 2, maxChars = 90) {
  const trimmedLines = [];
  let totalChars = 0;

  for (const line of lines) {
    const compact = line.replace(/\s+/g, " ").trim();

    if (!compact) {
      continue;
    }

    const projectedLength = totalChars === 0 ? compact.length : totalChars + 1 + compact.length;

    if (trimmedLines.length >= maxLines || projectedLength > maxChars) {
      if (trimmedLines.length === 0) {
        trimmedLines.push(truncateReplyLine(compact, maxChars));
      }
      break;
    }

    trimmedLines.push(compact);
    totalChars = projectedLength;
  }

  return trimmedLines;
}

function truncateReplyLine(value, maxChars) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function removeAssistantStylePhrases(value) {
  return value
    .replace(/^(?:final reply|best reply|answer|response)\s*[:\-]\s*/i, "")
    .replace(/^as an?\s+(?:ai|assistant|language model)[^,.!?]*[,.!?]?\s*/i, "")
    .replace(/\b(?:according to the retrieved context|based on the provided context)\b[:,]?\s*/gi, "")
    .trim();
}

export function postProcessPersonaReply(reply, retrievedContext, options = {}) {
  const normalizedReply = removeAssistantStylePhrases(toText(reply));

  if (!normalizedReply) {
    return normalizedReply;
  }

  const candidateLines = splitIntoReplyLines(normalizedReply);
  const maxLines = typeof options.maxLines === "number" ? Math.max(1, options.maxLines) : 2;
  const shortReplyMaxChars =
    typeof options.shortReplyMaxChars === "number" ? Math.max(40, options.shortReplyMaxChars) : 120;
  const normalReplyMaxChars =
    typeof options.normalReplyMaxChars === "number" ? Math.max(60, options.normalReplyMaxChars) : 180;
  const maxChars = retrievedContext?.shortReplyMode ? shortReplyMaxChars : normalReplyMaxChars;
  const trimmedLines = trimReplyLines(candidateLines, maxLines, maxChars);

  if (trimmedLines.length === 0) {
    return truncateReplyLine(normalizedReply.replace(/\s+/g, " ").trim(), maxChars);
  }

  return trimmedLines.join("\n");
}

export function getGroundingSummary(retrievedContext) {
  return {
    knowledge: retrievedContext.knowledge.map((item) => item.title),
    memories: retrievedContext.memories.map((item) => item.title),
    situations: retrievedContext.situations.map((item) => item.id),
    examples: retrievedContext.examples.map((item) => item.id),
    currentSituation: retrievedContext.currentSituation,
    currentUserAct: retrievedContext.currentUserAct,
    lastAssistantAct: retrievedContext.lastAssistantAct,
    pendingState: retrievedContext.pendingState,
    messageIntents: retrievedContext.messageIntents,
    shortReplyMode: retrievedContext.shortReplyMode
  };
}
