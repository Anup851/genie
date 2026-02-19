// server.js - Genie Backend (COMPLETE FIXED)
import crypto from "crypto";
import Database from "@replit/database";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// --- Initialize ---
const db = new Database();
const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://nikzyppkwedmzldghrgh.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pa3p5cHBrd2VkbXpsZGdocmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTU1NzQsImV4cCI6MjA4NTA3MTU3NH0.ssb4-8V0wkkxyfDQSzfzgTrTbjxDu1OWyjogzJlupYM";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Check API Key ---
if (!process.env.SARVAM_API_KEY) {
  console.error("❌ SARVAM_API_KEY is missing in .env!");
  process.exit(1);
}

// --- Simple Rate Limiting ---
const requestCounts = new Map();
const MAX_REQUESTS_PER_MINUTE = 40;

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = requestCounts.get(userId) || [];
  const recentRequests = userRequests.filter((time) => now - time < 60000);

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  recentRequests.push(now);
  requestCounts.set(userId, recentRequests);
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_MINUTE - recentRequests.length,
  };
}

// --- Middleware ---
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// --- CORS Headers ---
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ============================================================
// CONSTANTS - INCREASED LIMITS
// ============================================================

const MAX_SESSIONS = 100;
const MAX_HISTORY_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 12000;
const MAX_RESPONSE_TOKENS = 4000; // 🔥 INCREASED for full code
const AUTO_CLEAN_THRESHOLD = 120;
const CLEAN_KEEP_RECENT = 40;
const SESSION_LIMIT_WARNING = 100;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function unwrapDbData(data) {
  if (!data) return null;
  let result = data;
  while (
    result &&
    typeof result === "object" &&
    Object.prototype.hasOwnProperty.call(result, "value")
  ) {
    result = result.value;
  }
  return result;
}

function sanitizeInput(text) {
  if (typeof text !== "string") return "";
  if (text.length > 50000) {
    return text.slice(0, 50000).trim() + "\n\n[Message too long]";
  }
  return text.slice(0, MAX_MESSAGE_LENGTH).trim();
}

function sessionsKey(userId) {
  return `sessions_${userId}`;
}

function sessionMessagesKey(userId, chatId) {
  return `chat_${userId}_${chatId}`;
}

function makeChatId() {
  return (
    "c_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 7)
  );
}

function isCodeHeavyMessage(message) {
  if (!message || typeof message !== "string") return false;
  const trimmed = message.trim();
  if (trimmed.includes("```")) return true;
  const codePatterns = [
    /(function|def|class|import|export|const|let|var)\b/,
    /(if|else|for|while|return|try|catch|finally)\b/,
  ];
  return codePatterns.some((pattern) => pattern.test(trimmed));
}

function getOptimizedParams(message) {
  const isCodeHeavy = isCodeHeavyMessage(message);
  return {
    isCodeHeavy,
    maxTokens: isCodeHeavy ? MAX_RESPONSE_TOKENS : 1000,
    timeout: isCodeHeavy ? 60000 : 30000,
    historyLimit: isCodeHeavy ? 8 : 12,
  };
}

async function supabaseAuthRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.auth = { sub: data.user.id, email: data.user.email || null };
  next();
}

// ============================================================
// SESSION FUNCTIONS - FIXED
// ============================================================

