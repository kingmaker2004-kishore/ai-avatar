const RAG_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your"
]);

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(value) {
  return toText(value).replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function normalizeForSearch(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function tokenize(value) {
  return unique(
    normalizeForSearch(value)
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2 && !RAG_STOP_WORDS.has(token))
  );
}

function splitParagraphs(content) {
  const normalized = normalizeWhitespace(content);

  if (!normalized) {
    return [];
  }

  const paragraphs = content
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function chunkParagraphs(paragraphs, maxChars = 900) {
  const chunks = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      continue;
    }

    if (!currentChunk) {
      currentChunk = paragraph;
      continue;
    }

    const candidate = `${currentChunk}\n\n${paragraph}`;

    if (candidate.length <= maxChars) {
      currentChunk = candidate;
      continue;
    }

    chunks.push(currentChunk);
    currentChunk = paragraph;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function buildPreview(content, maxLength = 180) {
  const normalized = normalizeWhitespace(content);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function escapePromptBlock(value) {
  return toText(value).replace(/\u0000/g, "");
}

function scoreChunkMatch(queryTokens, normalizedQuery, chunk) {
  if (queryTokens.length === 0) {
    return 0;
  }

  const title = normalizeForSearch(chunk.title);
  const content = normalizeForSearch(chunk.content);
  const preview = normalizeForSearch(chunk.preview);
  let score = 0;

  for (const token of queryTokens) {
    if (title.includes(token)) {
      score += 6;
    }

    if (content.includes(token)) {
      score += 3;
    }

    if (preview.includes(token)) {
      score += 1;
    }
  }

  if (normalizedQuery && content.includes(normalizedQuery)) {
    score += 12;
  }

  if (normalizedQuery && title.includes(normalizedQuery)) {
    score += 10;
  }

  if (chunk.chunk_index === 0) {
    score += 1;
  }

  return score;
}

export function chunkKnowledgeDocument(content) {
  const normalizedContent = content.replace(/\u0000/g, "").trim();
  const paragraphs = splitParagraphs(normalizedContent);
  const chunks = chunkParagraphs(paragraphs);

  return chunks.map((chunkContent) => ({
    content: chunkContent,
    preview: buildPreview(chunkContent),
    tokenCount: tokenize(chunkContent).length
  }));
}

export function retrieveDocumentContext(userMessage, recentMessages = [], storedChunks = [], maxItems = 4) {
  const recentUserMessages = recentMessages
    .filter((message) => message?.role === "user")
    .map((message) => toText(message.content))
    .filter(Boolean)
    .slice(-2);
  const enrichedQuery = [userMessage, ...recentUserMessages].filter(Boolean).join(" ");
  const queryTokens = tokenize(enrichedQuery);
  const normalizedQuery = normalizeForSearch(userMessage);
  const rankedChunks = storedChunks
    .map((chunk) => ({
      chunk,
      score: scoreChunkMatch(queryTokens, normalizedQuery, chunk)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const selectedChunks = [];
  const seenDocuments = new Set();

  for (const entry of rankedChunks) {
    if (selectedChunks.length >= maxItems) {
      break;
    }

    const perDocumentLimitReached =
      seenDocuments.has(entry.chunk.document_id) &&
      selectedChunks.some((chunk) => chunk.documentId === entry.chunk.document_id);

    if (perDocumentLimitReached) {
      continue;
    }

    selectedChunks.push({
      id: entry.chunk.id,
      documentId: entry.chunk.document_id,
      title: entry.chunk.title,
      sourceType: entry.chunk.source_type,
      chunkIndex: entry.chunk.chunk_index,
      content: entry.chunk.content,
      preview: entry.chunk.preview,
      score: entry.score
    });
    seenDocuments.add(entry.chunk.document_id);
  }

  return {
    queryTokens,
    chunks: selectedChunks,
    documentTitles: unique(selectedChunks.map((chunk) => chunk.title))
  };
}

export function buildDocumentContextPrompt(documentContext) {
  if (!Array.isArray(documentContext?.chunks) || documentContext.chunks.length === 0) {
    return "";
  }

  const formattedChunks = documentContext.chunks
    .map(
      (chunk, index) =>
        `Document ${index + 1}: ${chunk.title}\nChunk ${chunk.chunkIndex + 1}\n${escapePromptBlock(chunk.content)}`
    )
    .join("\n\n");

  return `
Reference documents uploaded by the user:
- Use these chunks when the user asks about project details, notes, specs, docs, code snippets, or factual material contained in uploaded files.
- Prefer these chunks over generic assumptions when they directly answer the question.
- If the chunks are only partial, answer with what is supported and say what is missing.

Retrieved document chunks:
${formattedChunks}
`.trim();
}
