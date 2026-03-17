import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

export function getOptimizedChatParams({
  message,
  maxResponseTokens,
  defaultHistoryLimit = 12,
  codeHistoryLimit = 8,
}) {
  const isCodeHeavy = isCodeHeavyMessage(message);
  return {
    isCodeHeavy,
    maxTokens: isCodeHeavy ? maxResponseTokens : 1000,
    timeout: isCodeHeavy ? 60000 : 30000,
    historyLimit: isCodeHeavy ? codeHistoryLimit : defaultHistoryLimit,
    temperature: isCodeHeavy ? 0.25 : 0.6,
  };
}

export function sanitizePromptEnvelope(promptEnvelope, fallbackMessage) {
  const fallback = String(fallbackMessage || "").trim();
  if (typeof promptEnvelope !== "string") return fallback;
  const trimmed = promptEnvelope.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 40000);
}

export function prepareChatHistory(history = []) {
  const cleanedHistory = Array.isArray(history) ? history : [];
  if (cleanedHistory.length <= 100) {
    return { cleanedHistory, hasDuplicates: false };
  }

  let hasDuplicates = false;
  for (let index = 1; index < cleanedHistory.length; index += 1) {
    if (
      cleanedHistory[index].role === cleanedHistory[index - 1].role &&
      cleanedHistory[index].message === cleanedHistory[index - 1].message
    ) {
      hasDuplicates = true;
      break;
    }
  }

  return { cleanedHistory, hasDuplicates };
}

export async function buildPromptMessages({
  history = [],
  userMessage,
  optimizedParams,
  nowIST,
  newsContextBlock = "",
}) {
  const recentChat = history
    .slice(-optimizedParams.historyLimit)
    .map((message) => toLangChainMessage(message))
    .filter(Boolean);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "{systemInstruction}"],
    new MessagesPlaceholder("recentChat"),
    [
      "human",
      [
        "USER QUESTION:",
        "{userQuestion}",
        "",
        "INSTRUCTIONS:",
        "- Answer clearly and directly",
        "- Preserve code formatting when useful",
        "- Be concise unless the user asks for detail",
      ].join("\n"),
    ],
  ]);

  const systemInstruction = buildSystemInstruction({
    isCodeHeavy: optimizedParams.isCodeHeavy,
    nowIST,
  });

  return prompt.formatMessages({
    systemInstruction,
    recentChat,
    userQuestion: buildUserQuestionBlock(userMessage, newsContextBlock),
  });
}

function buildSystemInstruction({ isCodeHeavy = false, nowIST }) {
  const codingMode = isCodeHeavy
    ? "When coding is requested, provide complete runnable code with exact file names and minimal required steps."
    : "When coding is requested, provide practical snippets and avoid unnecessary verbosity.";

  return [
    "You are Genie AI, a helpful assistant that explains clearly, accurately, and simply.",
    "Reply in the same language as the user's latest message unless the user asks for another language.",
    "Be clear, direct, and helpful. Avoid filler and repetition.",
    codingMode,
    "For any multi-line code, always use fenced markdown code blocks with triple backticks and a language tag when known.",
    "Do not leave code fences unclosed.",
    "Never output placeholder tokens like @@INLINECODE0@@ or @@INLINE_CODE_0@@.",
    "Always format inline code with backticks when useful.",
    "If information is uncertain, state assumptions briefly instead of guessing facts.",
    `Current date/time is: ${nowIST}. If the user asks for time, date, or day, use this exact server time.`,
    "If NEWS_RESULTS is present in the current user question, use only those news results for current events. If they are empty, say you do not have live news results.",
  ].join(" ");
}

function buildUserQuestionBlock(userMessage, newsContextBlock) {
  const sections = [];
  if (newsContextBlock) {
    sections.push(newsContextBlock);
  }
  sections.push(String(userMessage || "").trim());
  return sections.join("\n\n");
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

function toLangChainMessage(message) {
  if (!message?.role || !message?.message) return null;
  const content = String(message.message).trim();
  if (!content) return null;
  if (message.role === "assistant") {
    return new AIMessage(content);
  }
  if (message.role === "user") {
    return new HumanMessage(content);
  }
  return null;
}
