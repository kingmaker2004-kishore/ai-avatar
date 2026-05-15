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
  ,"me",
  "my",
  "mine",
  "we",
  "our",
  "ours",
  "they",
  "their",
  "them",
  "please",
  "pls",
  "tell",
  "about"
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
  const tokenHits = new Set();
  let score = 0;

  for (const token of queryTokens) {
    if (title.includes(token)) {
      score += 6;
      tokenHits.add(token);
    }

    if (content.includes(token)) {
      score += 3;
      tokenHits.add(token);
    }

    if (preview.includes(token)) {
      score += 1;
      tokenHits.add(token);
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

  const coverage = queryTokens.length > 0 ? tokenHits.size / queryTokens.length : 0;
  const updatedAt = Date.parse(chunk.updated_at ?? "");
  const ageDays = Number.isFinite(updatedAt)
    ? Math.max(0, (Date.now() - updatedAt) / (1000 * 60 * 60 * 24))
    : 90;
  const recencyBoost = Math.max(0, 2 - Math.floor(ageDays / 14));

  return score + Math.round(coverage * 8) + recencyBoost;
}

function getMinimumChunkScore(queryTokens, normalizedQuery) {
  if (queryTokens.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedQuery.length >= 16) {
    return 8;
  }

  return queryTokens.length <= 1 ? 7 : 7;
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
  const minimumScore = getMinimumChunkScore(queryTokens, normalizedQuery);
  const rankedChunks = storedChunks
    .map((chunk) => ({
      chunk,
      score: scoreChunkMatch(queryTokens, normalizedQuery, chunk)
    }))
    .filter((entry) => entry.score >= minimumScore)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return Date.parse(right.chunk.updated_at ?? "") - Date.parse(left.chunk.updated_at ?? "");
    });

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
    documentTitles: unique(selectedChunks.map((chunk) => chunk.title)),
    minimumScore,
    hasRelevantContext: selectedChunks.length > 0
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
- Use only chunks that directly answer the latest user message.
- Ignore any chunk that is weakly related, off-topic, or only shares generic words.
- Prefer these chunks over assumptions when they are relevant.
- If the chunks do not support an answer, say you do not have that detail instead of guessing.

Retrieved document chunks:
${formattedChunks}
`.trim();
}