// Ensure session exists
async function ensureSession(userId, chatId) {
  if (
    !chatId ||
    chatId === "default" ||
    chatId === "null" ||
    chatId === "undefined"
  ) {
    return null;
  }

  try {
    const sessions = await listSessions(userId);
    let session = sessions.find((s) => s.chatId === chatId);

    if (session) {
      return session;
    }

    console.log(`🆕 Creating new session for chatId: ${chatId}`);
    session = {
      chatId,
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sessions.unshift(session);
    await saveSessions(userId, sessions);
    await db.set(sessionMessagesKey(userId, chatId), []);

    return session;
  } catch (err) {
    console.error("❌ ensureSession error:", err);
    return null;
  }
}

// Update session title
async function updateSessionTitle(userId, chatId, userMessage) {
  if (!userId || !chatId || !userMessage) return null;

  try {
    const sessions = await listSessions(userId);
    const sessionIndex = sessions.findIndex((s) => s.chatId === chatId);

    if (sessionIndex === -1) return null;

    const session = sessions[sessionIndex];

    // ONLY update if title is "New chat"
    if (session.title !== "New chat") {
      return session;
    }

    // Create title from first user message
    let newTitle = userMessage.trim();

    // Clean the title
    newTitle = newTitle
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();

    // Truncate if too long
    if (newTitle.length > 35) {
      newTitle = newTitle.substring(0, 35) + "...";
    }

    // If empty, keep default
    if (!newTitle || newTitle.length === 0) {
      newTitle = "New chat";
    }

    // Update session
    session.title = newTitle;
    session.updatedAt = Date.now();

    // Move to top
    sessions.splice(sessionIndex, 1);
    sessions.unshift(session);

    await saveSessions(userId, sessions);
    console.log(`✅ Title updated: "${newTitle}" for ${chatId}`);

    return session;
  } catch (err) {
    console.error("❌ updateSessionTitle error:", err);
    return null;
  }
}

// Touch session
async function touchSession(userId, chatId, userMessage = null) {
  if (!chatId || chatId === "default" || chatId === "null") return null;

  try {
    const sessions = await listSessions(userId);
    const idx = sessions.findIndex((s) => s.chatId === chatId);
    if (idx === -1) return null;

    // Update timestamp
    sessions[idx].updatedAt = Date.now();

    // Move to top
    const [session] = sessions.splice(idx, 1);
    sessions.unshift(session);

    await saveSessions(userId, sessions);

    // Update title if this is first message
    if (userMessage) {
      await updateSessionTitle(userId, chatId, userMessage);
    }

    return session;
  } catch (err) {
    console.error("❌ touchSession error:", err);
    return null;
  }
}

// ============================================================
// AUTO-CLEAN FUNCTIONS
// ============================================================

async function autoCleanChatHistory(userId, chatId) {
  try {
    const key = sessionMessagesKey(userId, chatId);
    const raw = await db.get(key);
    const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];

    if (history.length <= AUTO_CLEAN_THRESHOLD) {
      return history;
    }

    console.log(
      `🧹 Auto-cleaning chat ${chatId}: ${history.length} → ${CLEAN_KEEP_RECENT} messages`,
    );

    const cleanedHistory = history.slice(-CLEAN_KEEP_RECENT);

    const finalHistory = [];
    for (let i = 0; i < cleanedHistory.length; i++) {
      const current = cleanedHistory[i];
      const previous = cleanedHistory[i - 1];

      if (
        previous &&
        current.role === previous.role &&
        current.message === previous.message
      ) {
        continue;
      }

      finalHistory.push(current);
    }

    await db.set(key, finalHistory);
    console.log(`✅ Cleaned to ${finalHistory.length} messages`);
    return finalHistory;
  } catch (err) {
    console.error("❌ Auto-clean error:", err);
    return [];
  }
}

async function forceCleanChat(userId, chatId) {
  try {
    const key = sessionMessagesKey(userId, chatId);
    const raw = await db.get(key);
    const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];

    console.log(`🧨 Force cleaning chat ${chatId}: ${history.length} messages`);

    const recentHistory = history.slice(-20);

    const cleaned = [];
    for (let i = 0; i < recentHistory.length; i++) {
      const current = recentHistory[i];
      const previous = recentHistory[i - 1];

      if (
        !previous ||
        !(
          current.role === previous.role && current.message === previous.message
        )
      ) {
        cleaned.push(current);
      }
    }

    await db.set(key, cleaned);
    console.log(`✅ Force cleaned to ${cleaned.length} messages`);
    return cleaned;
  } catch (err) {
    console.error("❌ Force clean error:", err);
    return [];
  }
}

// ============================================================
// DATABASE FUNCTIONS
// ============================================================

async function listSessions(userId) {
  const raw = await db.get(sessionsKey(userId));
  const sessions = unwrapDbData(raw);
  return Array.isArray(sessions) ? sessions : [];
}

async function saveSessions(userId, sessions) {
  await db.set(sessionsKey(userId), sessions.slice(0, MAX_SESSIONS));
}

