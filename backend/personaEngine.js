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
  knowledge_base: [],
  memory_videos: [],
  chat_examples: [],
  defaults: {
    temperature: 0.65,
    enable_heuristic_replies: true
  }
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
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
  "free",
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
  "today",
  "tomorrow",
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
    aliases: ["talk", "call", "connect"]
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
      "connect",
      "call",
      "meet",
      "meeting",
      "tomorrow",
      "morning",
      "evening",
      "time",
      "free",
      "gym",
      "shuttle",
      "coming",
      "come",
      "go",
      "join",
      "available",
      "plan"
    ])
  ) {
    intents.push("scheduling");
  }

  if (
    hasKeyword(lowerMessage, [
      "gym",
      "sleep",
      "breakfast",
      "lunch",
      "dinner",
      "shuttle",
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
      "travel"
    ])
  ) {
    intents.push("casual");
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

function detectTopicFromText(value) {
  const lowerMessage = expandColloquialText(value);

  if (hasKeyword(lowerMessage, ["shuttle"])) {
    return "shuttle";
  }

  if (hasKeyword(lowerMessage, ["gym", "workout", "push day"])) {
    return "gym";
  }

  if (hasKeyword(lowerMessage, ["call", "connect", "meet", "talk"])) {
    return "call";
  }

  if (hasKeyword(lowerMessage, ["mail", "send", "sent", "share"])) {
    return "mail";
  }

  if (hasKeyword(lowerMessage, ["update", "done", "completed", "finished"])) {
    return "work-status";
  }

  return "";
}

function inferConversationTopic(userMessage, recentMessages) {
  const directTopic = detectTopicFromText(userMessage);

  if (directTopic) {
    return directTopic;
  }

  const recent = Array.isArray(recentMessages) ? [...recentMessages].reverse() : [];

  for (const message of recent) {
    const topic = detectTopicFromText(message?.content);

    if (topic) {
      return topic;
    }
  }

  return "";
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

function detectAssistantPromptType(value) {
  const lowerMessage = expandColloquialText(value);

  if (hasKeyword(lowerMessage, ["enna time", "time sollu", "what time"])) {
    return "ask-time";
  }

  if (hasKeyword(lowerMessage, ["coming ah", "come", "join", "variya"])) {
    return "ask-availability";
  }

  if (hasKeyword(lowerMessage, ["gym ah", "shuttle ah", "pesalaam", "polaam"])) {
    return "suggest-plan";
  }

  return "";
}

function isAffirmativeReply(value) {
  return /^(yes|yeah|yep|ok|okay|seri|sari|ryt|right|sure|vaa|varaen|coming)$/i.test(toText(value));
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
    "gym",
    "free",
    "coming",
    "come",
    "call",
    "connect",
    "time",
    "update",
    "done",
    "sent",
    "mail",
    "saptiya",
    "saaptiya",
    "enga",
    "where",
    "when",
    "morning",
    "evening",
    "shuttle"
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
  const lastPromptType = detectAssistantPromptType(lastAssistantMessage);

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
        "Answer the literal question first using normal world knowledge, while keeping the persona's tone.",
        "If the question is too broad, ask one short clarifying question instead of inventing specifics."
      ]
    };
  }

  if (lastPromptType && /^(what|who|where|why|how)\b/i.test(normalizedMessage)) {
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
  const messageNeed = analyzePersonaReplyNeed(userMessage, recentMessages);

  if (messageNeed.responseMode !== "clarify-topic" || !messageNeed.topicHint) {
    return "";
  }

  if (looksTanglishMessage(userMessage)) {
    return `Theriyum\n${messageNeed.topicHint} la exact-a enna venum? Overview ah, details ah, illa comparison ah?`;
  }

  return `Yeah, I know about ${messageNeed.topicHint}.\nWhat do you want exactly: an overview, details, or a comparison?`;
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
    behaviorRules: unique([
      ...FALLBACK_PROFILE.behavior_rules,
      ...toArray(rawProfile?.behavior_rules).map((item) => toText(item)).filter(Boolean)
    ]),
    knowledgeBase: toArray(rawProfile?.knowledge_base).map((item, index) => ({
      id: toText(item?.id, `fact-${index + 1}`),
      title: toText(item?.title, `Fact ${index + 1}`),
      content: toText(item?.content),
      tags: unique(toArray(item?.tags).map((tag) => toText(tag)).filter(Boolean))
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
    chatExamples: toArray(rawProfile?.chat_examples).map((item, index) => ({
      id: toText(item?.id, `example-${index + 1}`),
      user: toText(item?.user),
      assistant: toText(item?.assistant),
      notes: toText(item?.notes),
      tags: unique(toArray(item?.tags).map((tag) => toText(tag)).filter(Boolean)),
      intents: unique(toArray(item?.intents).map((intent) => toText(intent)).filter(Boolean))
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

function scoreExampleMatch(item, queryTokens, messageIntents) {
  const userScore = scoreText(queryTokens, item.user) * 4;
  const assistantScore = scoreText(queryTokens, item.assistant) * 2;
  const notesScore = scoreText(queryTokens, item.notes);
  const tagScore = scoreTags(queryTokens, item.tags);
  const intentScore = countIntentOverlap(messageIntents, item.intents) * 5;

  let score = userScore + assistantScore + notesScore + tagScore + intentScore;

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

  if (
    queryTokens.length <= 2 &&
    !isWorkMessage &&
    (itemTags.has("nudge") || itemIntents.has("nudge"))
  ) {
    score -= 4;
  }

  return score;
}

export function retrievePersonaContext(profile, userMessage, maxItems = 6) {
  const queryTokens = tokenize(userMessage);
  const messageIntents = inferMessageIntents(userMessage);
  const shortReplyMode = shouldUseShortCasualMode(userMessage, messageIntents, queryTokens);
  const knowledgeMatches = rankItems(profile.knowledgeBase, queryTokens, (item, tokens) => {
    return scoreText(tokens, `${item.title} ${item.content}`) + scoreTags(tokens, item.tags);
  });
  const memoryMatches = rankItems(profile.memoryVideos, queryTokens, (item, tokens) => {
    return (
      scoreText(tokens, `${item.title} ${item.summary} ${item.transcriptSnippets.join(" ")}`) +
      scoreTags(tokens, item.tags)
    );
  });
  const exampleMatches = rankItems(profile.chatExamples, queryTokens, (item, tokens) =>
    scoreExampleMatch(item, tokens, messageIntents)
  );

  return {
    knowledge: knowledgeMatches.slice(0, Math.min(2, maxItems)).map((entry) => entry.item),
    memories: memoryMatches.slice(0, Math.min(2, maxItems)).map((entry) => entry.item),
    examples: exampleMatches.slice(0, Math.min(3, maxItems)).map((entry) => entry.item),
    messageIntents,
    shortReplyMode
  };
}

function buildTimeConfirmationReply(topic, timeReference) {
  if (!timeReference) {
    return "";
  }

  switch (topic) {
    case "shuttle":
      return `Ryt\n${timeReference} shuttle`;
    case "gym":
      return `Ryt\n${timeReference} ku vaa`;
    case "call":
      return `Ryt\n${timeReference} la pesalaam`;
    default:
      return `Ryt\n${timeReference} okay`;
  }
}

export function buildHeuristicPersonaReply(userMessage, recentMessages, retrievedContext) {
  const normalizedMessage = toText(userMessage);
  const lowerMessage = expandColloquialText(normalizedMessage);
  const timeReference = extractTimeReference(normalizedMessage);
  const topic = inferConversationTopic(userMessage, recentMessages);
  const lastAssistantMessage = getLastAssistantMessage(recentMessages);
  const lastPromptType = detectAssistantPromptType(lastAssistantMessage);
  const allowFastPath =
    retrievedContext?.shortReplyMode ||
    (timeReference && ["shuttle", "gym", "call"].includes(topic)) ||
    ((isAffirmativeReply(normalizedMessage) || isNegativeReply(normalizedMessage)) &&
      (Boolean(topic) || Boolean(lastPromptType)));

  if (!allowFastPath) {
    return "";
  }

  const wordCount = countWords(normalizedMessage);
  const isConfirmation =
    timeReference &&
    (/\bok\b/i.test(normalizedMessage) ||
      /\bokay\b/i.test(normalizedMessage) ||
      /\bok va\b/i.test(lowerMessage) ||
      wordCount <= 4);

  if (isAffirmativeReply(normalizedMessage)) {
    if (lastPromptType === "ask-time") {
      return "Time sollu paa";
    }

    if (lastPromptType === "ask-availability") {
      if (topic === "shuttle") {
        return "Ryt\nShuttle ku vaa";
      }

      if (topic === "gym") {
        return "Ryt\nVaa";
      }

      return "Ryt\nVaa";
    }

    if (lastPromptType === "suggest-plan") {
      return "Ryt";
    }

    return topic === "mail" || topic === "work-status" ? "Ryt" : "Okay";
  }

  if (isNegativeReply(normalizedMessage)) {
    if (lastPromptType === "ask-time" || lastPromptType === "ask-availability") {
      return "Seri\nLemme know later";
    }

    return "Okay";
  }

  if (isConfirmation) {
    return buildTimeConfirmationReply(topic, timeReference);
  }

  if (topic === "gym") {
    if (hasKeyword(lowerMessage, ["evening"])) {
      return "Evening vendam paa\nMorning naa 5 to 7 dhaan";
    }

    if (hasKeyword(lowerMessage, ["morning"])) {
      return "Morning la polaam\n5 to 7 dhaan";
    }

    if (hasKeyword(lowerMessage, ["come", "coming", "join", "plan", "go", "gym"])) {
      return "Gym ah?\nMorning naa 5 to 7 dhaan";
    }
  }

  if (topic === "shuttle") {
    if (timeReference) {
      return buildTimeConfirmationReply(topic, timeReference);
    }

    if (hasKeyword(lowerMessage, ["come", "coming", "join", "shuttle", "available"])) {
      return "Shuttle ah?\nEnna time?";
    }
  }

  if (topic === "call") {
    if (timeReference) {
      return buildTimeConfirmationReply(topic, timeReference);
    }

    if (hasKeyword(lowerMessage, ["call", "connect", "talk", "meet"])) {
      return "Pesalaam\nEnna time?";
    }
  }

  if (hasKeyword(lowerMessage, ["free", "available"])) {
    return "Try panlaam\nTime sollu";
  }

  return "";
}

function formatList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatKnowledge(knowledge) {
  if (knowledge.length === 0) {
    return "- None";
  }

  return knowledge
    .map((item) => `- ${item.title}: ${item.content}${item.tags.length ? ` [tags: ${item.tags.join(", ")}]` : ""}`)
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
        `- ${item.user ? `User: ${item.user}` : "User context: unavailable"}\n  ${
          item.assistant ? `Reply: ${item.assistant}` : "Reply: n/a"
        }${
          item.notes ? `\n  Notes: ${item.notes}` : ""
        }${item.intents.length ? `\n  Intents: ${item.intents.join(", ")}` : ""}${
          item.tags.length ? `\n  Tags: ${item.tags.join(", ")}` : ""
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

Rules:
${formatList(profile.behaviorRules)}

Speaking style:
${formatList(person.speakingStyle)}

Signature phrases:
${formatList(person.signaturePhrases)}

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

Latest message handling:
- Response mode: ${activeMessageNeed.responseMode}
- Topic hint: ${activeMessageNeed.topicHint || "None"}
${formatMessageGuidance(activeMessageNeed.guidance)}

Reply mode:
- ${retrievedContext.shortReplyMode ? "Short casual WhatsApp reply." : "Normal persona reply."}

Response guidelines:
- First answer the user's current message clearly; style imitation comes after relevance.
- Match the user's language mix and formality when it fits the persona.
- Default to concise chat-style replies unless the user explicitly asks for depth.
- It is okay to use short multi-line messages if that matches the persona examples.
- For work or planning topics, give a concrete next step instead of vague encouragement.
- Match the situation, not just shared keywords from examples.
- Casual topics like gym, travel, food, or greetings should sound natural and conversational unless the user is clearly avoiding work.
- If the reply mode is short casual, answer in 1 to 2 short lines.
- If the reply mode is short casual, answer the literal question first and do not add explanation unless needed.
- If the reply mode is short casual, avoid lectures, summaries, bullet lists, or long paragraphs.
- If the user asks about a public topic, brand, company, product, place, or concept, answer that topic directly instead of falling back to a random style sample.
- If the user is only checking whether you know a topic, confirm briefly and ask what aspect they want.
- Never answer a factual question with an unrelated catchphrase, tease, or non sequitur.

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
      break;
    }

    trimmedLines.push(compact);
    totalChars = projectedLength;
  }

  return trimmedLines;
}

export function postProcessPersonaReply(reply, retrievedContext) {
  const normalizedReply = toText(reply);

  if (!normalizedReply) {
    return normalizedReply;
  }

  if (!retrievedContext?.shortReplyMode) {
    return normalizedReply;
  }

  const candidateLines = splitIntoReplyLines(normalizedReply);
  const trimmedLines = trimReplyLines(candidateLines);

  if (trimmedLines.length === 0) {
    return normalizedReply;
  }

  return trimmedLines.join("\n");
}

export function getGroundingSummary(retrievedContext) {
  return {
    knowledge: retrievedContext.knowledge.map((item) => item.title),
    memories: retrievedContext.memories.map((item) => item.title),
    examples: retrievedContext.examples.map((item) => item.id),
    messageIntents: retrievedContext.messageIntents,
    shortReplyMode: retrievedContext.shortReplyMode
  };
}
