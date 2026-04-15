function toText(value) {
  return typeof value === "string" ? value.trim() : "";
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
    const userText = compactWhitespace(previousMessage.content);
    const assistantText = compactWhitespace(assistantRun.assistant);

    if (!userText || !assistantText) {
      index = assistantRun.nextIndex - 1;
      continue;
    }

    examples.push({
      id: `imported-example-${examples.length + 1}`,
      user: userText,
      assistant: assistantText,
      notes: buildStyleNotes(assistantText),
      tags: unique(["contextual-reply", ...detectMessageTags(assistantText)]),
      intents: []
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
      notes: buildStyleNotes(message.content),
      tags: detectMessageTags(message.content),
      intents: []
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

  return {
    person: {
      name: personName,
      role: "WhatsApp chat persona",
      summary: `Reply like ${personName} based on their exported WhatsApp messages. Match the same rhythm, wording style, and level of casualness without sounding like a generic assistant.`,
      relationshipToUser:
        "Talk to the user as this person would in chat, while staying grounded in the exported message style.",
      speaking_style: inferSpeakingStyle(selectedMessages),
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
      "When the user asks for facts you do not know, answer naturally without inventing backstory."
    ],
    knowledge_base: [],
    memory_videos: [],
    chat_examples: buildChatExamples(messages, personName),
    style_samples: styleSamples,
    defaults: {
      temperature: 0.7,
      enable_heuristic_replies: false
    }
  };
}
