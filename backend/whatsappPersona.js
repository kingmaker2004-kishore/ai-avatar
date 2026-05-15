function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function compactWhitespace(value) {
  return toText(value).replace(/[\u200e\u200f\u202a-\u202e]/g, "").replace(/\s+/g, " ").trim();
}

function parseMessageStart(line) {
  const patterns = [
    /^\[(?<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s(?<time>\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm)?)\]\s(?<author>[^:]+):\s?(?<content>.*)$/i,
    /^(?<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s(?<time>\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm)?)\s[-\u2013]\s(?<author>[^:]+):\s?(?<content>.*)$/i
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);

    if (match?.groups) {
      return {
        date: compactWhitespace(match.groups.date),
        time: compactWhitespace(match.groups.time),
        author: compactWhitespace(match.groups.author),
        content: toText(match.groups.content)
      };
    }
  }

  return null;
}

function isOmittedMediaMessage(content) {
  const normalized = compactWhitespace(content).toLowerCase();

  return (
    normalized === "<media omitted>" ||
    normalized.endsWith(" omitted") ||
    normalized.includes("image omitted") ||
    normalized.includes("video omitted") ||
    normalized.includes("audio omitted") ||
    normalized.includes("document omitted") ||
    normalized.includes("sticker omitted")
  );
}

function isUsefulMessage(content) {
  const normalized = compactWhitespace(content);

  if (!normalized || isOmittedMediaMessage(normalized)) {
    return false;
  }

  return /[\p{L}\p{N}]/u.test(normalized);
}

function pickEvenlyDistributed(items, maxItems) {
  if (items.length <= maxItems) {
    return items;
  }

  const picked = [];
  const step = (items.length - 1) / (maxItems - 1);

  for (let index = 0; index < maxItems; index += 1) {
    picked.push(items[Math.round(index * step)]);
  }

  return unique(picked);
}

function countWords(value) {
  return compactWhitespace(value).split(/\s+/).filter(Boolean).length;
}

function hasEmoji(value) {
  return /[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/u.test(value);
}

function detectMessageTags(content) {
  const normalized = compactWhitespace(content).toLowerCase();
  const tags = [];

  if (normalized.includes("?")) {
    tags.push("question");
  }

  if (normalized.includes("!")) {
    tags.push("emphasis");
  }

  if (countWords(normalized) <= 4) {
    tags.push("short-reply");
  }

  if (hasEmoji(content)) {
    tags.push("emoji");
  }

  if (/\b(ok|okay|hmm|bro|da|dei|pa|macha|seri|sari|lol|haha|hehe|mm)\b/i.test(normalized)) {
    tags.push("casual");
  }

  if (/\n/.test(content)) {
    tags.push("multi-line");
  }

  return unique(tags);
}

function buildStyleNotes(content) {
  const tags = detectMessageTags(content);

  if (tags.length === 0) {
    return "";
  }

  return `Style cues: ${tags.join(", ")}.`;
}

const TOPIC_DEFINITIONS = [
  {
    id: "work",
    label: "work updates",
    keywords: [
      "update",
      "task",
      "project",
      "work",
      "doc",
      "documentation",
      "report",
      "research",
      "deployment",
      "deploy",
      "frontend",
      "backend",
      "screen recording",
      "recording",
      "review",
      "link",
      "mail",
      "send",
      "sent"
    ]
  },
  {
    id: "scheduling",
    label: "timing and coordination",
    keywords: [
      "time",
      "free",
      "available",
      "morning",
      "evening",
      "tomorrow",
      "today",
      "call",
      "connect",
      "meet",
      "coming",
      "come",
      "join"
    ]
  },
  {
    id: "gym",
    label: "gym and workout plans",
    keywords: ["gym", "workout", "push day", "pull day", "leg day", "exercise"]
  },
  {
    id: "food",
    label: "food and meals",
    keywords: ["saptiya", "saaptiya", "eat", "eating", "food", "breakfast", "lunch", "dinner"]
  },
  {
    id: "travel",
    label: "travel and movement",
    keywords: ["shuttle", "bus", "train", "travel", "coimbatore", "erode", "home", "coming"]
  }
];

const CORE_SITUATION_TYPES = [
  { id: "question", title: "Question handling" },
  { id: "request", title: "Requests and asks" },
  { id: "bad-news", title: "Bad news or setbacks" },
  { id: "celebration", title: "Wins and celebrations" },
  { id: "correction", title: "Corrections and pushback" },
  { id: "general-chat", title: "General chat" },
  { id: "scheduling", title: "Scheduling and timing" },
  { id: "problem-solving", title: "Problems and troubleshooting" }
];

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value) {
  return Number(clampUnit(value).toFixed(2));
}

function ratio(count, total) {
  return total > 0 ? count / total : 0;
}

function averageWords(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 0;
  }

  return (
    messages.reduce((total, message) => total + countWords(message.content), 0) / messages.length
  );
}

function countMessagesMatching(messages, pattern) {
  return messages.filter((message) => pattern.test(compactWhitespace(message.content))).length;
}

function formatFrequencyLabel(count, total) {
  const share = ratio(count, total);

  if (share >= 0.35) {
    return "high";
  }

  if (share >= 0.16) {
    return "medium";
  }

  return "low";
}