async function createSession(userId, title = "New chat") {
  const sessions = await listSessions(userId);
  const chatId = makeChatId();

  let sessionTitle = "New chat";
  if (title && title !== "New chat" && title.trim().length > 0) {
    sessionTitle = title.trim().slice(0, 40);
  }

  const session = {
    chatId,
    title: sessionTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  sessions.unshift(session);
  await saveSessions(userId, sessions);
  await db.set(sessionMessagesKey(userId, chatId), []);

  return session;
}

async function saveMessage(userId, role, message, chatId = "default") {
  try {
    const sanitizedMessage = sanitizeInput(message);
    if (!sanitizedMessage) return null;

    const key =
      chatId === "default"
        ? `chat_${userId}`
        : sessionMessagesKey(userId, chatId);

    const raw = await db.get(key);
    const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];

    const validRole = role === "user" ? "user" : "assistant";

    const lastMsg = history[history.length - 1];
    if (
      lastMsg &&
      lastMsg.role === validRole &&
      lastMsg.message === sanitizedMessage
    ) {
      return history;
    }

    history.push({
      role: validRole,
      message: sanitizedMessage,
      timestamp: Date.now(),
    });

    if (history.length > AUTO_CLEAN_THRESHOLD) {
      const cleaned = await autoCleanChatHistory(userId, chatId);
      return cleaned;
    }

    if (history.length > MAX_HISTORY_LENGTH) {
      history.splice(0, history.length - MAX_HISTORY_LENGTH);
    }

    await db.set(key, history);
    return history;
  } catch (err) {
    console.error("❌ saveMessage error:", err);
    return null;
  }
}

async function getChatHistory(userId, chatId = "default") {
  try {
    const key =
      chatId === "default"
        ? `chat_${userId}`
        : sessionMessagesKey(userId, chatId);
    const raw = await db.get(key);
    const history = unwrapDbData(raw);

    if (!Array.isArray(history)) return [];

    if (history.length > AUTO_CLEAN_THRESHOLD) {
      return await autoCleanChatHistory(userId, chatId);
    }

    return history;
  } catch (err) {
    console.error("❌ getChatHistory error:", err);
    return [];
  }
}

// ============================================================
// ENDPOINTS
// ============================================================

app.get("/", (req, res) => {
  res.json({
    status: "✅ Genie Backend (COMPLETE FIXED)",
    timestamp: new Date().toISOString(),
    limits: {
      maxHistory: MAX_HISTORY_LENGTH,
      maxMessage: MAX_MESSAGE_LENGTH,
      maxTokens: MAX_RESPONSE_TOKENS,
      autoCleanAt: AUTO_CLEAN_THRESHOLD,
      keepAfterClean: CLEAN_KEEP_RECENT,
      rateLimit: `${MAX_REQUESTS_PER_MINUTE}/min`,
    },
  });
});

// Create new session
app.post("/chat/new", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { title } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  const session = await createSession(userId, title || "New chat");
  res.json(session);
});

// List sessions
app.get("/chats/:userId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  const sessions = await listSessions(userId);
  res.json({ sessions });
});

// Get chat messages
app.get("/chat/:userId/:chatId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { chatId } = req.params;
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  const messages = await getChatHistory(userId, chatId);
  res.json({ chatId, messages });
});

// ============================================================
// MAIN CHAT ENDPOINT - WITH SESSION LIMIT WARNING
// ============================================================

