import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const app = express();

loadEnvFile(path.join(backendDirectory, ".env"));

app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT ?? 5000);
const liveAvatarApiKey = process.env.LIVEAVATAR_API_KEY ?? process.env.HEYGEN_API_KEY;

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const entries = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const entry of entries) {
    const trimmed = entry.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getLiveAvatarConfig() {
  return {
    mode: process.env.LIVEAVATAR_MODE ?? "FULL",
    avatar_id: process.env.LIVEAVATAR_AVATAR_ID,
    avatar_persona: {
      voice_id: process.env.LIVEAVATAR_VOICE_ID,
      context_id: process.env.LIVEAVATAR_CONTEXT_ID,
      language: process.env.LIVEAVATAR_LANGUAGE ?? "en"
    }
  };
}

function missingEnvVars(envVars) {
  return envVars.filter((envVar) => !process.env[envVar]);
}

function isJwtLike(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

async function parseError(response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/heygen/session-token", async (_req, res) => {
  const missing = missingEnvVars([
    "LIVEAVATAR_AVATAR_ID",
    "LIVEAVATAR_VOICE_ID",
    "LIVEAVATAR_CONTEXT_ID"
  ]);

  if (!liveAvatarApiKey) {
    missing.unshift("LIVEAVATAR_API_KEY (or HEYGEN_API_KEY)");
  }

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing LiveAvatar configuration.",
      missing
    });
  }

  try {
    const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "X-API-KEY": liveAvatarApiKey,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(getLiveAvatarConfig())
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to create LiveAvatar session token.",
        details: await parseError(response)
      });
    }

    const data = await response.json();
    const sessionData = data?.data ?? data;
    const sessionToken = sessionData?.session_token;
    const sessionId = sessionData?.session_id;

    if (!isJwtLike(sessionToken)) {
      return res.status(502).json({
        error: "LiveAvatar returned an invalid session token.",
        details: data
      });
    }

    return res.json({
      sessionId,
      sessionToken
    });
  } catch (error) {
    console.error("LiveAvatar token error:", error);

    return res.status(500).json({
      error: "Unable to reach LiveAvatar."
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body?.message?.trim();

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "Missing GROQ_API_KEY."
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              process.env.GROQ_SYSTEM_PROMPT ??
              "You are a concise, friendly AI avatar assistant."
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Groq request failed.",
        details: await parseError(response)
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "Groq returned an empty response."
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Groq chat error:", error);

    return res.status(500).json({
      error: "Unable to reach Groq."
    });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
