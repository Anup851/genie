function createSessionsKey(userId) {
  return `sessions_${userId}`;
}

function createSessionMessagesKey(userId, chatId) {
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

function sanitizeInput(text, maxMessageLength) {
  if (typeof text !== "string") return "";
  if (text.length > 50000) {
    return text.slice(0, 50000).trim() + "\n\n[Message too long]";
  }
  return text.slice(0, maxMessageLength).trim();
}

export function createHistoryService({ db, config }) {
  const {
    maxSessions,
    maxHistoryLength,
    maxMessageLength,
    autoCleanThreshold,
    cleanKeepRecent,
  } = config;

  async function listSessions(userId) {
    const raw = await db.get(createSessionsKey(userId));
    const sessions = unwrapDbData(raw);
    return Array.isArray(sessions) ? sessions : [];
  }

  async function saveSessions(userId, sessions) {
    await db.set(createSessionsKey(userId), sessions.slice(0, maxSessions));
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
    await db.set(createSessionMessagesKey(userId, chatId), []);

    return session;
  }

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
      let session = sessions.find((item) => item.chatId === chatId);

      if (session) {
        return session;
      }

      session = {
        chatId,
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      sessions.unshift(session);
      await saveSessions(userId, sessions);
      await db.set(createSessionMessagesKey(userId, chatId), []);

      return session;
    } catch (err) {
      console.error("ensureSession error:", err);
      return null;
    }
  }

  async function updateSessionTitle(userId, chatId, userMessage) {
    if (!userId || !chatId || !userMessage) return null;

    try {
      const sessions = await listSessions(userId);
      const sessionIndex = sessions.findIndex((item) => item.chatId === chatId);

      if (sessionIndex === -1) return null;

      const session = sessions[sessionIndex];
      if (session.title !== "New chat") {
        return session;
      }

      let newTitle = userMessage.trim();
      newTitle = newTitle
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[^\w\s]/g, "")
        .trim();

      if (newTitle.length > 35) {
        newTitle = newTitle.substring(0, 35) + "...";
      }

      if (!newTitle) {
        newTitle = "New chat";
      }

      session.title = newTitle;
      session.updatedAt = Date.now();

      sessions.splice(sessionIndex, 1);
      sessions.unshift(session);

      await saveSessions(userId, sessions);
      return session;
    } catch (err) {
      console.error("updateSessionTitle error:", err);
      return null;
    }
  }

  async function touchSession(userId, chatId, userMessage = null) {
    if (!chatId || chatId === "default" || chatId === "null") return null;

    try {
      const sessions = await listSessions(userId);
      const index = sessions.findIndex((item) => item.chatId === chatId);
      if (index === -1) return null;

      sessions[index].updatedAt = Date.now();
      const [session] = sessions.splice(index, 1);
      sessions.unshift(session);

      await saveSessions(userId, sessions);

      if (userMessage) {
        await updateSessionTitle(userId, chatId, userMessage);
      }

      return session;
    } catch (err) {
      console.error("touchSession error:", err);
      return null;
    }
  }

  async function autoCleanChatHistory(userId, chatId) {
    try {
      const key =
        chatId === "default"
          ? `chat_${userId}`
          : createSessionMessagesKey(userId, chatId);
      const raw = await db.get(key);
      const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];

      if (history.length <= autoCleanThreshold) {
        return history;
      }

      const cleanedHistory = history.slice(-cleanKeepRecent);
      const finalHistory = [];
      for (let index = 0; index < cleanedHistory.length; index += 1) {
        const current = cleanedHistory[index];
        const previous = cleanedHistory[index - 1];

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
      return finalHistory;
    } catch (err) {
      console.error("autoCleanChatHistory error:", err);
      return [];
    }
  }

  async function forceCleanChat(userId, chatId) {
    try {
      const key =
        chatId === "default"
          ? `chat_${userId}`
          : createSessionMessagesKey(userId, chatId);
      const raw = await db.get(key);
      const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];
      const recentHistory = history.slice(-20);

      const cleaned = [];
      for (let index = 0; index < recentHistory.length; index += 1) {
        const current = recentHistory[index];
        const previous = recentHistory[index - 1];

        if (
          !previous ||
          !(
            current.role === previous.role &&
            current.message === previous.message
          )
        ) {
          cleaned.push(current);
        }
      }

      await db.set(key, cleaned);
      return cleaned;
    } catch (err) {
      console.error("forceCleanChat error:", err);
      return [];
    }
  }

  async function saveMessage(userId, role, message, chatId = "default") {
    try {
      const sanitizedMessage = sanitizeInput(message, maxMessageLength);
      if (!sanitizedMessage) return null;

      const key =
        chatId === "default"
          ? `chat_${userId}`
          : createSessionMessagesKey(userId, chatId);

      const raw = await db.get(key);
      const history = Array.isArray(unwrapDbData(raw)) ? unwrapDbData(raw) : [];
      const validRole = role === "user" ? "user" : "assistant";
      const lastMessage = history[history.length - 1];

      if (
        lastMessage &&
        lastMessage.role === validRole &&
        lastMessage.message === sanitizedMessage
      ) {
        return history;
      }

      history.push({
        role: validRole,
        message: sanitizedMessage,
        timestamp: Date.now(),
      });

      if (history.length > autoCleanThreshold) {
        return autoCleanChatHistory(userId, chatId);
      }

      if (history.length > maxHistoryLength) {
        history.splice(0, history.length - maxHistoryLength);
      }

      await db.set(key, history);
      return history;
    } catch (err) {
      console.error("saveMessage error:", err);
      return null;
    }
  }

  async function getChatHistory(userId, chatId = "default") {
    try {
      const key =
        chatId === "default"
          ? `chat_${userId}`
          : createSessionMessagesKey(userId, chatId);
      const raw = await db.get(key);
      const history = unwrapDbData(raw);

      if (!Array.isArray(history)) return [];

      if (history.length > autoCleanThreshold) {
        return autoCleanChatHistory(userId, chatId);
      }

      return history;
    } catch (err) {
      console.error("getChatHistory error:", err);
      return [];
    }
  }

  return {
    createSession,
    ensureSession,
    forceCleanChat,
    getChatHistory,
    listSessions,
    saveMessage,
    saveSessions,
    sessionMessagesKey: createSessionMessagesKey,
    touchSession,
    unwrapDbData,
  };
}