app.post("/chat", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { message, chatId } = req.body || {};
  const activeChatId = chatId || "default";

  if (!userId || !message || message.trim().length === 0) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      reply: `⏳ Too many requests. Please wait a minute.`,
      isRateLimited: true,
    });
  }

  try {
    const sanitizedMessage = message.trim();
    const optimizedParams = getOptimizedParams(sanitizedMessage);

    console.log(
      `💬 Chat request: ${userId.slice(0, 8)}... | ${sanitizedMessage.length} chars | chatId: ${activeChatId}`,
    );

    // ✅ ENSURE SESSION EXISTS
    if (activeChatId !== "default") {
      await ensureSession(userId, activeChatId);
    }

    // ✅ GET HISTORY
    let history = await getChatHistory(userId, activeChatId);

    // 🟡🟡🟡 CHECK SESSION LIMIT - ADD THIS BLOCK 🟡🟡🟡
    const sessionLimitExceeded = history.length >= SESSION_LIMIT_WARNING;
    const sessionNearLimit = history.length >= SESSION_LIMIT_WARNING - 20;

    if (sessionLimitExceeded) {
      console.log(
        `⚠️⚠️⚠️ SESSION LIMIT EXCEEDED: ${history.length} messages in chat ${activeChatId}`,
      );

      // Auto-clean will happen, but also warn user
      return res.status(200).json({
        reply:
          "⚠️ **Chat session limit reached!** ⚠️\n\nThis conversation has too many messages. Please **start a new chat** to continue smoothly.\n\n👉 Click **New Chat** button to create a fresh session.",
        sessionLimitExceeded: true,
        forceNewChat: true,
        messageCount: history.length,
      });
    }

    // ✅ CHECK IF FIRST MESSAGE
    const isFirstMessage = history.length === 0;

    // ✅ CLEAN IF NEEDED
    if (history.length > 100) {
      let hasDuplicates = false;
      for (let i = 1; i < history.length; i++) {
        if (
          history[i].role === history[i - 1].role &&
          history[i].message === history[i - 1].message
        ) {
          hasDuplicates = true;
          break;
        }
      }
      if (hasDuplicates) {
        console.log("🔄 Detected duplicates, force cleaning...");
        history = await forceCleanChat(userId, activeChatId);
      }
    }

    // ✅ BUILD MESSAGES FOR AI
    const messagesForAI = [];
    messagesForAI.push({
      role: "system",
      content: "You are Genie, a helpful AI assistant. Be concise and helpful.",
    });

    const recentHistory = history.slice(-optimizedParams.historyLimit);
    let lastRole = "system";

    for (const msg of recentHistory) {
      if (msg.role && msg.message && msg.role !== lastRole) {
        messagesForAI.push({
          role: msg.role,
          content: msg.message,
        });
        lastRole = msg.role;
      }
    }

    messagesForAI.push({
      role: "user",
      content: sanitizedMessage,
    });

    // ✅ CALL SARVAM AI
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      optimizedParams.timeout,
    );

    const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": process.env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        model: "sarvam-m",
        messages: messagesForAI,
        max_tokens: optimizedParams.maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ Sarvam error:",
        response.status,
        errorText.substring(0, 200),
      );

      if (
        response.status === 400 &&
        errorText.includes("First message must be from user")
      ) {
        console.log("🔄 Corrupted chat detected, force cleaning...");
        await forceCleanChat(userId, activeChatId);
        return res.status(200).json({
          reply: "🔄 Chat cleaned. Please send your message again.",
          needsRetry: true,
        });
      }

      return res.status(200).json({
        reply: "Sorry, AI service error. Please try again.",
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";

    // ✅ SAVE MESSAGES
    await saveMessage(userId, "user", sanitizedMessage, activeChatId);
    await saveMessage(userId, "assistant", reply, activeChatId);

    // ✅ UPDATE SESSION TITLE FOR FIRST MESSAGE
    if (isFirstMessage) {
      console.log(
        `📝 FIRST MESSAGE - Updating title to: "${sanitizedMessage.slice(0, 35)}..."`,
      );
      await touchSession(userId, activeChatId, sanitizedMessage);
    } else {
      await touchSession(userId, activeChatId);
    }

    // 🟡🟡🟡 ADD WARNING TO RESPONSE IF NEAR LIMIT 🟡🟡🟡
    let finalReply = reply;
    let warning = null;

    if (sessionNearLimit && !sessionLimitExceeded) {
      const remaining = SESSION_LIMIT_WARNING - history.length;
      warning = `\n\n---\n⚠️ **Warning:** This chat has ${history.length} messages. You have **${remaining} messages** left before session limit. Consider starting a new chat.`;
      finalReply = reply + warning;
    }

    res.json({
      reply: finalReply,
      isLarge: reply.length > 5000,
      historyCount: history.length + 2,
      isFirstMessage,
      sessionWarning: warning
        ? {
            messageCount: history.length,
            remaining: SESSION_LIMIT_WARNING - history.length,
            limit: SESSION_LIMIT_WARNING,
          }
        : null,
      sessionLimitExceeded: false,
    });
  } catch (err) {
    console.error("❌ /chat error:", err);
    let reply = "Sorry, an error occurred.";
    if (err.name === "AbortError") {
      reply = "Request timeout. Try a smaller request.";
    }
    res.status(500).json({ reply });
  }
});

// ============================================================
// CLEANUP ENDPOINTS
// ============================================================