function describeScore(score) {
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

function createMessageObjectsFromTexts(texts) {
  return texts
    .map((content) => compactWhitespace(content))
    .filter(Boolean)
    .map((content) => ({ content }));
}

function collectRepeatedPhrases(messages, matcher, limit = 5) {
  const counts = new Map();

  for (const message of messages) {
    const phrase = matcher(compactWhitespace(message.content));

    if (!phrase) {
      continue;
    }

    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

function inferPersonalityTraits(messages) {
  if (messages.length === 0) {
    return {
      humor: 0.3,
      confidence: 0.45,
      empathy: 0.35,
      directness: 0.5,
      verbosity: 0.35
    };
  }

  const total = messages.length;
  const shortReplyRatio = ratio(
    messages.filter((message) => countWords(message.content) <= 4).length,
    total
  );
  const imperativeRatio = ratio(
    countMessagesMatching(
      messages,
      /^(send|share|check|come|vaa|call|connect|make sure|sollu|podu|continue|go|find|use)\b/i
    ),
    total
  );
  const laughterRatio = ratio(
    countMessagesMatching(messages, /\b(haha|hehe|lol|lmao|brooo|daeee)\b|[😂🤣😅]/i),
    total
  );
  const empathyRatio = ratio(
    countMessagesMatching(
      messages,
      /\b(sorry|take care|rest|parava illa|no problem|it's okay|its okay|take your time|great work|awesome|nice|super|proud)\b/i
    ),
    total
  );
  const hedgeRatio = ratio(
    countMessagesMatching(messages, /\b(maybe|probably|perhaps|i think|not sure|try panlaam)\b/i),
    total
  );
  const questionBackRatio = ratio(
    messages.filter((message) => compactWhitespace(message.content).includes("?")).length,
    total
  );
  const avgWords = averageWords(messages);

  return {
    humor: roundScore(0.12 + laughterRatio * 0.72 + ratio(hasEmojiMessages(messages), total) * 0.12),
    confidence: roundScore(0.22 + imperativeRatio * 0.4 + shortReplyRatio * 0.18 - hedgeRatio * 0.2),
    empathy: roundScore(0.12 + empathyRatio * 0.72 + questionBackRatio * 0.08),
    directness: roundScore(
      0.22 + shortReplyRatio * 0.34 + imperativeRatio * 0.22 + questionBackRatio * 0.1 - hedgeRatio * 0.12
    ),
    verbosity: roundScore(avgWords / 16)
  };
}

function hasEmojiMessages(messages) {
  return messages.filter((message) => hasEmoji(message.content)).length;
}

function inferConversationHabits(messages) {
  const greetings = collectRepeatedPhrases(messages, (content) => {
    const match = content.match(/^(hi|hey|hello|hlo|yo|gm|good morning|good night|morning)\b/i);
    return match ? match[0].toLowerCase() : "";
  });
  const closings = collectRepeatedPhrases(messages, (content) => {
    const match = content.match(/\b(bye|gn|good night|tc|take care|see you|later|lemme know)\b$/i);
    return match ? match[0].toLowerCase() : "";
  });
  const abbreviations = collectRepeatedPhrases(messages, (content) => {
    const tokens = content.toLowerCase().match(/\b[a-z]{2,5}\b/g) ?? [];
    const shortlist = tokens.filter((token) =>
      [
        "ok",
        "ryt",
        "bro",
        "dei",
        "pa",
        "la",
        "hmm",
        "lol",
        "hehe",
        "gm",
        "gn",
        "mm"
      ].includes(token)
    );

    return shortlist[0] ?? "";
  });
  const acknowledgementPatterns = collectRepeatedPhrases(messages, (content) => {
    const normalized = content.toLowerCase();

    if (countWords(normalized) > 3) {
      return "";
    }

    return /^(ok|okay|ryt|seri|sari|mm|hmm|super|nice)\b/i.test(normalized)
      ? normalized
      : "";
  });
  const questionRatio = ratio(
    messages.filter((message) => compactWhitespace(message.content).includes("?")).length,
    Math.max(messages.length, 1)
  );
  const exclamationRatio = ratio(
    messages.filter((message) => compactWhitespace(message.content).includes("!")).length,
    Math.max(messages.length, 1)
  );
  const emojiRatio = ratio(hasEmojiMessages(messages), Math.max(messages.length, 1));
  const multilineRatio = ratio(
    messages.filter((message) => /\n/.test(message.content)).length,
    Math.max(messages.length, 1)
  );
  const shortReplyRatio = ratio(
    messages.filter((message) => countWords(message.content) <= 4).length,
    Math.max(messages.length, 1)
  );
  const responseStyle = [];

  if (shortReplyRatio >= 0.45) {
    responseStyle.push("short-reply-first");
  }

  if (questionRatio >= 0.18) {
    responseStyle.push("question-back");
  }

  if (multilineRatio >= 0.12) {
    responseStyle.push("split-lines");
  }

  if (
    ratio(
      countMessagesMatching(
        messages,
        /^(send|share|check|come|vaa|call|connect|make sure|sollu|podu|continue|go|find|use)\b/i
      ),
      Math.max(messages.length, 1)
    ) >= 0.15
  ) {
    responseStyle.push("directive-when-needed");
  }

  return {
    greetings,
    closings,
    abbreviations,
    acknowledgement_patterns: acknowledgementPatterns,
    response_style: responseStyle,
    punctuation_style: {
      exclamation: describeScore(exclamationRatio),
      questions: describeScore(questionRatio),
      ellipsis:
        ratio(
          countMessagesMatching(messages, /\.\.\.|…/),
          Math.max(messages.length, 1)
        ) >= 0.14
          ? "present"
          : "light"
    },
    emoji_style: emojiRatio >= 0.2 ? "frequent" : emojiRatio >= 0.08 ? "occasional" : "rare"
  };
}

function classifySituationType(userText, assistantText = "") {
  const normalizedUser = compactWhitespace(userText).toLowerCase();
  const normalizedAssistant = compactWhitespace(assistantText).toLowerCase();
  const userAct = detectMessageAct(userText);
  const assistantAct = detectMessageAct(assistantText);

  if (["apology", "complaint"].includes(userAct)) {
    return "bad-news";
  }

  if (
    userAct === "update" &&
    includesAnyKeyword(normalizedUser, [
      "done",
      "completed",
      "finished",
      "got it",
      "selected",
      "won",
      "success",
      "finally"
    ])
  ) {
    return "celebration";
  }

  if (
    includesAnyKeyword(normalizedUser, ["error", "issue", "problem", "bug", "fix", "stuck", "help"])
  ) {
    return "problem-solving";
  }

  if (userAct === "correction" || assistantAct === "correction") {
    return "correction";
  }

  if (
    includesAnyKeyword(normalizedUser, [
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

function inferResponseCharacteristics(userText, assistantText) {
  const normalizedAssistant = compactWhitespace(assistantText).toLowerCase();
  const normalizedUser = compactWhitespace(userText).toLowerCase();
  const characteristics = [];

  if (countWords(assistantText) <= 4) {
    characteristics.push("brief");
  }

  if (normalizedAssistant.includes("?")) {
    characteristics.push("question-back");
  }

  if (
    /^(send|share|check|come|vaa|call|connect|make sure|sollu|podu|continue|go|find|use)\b/i.test(
      normalizedAssistant
    )
  ) {
    characteristics.push("directive");
  }

  if (/\b(haha|hehe|lol|brooo|daeee)\b|[😂🤣😅]/i.test(normalizedAssistant)) {
    characteristics.push("playful");
  }

  if (
    /\b(sorry|take care|rest|parava illa|no problem|it's okay|its okay|take your time|great work|awesome|nice|super)\b/i.test(
      normalizedAssistant
    )
  ) {
    characteristics.push("reassuring");
  }

  if (/\b(ok|okay|ryt|seri|sari|mm|hmm)\b/i.test(normalizedAssistant)) {
    characteristics.push("acknowledging");
  }

  if (/\n/.test(assistantText)) {
    characteristics.push("multi-line");
  }

  if (/\b\d{1,2}(:|\.)?\d{0,2}\b/.test(normalizedAssistant) || inferTopicTags(normalizedUser).length > 0) {
    characteristics.push("specific");
  }

  if (
    /\b(wrong|should|never|sonna|not like that|professional)\b/i.test(normalizedAssistant)
  ) {
    characteristics.push("firm");
  }

  return unique(characteristics);
}

function inferTraitsShownByExample(assistantText, responseCharacteristics) {
  const normalized = compactWhitespace(assistantText).toLowerCase();
  const traits = [];

  if (responseCharacteristics.includes("playful")) {
    traits.push("humor");
  }

  if (responseCharacteristics.includes("reassuring")) {
    traits.push("empathy");
  }

  if (
    responseCharacteristics.includes("directive") ||
    responseCharacteristics.includes("firm") ||
    responseCharacteristics.includes("brief")
  ) {
    traits.push("directness");
    traits.push("confidence");
  }

  if (countWords(normalized) >= 12 || responseCharacteristics.includes("multi-line")) {
    traits.push("verbosity");
  }

  return unique(traits);
}

function inferContextRichness(userText) {
  if ((userText.match(/\n/g) ?? []).length >= 2 || countWords(userText) >= 18) {
    return "threaded";
  }

  if (userText.includes("\n") || countWords(userText) >= 8) {
    return "multi-turn";
  }

  return "single-turn";
}

function buildSituationGuidance(situationId, characteristics, traits) {
  const characteristicText = characteristics.length > 0 ? characteristics.join(", ") : "grounded";
  const traitText = traits.length > 0 ? traits.join(", ") : "tone consistency";

  switch (situationId) {
    case "question":
      return `Usually answers questions with ${characteristicText}. Keep ${traitText} visible without dodging the literal ask.`;
    case "request":
      return `For requests, tends to respond in a ${characteristicText} way. Stay practical and decisive.`;
    case "bad-news":
      return `When hearing bad news or a setback, keep the reply ${characteristicText}. Let empathy show before moving to the next step.`;
    case "celebration":
      return `For wins or progress updates, the tone is often ${characteristicText}. Acknowledge first, then react naturally in-character.`;
    case "correction":
      return `Corrections tend to sound ${characteristicText}. Keep the pushback clear without turning robotic.`;
    case "scheduling":
      return `Timing conversations are usually ${characteristicText}. Prefer concise, usable replies over long explanations.`;
    case "problem-solving":
      return `Problem-solving replies are often ${characteristicText}. Focus on the blocker and the next action.`;
    default:
      return `General chat usually sounds ${characteristicText}. Preserve ${traitText} while staying context-aware.`;
  }
}

function analyzeSituationResponses(chatExamples) {
  return CORE_SITUATION_TYPES.map((situation) => {
    const matches = chatExamples.filter((example) => example.situation_type === situation.id);

    if (matches.length === 0) {
      return null;
    }

    const characteristicCounts = countBy(
      matches.flatMap((example) => toArray(example.response_characteristics))
    );
    const traitCounts = countBy(
      matches.flatMap((example) => toArray(example.personality_traits_shown))
    );
    const commonCharacteristics = formatCountLeaders(characteristicCounts, new Map(), 4);
    const shownTraits = formatCountLeaders(traitCounts, new Map(), 3);

    return {
      id: situation.id,
      title: situation.title,
      summary: `${situation.title} often appears in the chat history, and replies are usually ${commonCharacteristics.join(
        ", "
      ) || "grounded"}.`,
      guidance: buildSituationGuidance(situation.id, commonCharacteristics, shownTraits),
      common_characteristics: commonCharacteristics,
      personality_traits_shown: shownTraits,
      example_ids: matches.slice(0, 5).map((example) => example.id),
      frequency: formatFrequencyLabel(matches.length, chatExamples.length)
    };
  })
    .filter(Boolean)
    .sort((left, right) => {
      const frequencyRank = { high: 3, medium: 2, low: 1 };
      return (
        (frequencyRank[right.frequency] ?? 0) - (frequencyRank[left.frequency] ?? 0) ||
        left.title.localeCompare(right.title)
      );
    });
}

function includesAnyKeyword(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

function detectMessageAct(value) {
  const normalized = compactWhitespace(value).toLowerCase();
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
    includesAnyKeyword(normalized, [
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
    includesAnyKeyword(normalized, [
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
    includesAnyKeyword(normalized, [
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

function inferMessageIntents(value) {
  const normalized = compactWhitespace(value).toLowerCase();

  if (!normalized) {
    return ["general"];
  }

  const intents = [];

  if (includesAnyKeyword(normalized, TOPIC_DEFINITIONS[0].keywords)) {
    intents.push("work");
  }

  if (includesAnyKeyword(normalized, TOPIC_DEFINITIONS[1].keywords)) {
    intents.push("scheduling");
  }

  if (
    includesAnyKeyword(normalized, [
      "gym",
      "saptiya",
      "saaptiya",
      "food",
      "home",
      "where",
      "enga",
      "travel",
      "shuttle"
    ])
  ) {
    intents.push("casual");
  }

  if (normalized.includes("?")) {
    intents.push("question");
  }

  if (includesAnyKeyword(normalized, ["help", "issue", "problem", "error", "stuck"])) {
    intents.push("help");
  }

  if (intents.length === 0) {
    intents.push("general");
  }

  return unique(intents);
}

function inferTopicTags(value) {
  const normalized = compactWhitespace(value).toLowerCase();

  if (!normalized) {
    return [];
  }

  return TOPIC_DEFINITIONS.filter((topic) => includesAnyKeyword(normalized, topic.keywords)).map(
    (topic) => topic.id
  );
}

function inferReplyShapeTags(content) {
  const normalized = compactWhitespace(content).toLowerCase();
  const tags = [];

  if (!normalized) {
    return tags;
  }

  if (countWords(normalized) <= 3) {
    tags.push("direct");
  }

  if (normalized.includes("?")) {
    tags.push("question-back");
  }

  if (/\b(ok|okay|ryt|right|seri|sari|super|nice|awesome)\b/i.test(normalized)) {
    tags.push("acknowledgement");
  }

  if (/\n/.test(content)) {
    tags.push("split-lines");
  }

  return unique(tags);
}

function combinePriorContextRun(messages, startIndex, personName) {
  const collected = [];
  let index = startIndex - 1;

  while (index >= 0 && messages[index].author !== personName) {
    collected.push(messages[index]);
    index -= 1;
  }

  collected.reverse();

  const authors = unique(collected.map((message) => compactWhitespace(message.author)));
  const includeAuthorPrefix = authors.length > 1;
  const user = collected
    .map((message) => {
      const content = compactWhitespace(message.content);
      return includeAuthorPrefix ? `${message.author}: ${content}` : content;
    })
    .join("\n");

  return {
    user,
    authors,
    nextIndex: index + 1,
    previousAssistantIndex: index
  };
}

function combinePreviousAssistantRun(messages, endIndex, personName) {
  if (endIndex < 0 || messages[endIndex]?.author !== personName) {
    return "";
  }

  const collected = [];
  let index = endIndex;

  while (index >= 0 && messages[index].author === personName) {
    collected.push(compactWhitespace(messages[index].content));
    index -= 1;
  }

  collected.reverse();
  return collected.join("\n");
}

function buildExampleNotes(
  userText,
  assistantText,
  tags,
  intents,
  authors,
  userAct,
  assistantAct,
  previousAssistantText = ""
) {
  const notes = [];
  const styleNotes = buildStyleNotes(assistantText);

  if (styleNotes) {
    notes.push(styleNotes);
  }

  if (tags.length > 0) {
    notes.push(`Topics: ${tags.join(", ")}.`);
  }

  if (intents.length > 0) {
    notes.push(`Intents: ${intents.join(", ")}.`);
  }

  if (userAct || assistantAct) {
    notes.push(
      `Act flow: ${userAct || "statement"} -> ${assistantAct || "statement"}.`
    );
  }

  if (previousAssistantText) {
    notes.push("This reply continues after the person's previous message.");
  }

  if (authors.length > 1) {
    notes.push("Context came from multiple messages before the reply.");
  } else if (countWords(userText) > 8) {
    notes.push("Context includes a fuller lead-in before the reply.");
  }

  return notes.join(" ");
}

function mergeNotes(...values) {
  const segments = [];

  for (const value of values) {
    const normalized = compactWhitespace(value);

    if (!normalized) {
      continue;
    }

    for (const segment of normalized.split(/(?<=\.)\s+/)) {
      const trimmed = compactWhitespace(segment);

      if (trimmed) {
        segments.push(trimmed);
      }
    }
  }

  return unique(segments).join(" ").trim();
}

function countBy(items) {
  const counts = new Map();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return counts;
}

function formatCountLeaders(counts, labels, limit = 3) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([id]) => labels.get(id) ?? id);
}

function buildKnowledgeEntry({
  id,
  title,
  content,
  tags,
  personalSignificance,
  expertiseLevel,
  emotionalTone,
  frequency
}) {
  return {
    id,
    title,
    content,
    tags,
    personal_significance: personalSignificance,
    expertise_level: expertiseLevel,
    emotional_tone: emotionalTone,
    frequency
  };
}

function buildObservedKnowledgeBase(
  personName,
  chatExamples,
  speakingStyle,
  signaturePhrases,
  personalityTraits,
  conversationHabits,
  situationResponses
) {
  const topicLabels = new Map(TOPIC_DEFINITIONS.map((topic) => [topic.id, topic.label]));
  const topicCounts = countBy(chatExamples.flatMap((example) => inferTopicTags(example.user)));
  const intentCounts = countBy(chatExamples.flatMap((example) => example.intents));
  const topTopics = formatCountLeaders(topicCounts, topicLabels);
  const topIntents = formatCountLeaders(intentCounts, new Map());
  const entries = [];

  entries.push(
    buildKnowledgeEntry({
      id: "observed-style",
      title: "Observed reply style",
      content: `${personName} usually replies in a WhatsApp rhythm. ${speakingStyle
        .slice(0, 3)
        .join(" ")}${signaturePhrases.length ? ` Repeated phrase cues include ${signaturePhrases.join(", ")}.` : ""}`,
      tags: ["style", ...topTopics]
        .filter(Boolean),
      personalSignificance: "core speech pattern",
      expertiseLevel: "high",
      emotionalTone: `directness ${describeScore(personalityTraits.directness)}, empathy ${describeScore(
        personalityTraits.empathy
      )}`,
      frequency: "high"
    })
  );

  if (
    signaturePhrases.length > 0 ||
    conversationHabits.abbreviations.length > 0 ||
    conversationHabits.acknowledgement_patterns.length > 0
  ) {
    entries.push(
      buildKnowledgeEntry({
        id: "shared-shorthand",
        title: "Shared shorthand and inside language",
        content: `${personName} often uses shorthand like ${[
          ...signaturePhrases,
          ...conversationHabits.abbreviations,
          ...conversationHabits.acknowledgement_patterns
        ]
          .slice(0, 8)
          .join(", ")}. These are part of the natural chat rhythm and should appear only when the situation fits.`,
        tags: ["style", "inside-language", ...topTopics].filter(Boolean),
        personalSignificance: "shared chat shorthand",
        expertiseLevel: "n/a",
        emotionalTone: personalityTraits.humor >= 0.5 ? "playful" : "casual",
        frequency: "medium"
      })
    );
  }

  if (topTopics.length > 0) {
    for (const topicId of topTopics.slice(0, 3)) {
      const topicCount = topicCounts.get(
        [...topicLabels.entries()].find(([, label]) => label === topicId)?.[0] ?? topicId
      );
      entries.push(
        buildKnowledgeEntry({
          id: `topic-${topicId.replace(/\s+/g, "-")}`,
          title: `Shared context: ${topicId}`,
          content: `This conversation repeatedly returns to ${topicId}. Replies on this topic should feel like an ongoing shared context, not a fresh generic answer.`,
          tags: ["context", topicId],
          personalSignificance: "recurring shared topic",
          expertiseLevel: topicId.includes("work") ? "high" : "medium",
          emotionalTone: topicId.includes("work") ? "practical" : "familiar",
          frequency: formatFrequencyLabel(topicCount ?? 0, chatExamples.length)
        })
      );
    }
  }

  if (topIntents.length > 0) {
    entries.push(
      buildKnowledgeEntry({
        id: "observed-intents",
        title: "Common reply patterns",
        content: `${personName} is often responding in ${topIntents.join(
          ", "
        )} situations, so short follow-ups should stay grounded in the immediate chat context.`,
        tags: ["patterns", ...topTopics, ...topIntents].filter(Boolean),
        personalSignificance: "response tendency",
        expertiseLevel: "n/a",
        emotionalTone: "situational",
        frequency: "high"
      })
    );
  }

  if (situationResponses.length > 0) {
    const topSituation = situationResponses[0];
    entries.push(
      buildKnowledgeEntry({
        id: "situation-signature",
        title: "Situation handling signature",
        content: `A recurring response pattern is visible in ${topSituation.title.toLowerCase()} situations. ${topSituation.guidance}`,
        tags: ["situations", topSituation.id, ...topTopics].filter(Boolean),
        personalSignificance: "response signature",
        expertiseLevel: "n/a",
        emotionalTone: topSituation.common_characteristics.join(", ") || "grounded",
        frequency: topSituation.frequency
      })
    );
  }

  return entries;
}

function summarizePersona(personName, chatExamples, speakingStyle, personalityTraits) {
  const topicLabels = new Map(TOPIC_DEFINITIONS.map((topic) => [topic.id, topic.label]));
  const topicCounts = countBy(chatExamples.flatMap((example) => inferTopicTags(example.user)));
  const topTopics = formatCountLeaders(topicCounts, topicLabels, 2);
  const styleLead = speakingStyle[0] ?? "Uses natural WhatsApp-style replies.";
  const topicLead =
    topTopics.length > 0 ? `Common contexts include ${topTopics.join(" and ")}.` : "";
  const traitLead = `The tone tends to be ${describeScore(
    personalityTraits.directness
  )} in directness, ${describeScore(personalityTraits.confidence)} in confidence, and ${describeScore(
    personalityTraits.empathy
  )} in empathy.`;

  return `${personName} replies like a real WhatsApp contact, not a generic assistant. ${styleLead} ${traitLead} ${topicLead}`.trim();
}

function summarizeRelationship(chatExamples, personalityTraits) {
  const intentCounts = countBy(chatExamples.flatMap((example) => example.intents));
  const workCount = intentCounts.get("work") ?? 0;
  const schedulingCount = intentCounts.get("scheduling") ?? 0;

  if (workCount >= schedulingCount && workCount > 0) {
    return personalityTraits.empathy >= 0.5
      ? "Talk to the user like someone who coordinates work closely, keeps the chat practical, and still shows some warmth when needed."
      : "Talk to the user like someone who often coordinates work, checks progress, and keeps replies practical in chat.";
  }

  if (schedulingCount > 0) {
    return personalityTraits.humor >= 0.5
      ? "Talk to the user like someone familiar who coordinates timing and everyday plans through quick, lightly playful chat replies."
      : "Talk to the user like someone familiar who coordinates timing and everyday plans through quick chat replies.";
  }

  return "Talk to the user like a familiar contact in a natural WhatsApp rhythm, keeping replies grounded and specific.";
}

function enrichChatExamples(chatExamples) {
  return chatExamples.map((example, index) => {
    const userText = compactWhitespace(example.user);
    const assistantText = compactWhitespace(example.assistant);
    const previousAssistantText = compactWhitespace(example.previous_assistant);
    const previousAssistantAct =
      toText(example.previous_assistant_act) || detectMessageAct(previousAssistantText);
    const userMessageAct = toText(example.user_message_act) || detectMessageAct(userText);
    const assistantMessageAct =
      toText(example.assistant_message_act) || detectMessageAct(assistantText);
    const existingIntents = toArray(example.intents).map((intent) => compactWhitespace(intent)).filter(Boolean);
    const intents = unique([
      ...inferMessageIntents(userText),
      ...(toText(example.notes).toLowerCase().includes("question") ? ["question"] : []),
      ...existingIntents
    ]);
    const topicTags = unique([...inferTopicTags(userText), ...inferTopicTags(assistantText)]);
    const tags = unique([
      "contextual-reply",
      ...detectMessageTags(assistantText),
      ...inferReplyShapeTags(assistantText),
      ...topicTags,
      ...toArray(example.tags).map((tag) => compactWhitespace(tag).toLowerCase()).filter(Boolean)
    ]);
    const preservedNotes = toText(example.notes);
    const generatedNotes = buildExampleNotes(
      userText,
      assistantText,
      topicTags,
      intents,
      [],
      userMessageAct,
      assistantMessageAct,
      previousAssistantText
    );
    const responseCharacteristics = inferResponseCharacteristics(userText, assistantText);
    const personalityTraitsShown = inferTraitsShownByExample(assistantText, responseCharacteristics);
    const situationType =
      toText(example.situation_type) || classifySituationType(userText, assistantText);

    return {
      id: example.id || `imported-example-${index + 1}`,
      user: userText,
      assistant: assistantText,
      notes: mergeNotes(preservedNotes, generatedNotes),
      tags,
      intents,
      previous_assistant: previousAssistantText,
      previous_assistant_act: previousAssistantAct,
      user_message_act: userMessageAct,
      assistant_message_act: assistantMessageAct,
      situation_type: situationType,
      response_characteristics: responseCharacteristics,
      personality_traits_shown: personalityTraitsShown,
      context_richness: toText(example.context_richness) || inferContextRichness(userText)
    };
  });
}

export function enrichImportedPersonaProfile(rawProfile) {
  if (!rawProfile || typeof rawProfile !== "object") {
    return rawProfile;
  }

  const personName = toText(rawProfile?.person?.name) || "Imported Persona";
  const baseExamples = toArray(rawProfile?.chat_examples).map((item, index) => ({
    id: toText(item?.id, `imported-example-${index + 1}`),
    user: toText(item?.user),
    assistant: toText(item?.assistant),
    notes: toText(item?.notes),
    tags: unique(toArray(item?.tags).map((tag) => toText(tag)).filter(Boolean)),
    intents: unique(toArray(item?.intents).map((intent) => toText(intent)).filter(Boolean)),
    previous_assistant: toText(item?.previous_assistant),
    previous_assistant_act: toText(item?.previous_assistant_act),
    user_message_act: toText(item?.user_message_act),
    assistant_message_act: toText(item?.assistant_message_act),
    situation_type: toText(item?.situation_type),
    response_characteristics: unique(
      toArray(item?.response_characteristics).map((entry) => toText(entry)).filter(Boolean)
    ),
    personality_traits_shown: unique(
      toArray(item?.personality_traits_shown).map((entry) => toText(entry)).filter(Boolean)
    ),
    context_richness: toText(item?.context_richness)
  }));
  const chatExamples = enrichChatExamples(baseExamples);
  const speakingStyle = unique([
    ...toArray(rawProfile?.person?.speaking_style).map((item) => toText(item)).filter(Boolean)
  ]);
  const signaturePhrases = unique(
    toArray(rawProfile?.person?.signature_phrases).map((item) => toText(item)).filter(Boolean)
  );
  const personaSourceMessages = createMessageObjectsFromTexts([
    ...chatExamples.map((example) => example.assistant),
    ...toArray(rawProfile?.style_samples)
  ]);
  const personalityTraits =
    rawProfile?.personality_traits && typeof rawProfile.personality_traits === "object"
      ? {
          humor: roundScore(rawProfile.personality_traits.humor ?? 0.3),
          confidence: roundScore(rawProfile.personality_traits.confidence ?? 0.45),
          empathy: roundScore(rawProfile.personality_traits.empathy ?? 0.35),
          directness: roundScore(rawProfile.personality_traits.directness ?? 0.5),
          verbosity: roundScore(rawProfile.personality_traits.verbosity ?? 0.35)
        }
      : inferPersonalityTraits(personaSourceMessages);
  const conversationHabits =
    rawProfile?.conversation_habits && typeof rawProfile.conversation_habits === "object"
      ? {
          greetings: unique(
            toArray(rawProfile.conversation_habits.greetings).map((item) => toText(item)).filter(Boolean)
          ),
          closings: unique(
            toArray(rawProfile.conversation_habits.closings).map((item) => toText(item)).filter(Boolean)
          ),
          abbreviations: unique(
            toArray(rawProfile.conversation_habits.abbreviations).map((item) => toText(item)).filter(Boolean)
          ),
          acknowledgement_patterns: unique(
            toArray(rawProfile.conversation_habits.acknowledgement_patterns)
              .map((item) => toText(item))
              .filter(Boolean)
          ),
          response_style: unique(
            toArray(rawProfile.conversation_habits.response_style).map((item) => toText(item)).filter(Boolean)
          ),
          punctuation_style: rawProfile.conversation_habits.punctuation_style ?? {
            exclamation: "light",
            questions: "medium",
            ellipsis: "light"
          },
          emoji_style: toText(rawProfile.conversation_habits.emoji_style, "rare")
        }
      : inferConversationHabits(personaSourceMessages);
  const situationResponses =
    toArray(rawProfile?.situation_responses).length > 0
      ? rawProfile.situation_responses
      : analyzeSituationResponses(chatExamples);
  const shouldRegenerateKnowledgeBase =
    toArray(rawProfile?.knowledge_base).length === 0 ||
    toArray(rawProfile?.knowledge_base).some(
      (entry) =>
        !toText(entry?.personal_significance) ||
        !toText(entry?.expertise_level) ||
        !toText(entry?.emotional_tone) ||
        !toText(entry?.frequency)
    );
  const knowledgeBase =
    shouldRegenerateKnowledgeBase
      ? buildObservedKnowledgeBase(
          personName,
          chatExamples,
          speakingStyle,
          signaturePhrases,
          personalityTraits,
          conversationHabits,
          situationResponses
        )
      : rawProfile.knowledge_base;

  return {
    ...rawProfile,
    person: {
      ...rawProfile.person,
      summary: summarizePersona(personName, chatExamples, speakingStyle, personalityTraits),
      relationshipToUser: summarizeRelationship(chatExamples, personalityTraits)
    },
    personality_traits: personalityTraits,
    conversation_habits: conversationHabits,
    knowledge_base: knowledgeBase,
    situation_responses: situationResponses,
    chat_examples: chatExamples,
    defaults: {
      ...rawProfile.defaults,
      temperature:
        typeof rawProfile?.defaults?.temperature === "number"
          ? rawProfile.defaults.temperature
          : 0.7,
      enable_heuristic_replies: true
    }
  };
}

function inferSpeakingStyle(messages) {
  if (messages.length === 0) {
    return [
      "Uses natural WhatsApp-style replies.",
      "Keeps the tone conversational and direct."
    ];
  }

  const wordCounts = messages.map((message) => countWords(message.content));
  const averageWords =
    wordCounts.reduce((total, value) => total + value, 0) / Math.max(wordCounts.length, 1);
  const questionRatio =
    messages.filter((message) => message.content.includes("?")).length / messages.length;
  const emojiRatio =
    messages.filter((message) => hasEmoji(message.content)).length / messages.length;
  const shortReplyRatio =
    messages.filter((message) => countWords(message.content) <= 4).length / messages.length;
  const multilineRatio = messages.filter((message) => /\n/.test(message.content)).length / messages.length;
  const style = [];

  if (averageWords <= 6) {
    style.push("Usually replies with short, quick WhatsApp messages.");
  } else if (averageWords >= 14) {
    style.push("Often gives fuller replies instead of one-word answers.");
  } else {
    style.push("Uses medium-length chat replies that stay conversational.");
  }

  if (shortReplyRatio >= 0.4) {
    style.push("Comfortable sending very short acknowledgements when the moment calls for it.");
  }

  if (questionRatio >= 0.18) {
    style.push("Often asks follow-up questions to keep the conversation moving.");
  }

  if (multilineRatio >= 0.12) {
    style.push("Sometimes breaks thoughts into separate short lines.");
  }

  if (emojiRatio >= 0.1) {
    style.push("Uses emoji naturally when it fits the tone.");
  }

  if (
    messages.some((message) =>
      /\b(ok|okay|bro|da|dei|macha|seri|sari|lol|haha|hehe|hmm)\b/i.test(message.content)
    )
  ) {
    style.push("Leans into casual chat wording instead of formal phrasing.");
  }

  return unique(style);
}

function inferSignaturePhrases(messages) {
  const frequencies = new Map();

  for (const message of messages) {
    const normalized = compactWhitespace(message.content);
    const words = normalized.split(/\s+/).filter(Boolean);

    if (words.length > 0 && words.length <= 4) {
      const key = normalized.toLowerCase();
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    }

    if (words.length >= 2) {
      const opening = words.slice(0, 2).join(" ").toLowerCase();
      frequencies.set(opening, (frequencies.get(opening) ?? 0) + 1);
    }
  }

  return [...frequencies.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([phrase]) => phrase)
    .map((phrase) => phrase.replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

function buildStyleSamples(messages) {
  const samples = messages
    .map((message) => compactWhitespace(message.content))
    .filter((message) => message.length >= 2 && message.length <= 180);

  return pickEvenlyDistributed(unique(samples), 10);
}

function combineAssistantRun(messages, startIndex, personName) {
  const collected = [];
  let index = startIndex;

  while (index < messages.length && messages[index].author === personName) {
    collected.push(compactWhitespace(messages[index].content));
    index += 1;
  }

  return {
    assistant: collected.join("\n"),
    nextIndex: index
  };
}

function buildChatExamples(allMessages, personName) {
  const examples = [];

  for (let index = 0; index < allMessages.length; index += 1) {
    const currentMessage = allMessages[index];

    if (currentMessage.author !== personName) {
      continue;
    }

    const previousMessage = allMessages[index - 1];

    if (!previousMessage || previousMessage.author === personName) {
      continue;
    }

    const assistantRun = combineAssistantRun(allMessages, index, personName);
    const priorContext = combinePriorContextRun(allMessages, index, personName);
    const previousAssistantText = combinePreviousAssistantRun(
      allMessages,
      priorContext.previousAssistantIndex,
      personName
    );
    const userText = compactWhitespace(priorContext.user);
    const assistantText = compactWhitespace(assistantRun.assistant);
    const previousAssistantAct = detectMessageAct(previousAssistantText);
    const intents = inferMessageIntents(userText);
    const userMessageAct = detectMessageAct(userText);
    const assistantMessageAct = detectMessageAct(assistantText);
    const topicTags = unique([...inferTopicTags(userText), ...inferTopicTags(assistantText)]);
    const tags = unique([
      "contextual-reply",
      ...detectMessageTags(assistantText),
      ...inferReplyShapeTags(assistantText),
      ...topicTags
    ]);

    if (!userText || !assistantText) {
      index = assistantRun.nextIndex - 1;
      continue;
    }

    examples.push({
      id: `imported-example-${examples.length + 1}`,
      user: userText,
      assistant: assistantText,
      notes: buildExampleNotes(
        userText,
        assistantText,
        topicTags,
        intents,
        priorContext.authors,
        userMessageAct,
        assistantMessageAct,
        previousAssistantText
      ),
      tags,
      intents,
      previous_assistant: previousAssistantText,
      previous_assistant_act: previousAssistantAct,
      user_message_act: userMessageAct,
      assistant_message_act: assistantMessageAct
    });

    index = assistantRun.nextIndex - 1;
  }

  if (examples.length > 0) {
    return pickEvenlyDistributed(examples, 24);
  }

  const fallbackSamples = allMessages
    .filter((message) => message.author === personName)
    .map((message, index) => ({
      id: `imported-example-${index + 1}`,
      user: "",
      assistant: compactWhitespace(message.content),
      notes: buildExampleNotes(
        "",
        message.content,
        inferTopicTags(message.content),
        ["general"],
        [],
        "",
        detectMessageAct(message.content),
        ""
      ),
      tags: unique([
        ...detectMessageTags(message.content),
        ...inferReplyShapeTags(message.content),
        ...inferTopicTags(message.content)
      ]),
      intents: ["general"],
      previous_assistant: "",
      previous_assistant_act: "",
      user_message_act: "",
      assistant_message_act: detectMessageAct(message.content)
    }));

  return pickEvenlyDistributed(fallbackSamples, 24);
}

export function parseWhatsAppChat(chatText) {
  const normalizedText = typeof chatText === "string" ? chatText.replace(/\r/g, "") : "";

  if (!normalizedText.trim()) {
    return [];
  }

  const messages = [];
  let currentMessage = null;

  for (const rawLine of normalizedText.split("\n")) {
    const line = rawLine.trimEnd();
    const parsedStart = parseMessageStart(line);

    if (parsedStart) {
      if (currentMessage && isUsefulMessage(currentMessage.content)) {
        messages.push({
          ...currentMessage,
          content: currentMessage.content.trim()
        });
      }

      currentMessage = parsedStart;
      continue;
    }

    if (!currentMessage) {
      continue;
    }

    const continuation = rawLine.trim();

    if (!continuation) {
      continue;
    }

    currentMessage.content = `${currentMessage.content}\n${continuation}`.trim();
  }

  if (currentMessage && isUsefulMessage(currentMessage.content)) {
    messages.push({
      ...currentMessage,
      content: currentMessage.content.trim()
    });
  }

  return messages.filter((message) => message.author && isUsefulMessage(message.content));
}

export function getWhatsAppParticipants(messages) {
  const counts = new Map();

  for (const message of messages) {
    if (!message.author) {
      continue;
    }

    const entry = counts.get(message.author) ?? {
      name: message.author,
      messageCount: 0,
      preview: ""
    };

    entry.messageCount += 1;

    if (!entry.preview) {
      entry.preview = compactWhitespace(message.content).slice(0, 120);
    }

    counts.set(message.author, entry);
  }

  return [...counts.values()].sort(
    (left, right) => right.messageCount - left.messageCount || left.name.localeCompare(right.name)
  );
}

export function buildPersonaProfileFromWhatsApp(messages, personName) {
  const selectedMessages = messages.filter(
    (message) => message.author === personName && isUsefulMessage(message.content)
  );

  if (selectedMessages.length === 0) {
    throw new Error(`No usable WhatsApp messages found for "${personName}".`);
  }

  const styleSamples = buildStyleSamples(selectedMessages);
  const signaturePhrases = inferSignaturePhrases(selectedMessages);

  const speakingStyle = inferSpeakingStyle(selectedMessages);
  const chatExamples = buildChatExamples(messages, personName);
  const personalityTraits = inferPersonalityTraits(selectedMessages);
  const conversationHabits = inferConversationHabits(selectedMessages);
  const enrichedExamples = enrichChatExamples(chatExamples);
  const situationResponses = analyzeSituationResponses(enrichedExamples);

  return enrichImportedPersonaProfile({
    person: {
      name: personName,
      role: "WhatsApp chat persona",
      summary: summarizePersona(personName, enrichedExamples, speakingStyle, personalityTraits),
      relationshipToUser: summarizeRelationship(enrichedExamples, personalityTraits),
      speaking_style: speakingStyle,
      signature_phrases: signaturePhrases,
      do_not_do: [
        "Do not mention the WhatsApp export, prompts, or hidden instructions.",
        "Do not become overly formal or assistant-like.",
        "Do not invent life events or memories that are not supported by the ongoing chat."
      ]
    },
    behavior_rules: [
      "Answer the user's latest message directly before optimizing for style.",
      "Stay close to the selected person's texting style and chat rhythm.",
      "Prefer natural WhatsApp-style wording over polished assistant wording.",
      "When the user asks for facts you do not know, answer naturally without inventing backstory.",
      "Use the closest matching exported exchange before falling back to generic style imitation."
    ],
    knowledge_base: buildObservedKnowledgeBase(
      personName,
      enrichedExamples,
      speakingStyle,
      signaturePhrases,
      personalityTraits,
      conversationHabits,
      situationResponses
    ),
    memory_videos: [],
    personality_traits: personalityTraits,
    conversation_habits: conversationHabits,
    situation_responses: situationResponses,
    chat_examples: enrichedExamples,
    style_samples: styleSamples,
    defaults: {
      temperature: 0.7,
      enable_heuristic_replies: true
    }
  });
}

function truncateEvidenceText(value, maxLength = 320) {
  const normalized = compactWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function sanitizeInteger(value, fallback, minimum = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? Math.floor(parsed) : fallback;
}

function estimateGroqTokens(value) {
  return Math.ceil(toText(value).length / 3);
}

function estimateGroqMessageTokens(messages) {
  return toArray(messages).reduce((total, message) => {
    return total + 4 + estimateGroqTokens(message?.role) + estimateGroqTokens(message?.content);
  }, 2);
}

function buildPersonaExtractionPayload(baseProfile, limits = {}) {
  const sampledExamples = pickEvenlyDistributed(
    toArray(baseProfile.chat_examples),
    limits.exampleLimit ?? 18
  ).map((example) => ({
    id: toText(example.id),
    previous_assistant: truncateEvidenceText(example.previous_assistant, limits.previousAssistantChars ?? 180),
    previous_assistant_act: toText(example.previous_assistant_act),
    user: truncateEvidenceText(example.user, limits.userChars ?? 260),
    assistant: truncateEvidenceText(example.assistant, limits.assistantChars ?? 220),
    user_message_act: toText(example.user_message_act),
    assistant_message_act: toText(example.assistant_message_act),
    situation_type: toText(example.situation_type),
    response_characteristics: toArray(example.response_characteristics)
      .map((item) => toText(item))
      .filter(Boolean),
    personality_traits_shown: toArray(example.personality_traits_shown)
      .map((item) => toText(item))
      .filter(Boolean),
    context_richness: toText(example.context_richness),
    notes: truncateEvidenceText(example.notes, limits.notesChars ?? 180)
  }));

  return {
    person_name: toText(baseProfile?.person?.name),
    heuristic_summary: truncateEvidenceText(baseProfile?.person?.summary, limits.summaryChars ?? 220),
    heuristic_relationship_to_user: truncateEvidenceText(
      baseProfile?.person?.relationshipToUser,
      limits.relationshipChars ?? 160
    ),
    heuristic_personality_traits: baseProfile?.personality_traits ?? {},
    heuristic_conversation_habits: baseProfile?.conversation_habits ?? {},
    heuristic_behavior_rules: toArray(baseProfile?.behavior_rules)
      .map((item) => toText(item))
      .filter(Boolean)
      .slice(0, limits.behaviorRuleLimit ?? 8),
    heuristic_situation_responses: toArray(baseProfile?.situation_responses).slice(
      0,
      limits.situationLimit ?? 8
    ),
    heuristic_knowledge_base: toArray(baseProfile?.knowledge_base)
      .slice(0, limits.knowledgeLimit ?? 6)
      .map((entry) => ({
        ...entry,
        title: truncateEvidenceText(entry?.title, 90),
        content: truncateEvidenceText(entry?.content, limits.knowledgeChars ?? 180),
        personal_significance: truncateEvidenceText(entry?.personal_significance, 90)
      })),
    speaking_style: toArray(baseProfile?.person?.speaking_style)
      .map((item) => truncateEvidenceText(item, limits.speakingStyleChars ?? 90))
      .filter(Boolean)
      .slice(0, limits.speakingStyleLimit ?? 8),
    signature_phrases: toArray(baseProfile?.person?.signature_phrases)
      .map((item) => truncateEvidenceText(item, limits.signaturePhraseChars ?? 60))
      .filter(Boolean)
      .slice(0, limits.signaturePhraseLimit ?? 8),
    style_samples: toArray(baseProfile?.style_samples)
      .map((item) => truncateEvidenceText(item, limits.styleSampleChars ?? 140))
      .filter(Boolean)
      .slice(0, limits.styleSampleLimit ?? 10),
    chat_examples: sampledExamples
  };
}

function buildPersonaExtractionUserPrompt(extractionPayload) {
  return `
Analyze this WhatsApp-chat persona evidence and return a JSON object with this exact top-level shape:
{
  "person": {
    "summary": "string",
    "relationshipToUser": "string",
    "speaking_style": ["string"],
    "signature_phrases": ["string"]
  },
  "personality_traits": {
    "humor": 0,
    "confidence": 0,
    "empathy": 0,
    "directness": 0,
    "verbosity": 0
  },
  "conversation_habits": {
    "greetings": ["string"],
    "closings": ["string"],
    "abbreviations": ["string"],
    "acknowledgement_patterns": ["string"],
    "response_style": ["string"],
    "punctuation_style": {
      "exclamation": "light|medium|high",
      "questions": "light|medium|high",
      "ellipsis": "light|present|high"
    },
    "emoji_style": "rare|occasional|frequent"
  },
  "behavior_rules": ["string"],
  "knowledge_base": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "tags": ["string"],
      "personal_significance": "string",
      "expertise_level": "low|medium|high|n/a",
      "emotional_tone": "string",
      "frequency": "low|medium|high"
    }
  ],
  "situation_responses": [
    {
      "id": "one of the allowed ids",
      "title": "string",
      "summary": "string",
      "guidance": "string",
      "common_characteristics": ["string"],
      "personality_traits_shown": ["string"],
      "example_ids": ["string"],
      "frequency": "low|medium|high"
    }
  ]
}

Evidence JSON:
${JSON.stringify(extractionPayload, null, 2)}
`.trim();
}

function selectPersonaExtractionRequest(baseProfile, systemPrompt) {
  const maxTokensPerRequest = sanitizeInteger(
    process.env.GROQ_PERSONA_MAX_TOKENS ?? process.env.MAX_TOKENS_PER_REQUEST,
    7000,
    1000
  );
  const responseTokenReserve = sanitizeInteger(process.env.GROQ_RESPONSE_TOKEN_RESERVE, 1200, 200);
  const personaPromptBudget = sanitizeInteger(process.env.GROQ_PERSONA_PROMPT_TOKEN_BUDGET, 4200, 1000);
  const maxPromptTokens = Math.min(
    Math.max(1000, maxTokensPerRequest - responseTokenReserve),
    personaPromptBudget
  );
  const variants = [
    { mode: "full", limits: {} },
    {
      mode: "reduced",
      limits: {
        exampleLimit: 12,
        styleSampleLimit: 8,
        styleSampleChars: 110,
        userChars: 220,
        assistantChars: 180,
        notesChars: 120,
        knowledgeLimit: 4,
        knowledgeChars: 140
      }
    },
    {
      mode: "compact",
      limits: {
        exampleLimit: 8,
        styleSampleLimit: 6,
        styleSampleChars: 90,
        userChars: 180,
        assistantChars: 140,
        previousAssistantChars: 120,
        notesChars: 90,
        knowledgeLimit: 3,
        knowledgeChars: 120,
        situationLimit: 6,
        behaviorRuleLimit: 6,
        speakingStyleLimit: 5,
        signaturePhraseLimit: 5
      }
    },
    {
      mode: "minimal",
      limits: {
        exampleLimit: 5,
        styleSampleLimit: 4,
        styleSampleChars: 70,
        userChars: 120,
        assistantChars: 110,
        previousAssistantChars: 90,
        notesChars: 70,
        knowledgeLimit: 2,
        knowledgeChars: 90,
        situationLimit: 4,
        behaviorRuleLimit: 4,
        speakingStyleLimit: 4,
        signaturePhraseLimit: 4,
        summaryChars: 150,
        relationshipChars: 100
      }
    }
  ];

  let selected = null;

  for (const variant of variants) {
    const extractionPayload = buildPersonaExtractionPayload(baseProfile, variant.limits);
    const userPrompt = buildPersonaExtractionUserPrompt(extractionPayload);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    const estimatedTokens = estimateGroqMessageTokens(messages);

    selected = {
      mode: variant.mode,
      extractionPayload,
      userPrompt,
      messages,
      estimatedTokens
    };

    if (estimatedTokens <= maxPromptTokens) {
      return selected;
    }
  }

  return selected;
}

function extractJsonObjectFromText(value) {
  const normalized = toText(value);

  if (!normalized) {
    throw new Error("Groq returned an empty persona extraction response.");
  }

  const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const fencedPayload = toText(fenceMatch?.[1]);
  const objectStart = normalized.indexOf("{");
  const objectEnd = normalized.lastIndexOf("}");
  const objectSlice =
    objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart
      ? normalized.slice(objectStart, objectEnd + 1)
      : "";

  const candidates = [normalized, fencedPayload, objectSlice]
    .map((item) => toText(item))
    .filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      const repaired = candidate
        .replace(/^[\uFEFF]/, "")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/[\u201C\u201D]/g, "\"")
        .replace(/[\u2018\u2019]/g, "'");

      try {
        return JSON.parse(repaired);
      } catch {
        // Try next candidate
      }
    }
  }

  throw new Error("Groq persona extraction did not contain valid JSON.");
}

function toScore(value, fallback) {
  return typeof value === "number" && Number.isFinite(value)
    ? roundScore(value)
    : fallback;
}

function mergeTraitScores(baseTraits, extractedTraits) {
  return {
    humor: toScore(
      extractedTraits?.humor,
      baseTraits?.humor ?? 0.3
    ),
    confidence: toScore(
      extractedTraits?.confidence,
      baseTraits?.confidence ?? 0.45
    ),
    empathy: toScore(
      extractedTraits?.empathy,
      baseTraits?.empathy ?? 0.35
    ),
    directness: toScore(
      extractedTraits?.directness,
      baseTraits?.directness ?? 0.5
    ),
    verbosity: toScore(
      extractedTraits?.verbosity,
      baseTraits?.verbosity ?? 0.35
    )
  };
}

function mergeUniqueTextArrays(...values) {
  return unique(
    values
      .flatMap((value) => toArray(value))
      .map((item) => toText(item))
      .filter(Boolean)
  );
}

function mergeConversationHabits(baseHabits, extractedHabits) {
  const basePunctuation = baseHabits?.punctuation_style ?? {};
  const extractedPunctuation = extractedHabits?.punctuation_style ?? {};

  return {
    greetings: mergeUniqueTextArrays(baseHabits?.greetings, extractedHabits?.greetings),
    closings: mergeUniqueTextArrays(baseHabits?.closings, extractedHabits?.closings),
    abbreviations: mergeUniqueTextArrays(baseHabits?.abbreviations, extractedHabits?.abbreviations),
    acknowledgement_patterns: mergeUniqueTextArrays(
      baseHabits?.acknowledgement_patterns,
      extractedHabits?.acknowledgement_patterns
    ),
    response_style: mergeUniqueTextArrays(baseHabits?.response_style, extractedHabits?.response_style),
    punctuation_style: {
      exclamation: toText(extractedPunctuation.exclamation, toText(basePunctuation.exclamation, "light")),
      questions: toText(extractedPunctuation.questions, toText(basePunctuation.questions, "medium")),
      ellipsis: toText(extractedPunctuation.ellipsis, toText(basePunctuation.ellipsis, "light"))
    },
    emoji_style: toText(extractedHabits?.emoji_style, toText(baseHabits?.emoji_style, "rare"))
  };
}

function mergeBehaviorRules(baseRules, extractedRules) {
  return mergeUniqueTextArrays(baseRules, extractedRules).slice(0, 12);
}

function normalizeKnowledgeEntries(entries) {
  return toArray(entries)
    .map((entry, index) => {
      const title = toText(entry?.title);
      const content = toText(entry?.content);

      if (!title || !content) {
        return null;
      }

      return {
        id: toText(entry?.id, `groq-knowledge-${index + 1}`),
        title,
        content,
        tags: mergeUniqueTextArrays(entry?.tags).slice(0, 8),
        personal_significance: toText(entry?.personal_significance),
        expertise_level: toText(entry?.expertise_level),
        emotional_tone: toText(entry?.emotional_tone),
        frequency: toText(entry?.frequency)
      };
    })
    .filter(Boolean);
}

function mergeKnowledgeEntries(baseEntries, extractedEntries) {
  const merged = new Map();

  for (const entry of [...normalizeKnowledgeEntries(extractedEntries), ...normalizeKnowledgeEntries(baseEntries)]) {
    const key = `${toText(entry.id).toLowerCase()}::${toText(entry.title).toLowerCase()}`;

    if (!merged.has(key)) {
      merged.set(key, entry);
    }
  }

  return [...merged.values()].slice(0, 12);
}

function normalizeSituationEntries(entries) {
  return toArray(entries)
    .map((entry, index) => {
      const id = toText(entry?.id);
      const title = toText(entry?.title);

      if (!id || !title) {
        return null;
      }

      return {
        id,
        title,
        summary: toText(entry?.summary),
        guidance: toText(entry?.guidance),
        common_characteristics: mergeUniqueTextArrays(entry?.common_characteristics).slice(0, 6),
        personality_traits_shown: mergeUniqueTextArrays(entry?.personality_traits_shown).slice(0, 5),
        example_ids: mergeUniqueTextArrays(entry?.example_ids).slice(0, 6),
        frequency: toText(entry?.frequency, "medium")
      };
    })
    .filter(Boolean);
}

function mergeSituationEntries(baseEntries, extractedEntries) {
  const merged = new Map();

  for (const entry of [...normalizeSituationEntries(extractedEntries), ...normalizeSituationEntries(baseEntries)]) {
    const key = toText(entry.id).toLowerCase();

    if (!merged.has(key)) {
      merged.set(key, entry);
    }
  }

  return [...merged.values()].slice(0, 8);
}

function mergePersonaProfiles(baseProfile, extraction) {
  const extractedPerson = extraction?.person ?? {};
  const extractedSpeakingStyle = mergeUniqueTextArrays(
    baseProfile?.person?.speaking_style,
    extractedPerson?.speaking_style
  );
  const extractedSignaturePhrases = mergeUniqueTextArrays(
    baseProfile?.person?.signature_phrases,
    extractedPerson?.signature_phrases
  ).slice(0, 10);

  return enrichImportedPersonaProfile({
    ...baseProfile,
    person: {
      ...baseProfile.person,
      summary: toText(extractedPerson?.summary, toText(baseProfile?.person?.summary)),
      relationshipToUser: toText(
        extractedPerson?.relationshipToUser,
        toText(baseProfile?.person?.relationshipToUser)
      ),
      speaking_style:
        extractedSpeakingStyle.length > 0
          ? extractedSpeakingStyle
          : toArray(baseProfile?.person?.speaking_style),
      signature_phrases:
        extractedSignaturePhrases.length > 0
          ? extractedSignaturePhrases
          : toArray(baseProfile?.person?.signature_phrases)
    },
    personality_traits: mergeTraitScores(
      baseProfile?.personality_traits,
      extraction?.personality_traits
    ),
    conversation_habits: mergeConversationHabits(
      baseProfile?.conversation_habits,
      extraction?.conversation_habits
    ),
    behavior_rules: mergeBehaviorRules(baseProfile?.behavior_rules, extraction?.behavior_rules),
    knowledge_base: mergeKnowledgeEntries(baseProfile?.knowledge_base, extraction?.knowledge_base),
    situation_responses: mergeSituationEntries(
      baseProfile?.situation_responses,
      extraction?.situation_responses
    )
  });
}

async function extractPersonaMetadataWithGroq(baseProfile, options = {}) {
  const apiKey = toText(options.apiKey);

  if (!apiKey) {
    return null;
  }

  const model = toText(options.model, "llama-3.3-70b-versatile");
  const maxResponseTokens = sanitizeInteger(process.env.GROQ_PERSONA_REPLY_MAX_TOKENS, 900, 200);
  const systemPrompt = `
You are an expert analyst of WhatsApp chat behavior.
Your job is to refine a persona profile from chat evidence without inventing unsupported backstory.
Return strict JSON only.

Important constraints:
- Stay grounded in the supplied evidence only.
- Prefer concise, specific behavior patterns over poetic summaries.
- Keep all personality trait scores between 0 and 1.
- Use only these situation ids when relevant:
  question, request, bad-news, celebration, correction, general-chat, scheduling, problem-solving
- If evidence is weak, keep fields conservative rather than generic.
`.trim();
  const extractionRequest = selectPersonaExtractionRequest(baseProfile, systemPrompt);
  console.log(
    `Persona extraction prompt tokens: ${extractionRequest.estimatedTokens} (${extractionRequest.mode})`
  );

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxResponseTokens,
      stream: false,
      messages: extractionRequest.messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if ((response.status === 400 || response.status === 413) && /token|context|maximum/i.test(errorText)) {
      throw new Error(
        "Groq persona extraction exceeded the model token limit. Try a smaller WhatsApp export or reduce persona evidence."
      );
    }
    throw new Error(`Groq persona extraction failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const rawContent = toText(data?.choices?.[0]?.message?.content);

  return extractJsonObjectFromText(rawContent);
}

export async function buildPersonaProfileFromWhatsAppWithGroq(messages, personName, options = {}) {
  const baseProfile = buildPersonaProfileFromWhatsApp(messages, personName);

  try {
    const extraction = await extractPersonaMetadataWithGroq(baseProfile, options);

    if (!extraction || typeof extraction !== "object") {
      return baseProfile;
    }

    return mergePersonaProfiles(baseProfile, extraction);
  } catch (error) {
    console.warn("Falling back to heuristic WhatsApp persona extraction:", error);
    return baseProfile;
  }
}