app.post("/clean-chat/:userId/:chatId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { chatId } = req.params;
  try {
    const cleaned = await forceCleanChat(userId, chatId);
    res.json({
      success: true,
      message: `Chat cleaned to ${cleaned.length} messages`,
      cleanedCount: cleaned.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE ENDPOINTS
// ============================================================

app.delete("/chat/:userId/:chatId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { chatId } = req.params;
  if (!userId || !chatId) {
    return res.status(400).json({ error: "Invalid userId or chatId" });
  }

  try {
    console.log(`🗑️ Deleting chat ${chatId} for user ${userId}`);
    const messagesKey = sessionMessagesKey(userId, chatId);
    await db.delete(messagesKey);

    const sessions = await listSessions(userId);
    const filteredSessions = sessions.filter((s) => s.chatId !== chatId);
    await saveSessions(userId, filteredSessions);

    console.log(`✅ Chat ${chatId} deleted successfully`);
    res.json({
      ok: true,
      message: "Chat deleted successfully",
      remainingSessions: filteredSessions.length,
    });
  } catch (err) {
    console.error("❌ Delete session error:", err);
    res
      .status(500)
      .json({ error: "Failed to delete chat", details: err.message });
  }
});

app.delete("/chats/:userId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    console.log(`🗑️ Deleting ALL chats for user ${userId}`);
    const sessions = await listSessions(userId);
    console.log(`Found ${sessions.length} sessions to delete`);

    for (const s of sessions) {
      try {
        const key = sessionMessagesKey(userId, s.chatId);
        await db.delete(key);
        console.log(`  ✅ Deleted messages: ${s.chatId}`);
      } catch (err) {
        console.error(`  ❌ Failed to delete ${s.chatId}:`, err.message);
      }
    }

    await db.set(sessionsKey(userId), []);
    try {
      await db.delete(`chat_${userId}`);
    } catch (err) {}

    console.log(`✅ All ${sessions.length} chats deleted successfully`);
    res.json({
      ok: true,
      deleted: sessions.length,
      message: `Successfully deleted ${sessions.length} chats`,
    });
  } catch (err) {
    console.error("❌ Delete all chats error:", err);
    res
      .status(500)
      .json({ error: "Failed to delete all chats", details: err.message });
  }
});

app.get("/check-delete/:userId/:chatId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { chatId } = req.params;
  try {
    const messagesKey = sessionMessagesKey(userId, chatId);
    const messages = await db.get(messagesKey);
    const sessions = await listSessions(userId);
    const sessionExists = sessions.some((s) => s.chatId === chatId);
    res.json({
      chatId,
      messagesExist: messages !== null,
      sessionExists,
      sessionsCount: sessions.length,
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/chat-stats/:userId/:chatId", supabaseAuthRequired, async (req, res) => {
  const userId = req.auth?.sub;
  const { chatId } = req.params;
  try {
    const key = sessionMessagesKey(userId, chatId);
    const raw = await db.get(key);
    const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];

    let duplicateCount = 0;
    for (let i = 1; i < history.length; i++) {
      if (
        history[i].role === history[i - 1].role &&
        history[i].message === history[i - 1].message
      ) {
        duplicateCount++;
      }
    }

    res.json({
      totalMessages: history.length,
      duplicateCount,
      needsCleaning:
        history.length > AUTO_CLEAN_THRESHOLD || duplicateCount > 0,
      autoCleanThreshold: AUTO_CLEAN_THRESHOLD,
      maxLimit: MAX_HISTORY_LENGTH,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// auth

const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-replit-secrets";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const usersKey = (username) => `user_${username.toLowerCase()}`;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const data = `${h}.${p}`;
  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))
      return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  req.auth = payload;
  next();
}

app.post("/api/register", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  if (username.length < 3)
    return res
      .status(400)
      .json({ error: "Username must be at least 3 characters" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });

  const existing = await db.get(usersKey(username));
  if (existing)
    return res.status(409).json({ error: "Username already exists" });

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const user = {
    id: crypto.randomUUID(),
    username,
    salt,
    passwordHash,
    createdAt: Date.now(),
  };
  await db.set(usersKey(username), user);

  const token = signToken({ sub: user.id, username: user.username });
  res
    .status(201)
    .json({ token, user: { id: user.id, username: user.username } });
});

app.post("/api/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "Username and password are required" });

  const user = await db.get(usersKey(username));
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash)
    return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ sub: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get("/api/me", authRequired, async (req, res) => {
  const user = await db.get(usersKey(req.auth.username));
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: { id: user.id, username: user.username } });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
✅ Genie Backend (COMPLETE FIXED) Running!
📍 Port: ${PORT}
🔐 API Key: ${process.env.SARVAM_API_KEY ? "Loaded" : "Missing!"}

📈 FIXED LIMITS:
  Max History: ${MAX_HISTORY_LENGTH} messages
  Max Message: ${MAX_MESSAGE_LENGTH} chars  
  Max Tokens: ${MAX_RESPONSE_TOKENS} for code 🔥
  Rate Limit: ${MAX_REQUESTS_PER_MINUTE}/min

🧹 AUTO-CLEAN: Clean at ${AUTO_CLEAN_THRESHOLD} messages
💾 Database: Connected
🧾 Sessions: Max ${MAX_SESSIONS}

✅ CHAT TITLE FIXED - First message will appear as title!
✅ DUPLICATE CHAT ENDPOINT REMOVED
✅ TOKENS INCREASED to 4000 for complete code
  `);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  process.exit(0);
});
