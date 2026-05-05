

// ================= DOM ELEMENTS =================
const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");
const stopChatBtn = document.querySelector("#stop-btn");
const chatbox = document.querySelector(".chatbox");
const chatContainer = document.querySelector(".chat-container");
const historySidebar = document.querySelector(".history-sidebar");
const historyList = document.querySelector(".history-list");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const welcome = document.querySelector(".welcome");
const container = document.querySelector(".container");
const sidebarToggle = document.getElementById("sidebar-toggle");
const closeSidebarBtn = document.getElementById("close-sidebar");
const newChatBtn = document.getElementById("new-chat-btn");
const startChatBtn = document.querySelector(".start-chat-btn");
const micBtn = document.getElementById("mic-btn");
const imageModeBtn = document.getElementById("image-mode-btn");
const speechStatus = document.getElementById("speech-status");
const authBtn = document.getElementById("auth-btn");
const sidebarSettingsBtn = document.getElementById("sidebar-settings-btn");
const sidebarMemorySummary = document.getElementById("sidebar-memory-summary");
const imageUploadInput = document.getElementById("image-upload");
const imageUploadLabel = document.querySelector('label[for="image-upload"]');
const selectedMediaPreview = document.getElementById("selected-media-preview");
const chatHomeActions = document.getElementById("chat-home-actions");
const homeContinueBtn = document.getElementById("home-continue-btn");
const chatHomeOptions = document.getElementById("chat-home-options");
const memoryModal = document.getElementById("memory-modal");
const memoryList = document.getElementById("memory-list");
const closeMemoryBtn = document.getElementById("close-memory-btn");
const clearMemoryBtn = document.getElementById("clear-memory-btn");
const settingsMemoryCount = document.getElementById("settings-memory-count");
const settingsThemeBtn = document.getElementById("settings-theme-btn");
const settingsThemeLabel = document.getElementById("settings-theme-label");
const documentContextBanner = document.getElementById("document-context-banner");
const documentContextTitle = document.getElementById("document-context-title");
const documentContextSubtitle = document.getElementById("document-context-subtitle");
const clearDocumentBtn = document.getElementById("clear-document-btn");

let pendingImageData = null;
let pendingImageName = "";
let pendingMediaType = "";
let pendingMediaPreviewHref = null;
let pendingMediaSelected = false;
let pendingMediaLoading = false;
let imageModeEnabled = false;
let pendingDocumentContext = null;
const MAX_VISIBLE_PROMPT_OPTIONS = 4;
const MEMORY_STORAGE_KEY = "genie_user_memories_v1";
const DOCUMENT_STORAGE_KEY = "genie_active_document_v1";
const PROMPT_PREFERENCES_STORAGE_KEY = "genie_prompt_preferences_v1";
const LAST_OPEN_CHAT_STORAGE_KEY = "genie_lastOpenChatId";
const DOCUMENT_MAX_CHUNKS = 5;
const DOCUMENT_CHUNK_SIZE = 1200;
const DOCUMENT_CHUNK_OVERLAP = 180;
let userMemories = [];
let activeDocumentContext = null;
let activePromptGroup = "";
const THINKING_STATUS_BY_MODE = {
  chat: ["Thinking", "Reading your prompt", "Planning the reply", "Writing the answer"],
  media: ["Thinking", "Reviewing your file", "Pulling out key details", "Preparing the answer"],
  image: ["Thinking", "Designing the concept", "Rendering the image", "Finishing touches"],
};

const SUGGESTED_PROMPT_GROUPS = {
  summarize: [
    { prompt: "Summarize this article in simple bullet points and include the main conclusion." },
    { prompt: "Turn this meeting text into clean notes with action items and next steps." },
    { prompt: "Give me a short summary of this text in 5 clear lines." },
    { prompt: "Summarize this PDF chapter and list the most important concepts." },
    { prompt: "Read this long message and give me a crisp executive summary." },
    { prompt: "Summarize this YouTube transcript into clear sections and key takeaways." },
    { prompt: "Convert these rough notes into a concise summary with headings." },
    { prompt: "Summarize this research topic in simple language for a beginner." },
  ],
  code: [
    { prompt: "Write code for FCFS scheduling and explain how it works step by step." },
    { prompt: "Write code for the 2 Sum problem and explain the approach clearly." },
    { prompt: "Write code for a simple todo list app and explain the file structure." },
    { prompt: "Build a responsive login form with HTML, CSS, and JavaScript." },
    { prompt: "Write a Python script to rename files in a folder safely." },
    { prompt: "Create a REST API example with Node.js and Express." },
    { prompt: "Write a binary search implementation and explain time complexity." },
    { prompt: "Build a small calculator app and explain the logic clearly." },
  ],
  brainstorm: [
    { prompt: "Give me 5 practical app ideas with short descriptions." },
    { prompt: "Brainstorm content ideas for my topic and make them engaging." },
    { prompt: "Give me startup ideas I can build with a small team." },
    { prompt: "Brainstorm YouTube video ideas for a tech-focused channel." },
    { prompt: "Suggest portfolio project ideas that look strong for interviews." },
    { prompt: "Give me unique feature ideas for an AI chatbot app." },
    { prompt: "Brainstorm Instagram reel ideas that feel fresh and shareable." },
    { prompt: "Suggest SaaS ideas with real user pain points to solve." },
  ],
  plan: [
    { prompt: "Make a step-by-step plan to build this project from scratch." },
    { prompt: "Create a 7-day study plan for this topic with daily goals." },
    { prompt: "Make a launch plan for my app with priorities and timeline." },
    { prompt: "Break this big task into small clear action items." },
    { prompt: "Create a roadmap for learning web development in order." },
    { prompt: "Make a content plan for the next 30 days on this topic." },
    { prompt: "Plan this feature implementation with milestones and risks." },
    { prompt: "Create a revision plan for exams with subjects and schedule." },
  ],
};

const PROMPT_GROUP_ICONS = {
  summarize: "article",
  code: "code",
  brainstorm: "emoji_objects",
  plan: "route",
};

function loadPromptPreferences() {
  try {
    const raw = localStorage.getItem(PROMPT_PREFERENCES_STORAGE_KEY);
    const parsed = JSON.parse(raw || "{}");
    return {
      lastGroup:
        typeof parsed?.lastGroup === "string" ? parsed.lastGroup.trim() : "",
      usage:
        parsed?.usage && typeof parsed.usage === "object" ? parsed.usage : {},
    };
  } catch {
    return { lastGroup: "", usage: {} };
  }
}

function savePromptPreferences(preferences) {
  try {
    localStorage.setItem(
      PROMPT_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {}
}

function recordPromptGroupUsage(groupName = "") {
  const group = String(groupName || "").trim();
  if (!group || !SUGGESTED_PROMPT_GROUPS[group]) return;

  const preferences = loadPromptPreferences();
  const usage = {
    ...(preferences.usage || {}),
    [group]: Number(preferences.usage?.[group] || 0) + 1,
  };

  savePromptPreferences({
    lastGroup: group,
    usage,
  });
}

function getDefaultPromptGroup() {
  const preferences = loadPromptPreferences();
  const usage = preferences.usage || {};
  const rankedGroups = Object.keys(SUGGESTED_PROMPT_GROUPS).sort((a, b) => {
    return Number(usage[b] || 0) - Number(usage[a] || 0);
  });

  if (preferences.lastGroup && SUGGESTED_PROMPT_GROUPS[preferences.lastGroup]) {
    return preferences.lastGroup;
  }

  if (rankedGroups.length && Number(usage[rankedGroups[0]] || 0) > 0) {
    return rankedGroups[0];
  }

  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "summarize";
  if (hour >= 12 && hour < 18) return "code";
  if (hour >= 18 && hour < 22) return "brainstorm";
  return "plan";
}

function getSuggestedPromptOptions(groupName = "") {
  const group = String(groupName || "").trim();
  const options = Array.isArray(SUGGESTED_PROMPT_GROUPS[group])
    ? SUGGESTED_PROMPT_GROUPS[group]
    : [];
  if (!options.length) return [];

  const preferences = loadPromptPreferences();
  const usageWeight = Number(preferences.usage?.[group] || 0);
  const rotation = usageWeight % options.length;
  const rotated = options.slice(rotation).concat(options.slice(0, rotation));
  return shuffleArray(rotated).slice(0, MAX_VISIBLE_PROMPT_OPTIONS);
}

function shuffleArray(items = []) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function revealAppShell() {
  document.body.classList.remove("ui-loading");
  const loader = document.getElementById("app-shell-loader");
  if (loader) loader.setAttribute("hidden", "hidden");
}

function scrollChatToBottom(force = false) {
  if (!chatbox) return;
  if (!force && isAssistantTypingAnimationActive) return;
  const distanceFromBottom =
    chatbox.scrollHeight - chatbox.scrollTop - chatbox.clientHeight;
  if (!force && distanceFromBottom > 140) return;

  chatbox.scrollTop = chatbox.scrollHeight;
  requestAnimationFrame(() => {
    if (!chatbox) return;
    chatbox.scrollTop = chatbox.scrollHeight;
  });
}

function scheduleChatScroll(force = false) {
  if (!force && isAssistantTypingAnimationActive) return;
  if (force) {
    if (pendingChatScrollFrame) {
      cancelAnimationFrame(pendingChatScrollFrame);
      pendingChatScrollFrame = 0;
    }
    scrollChatToBottom(true);
    return;
  }

  if (pendingChatScrollFrame) return;
  pendingChatScrollFrame = requestAnimationFrame(() => {
    pendingChatScrollFrame = 0;
    scrollChatToBottom(true);
  });
}

function shouldRenderTypingFrame(index, total, ch = "", chunkSize = 8) {
  return (
    index === total - 1 ||
    index % chunkSize === 0 ||
    ch === "\n" ||
    ch === "." ||
    ch === "!" ||
    ch === "?" ||
    ch === "," ||
    ch === ";"
  );
}

function syncFreshChatLayout() {
  const hasMessages = !!chatbox?.querySelector(".chat");
  const isFreshDraft = !hasMessages;
  document.body.classList.toggle("fresh-chat-home", isFreshDraft);
  if (chatContainer) {
    chatContainer.setAttribute("aria-hidden", String(!isFreshDraft));
  }
  if (isFreshDraft) {
    updateHomeScreenState();
  } else {
    renderPromptOptions("");
  }
}

function updateHomeScreenState() {
  const hasLastChat = !!readLastOpenedChatId();
  if (homeContinueBtn) {
    homeContinueBtn.hidden = !hasLastChat;
  }
  if (chatHomeActions) {
    chatHomeActions.hidden = !hasLastChat;
  }
}

const SUPPORTED_MEDIA_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/rtf",
  "application/xml",
  "text/xml",
  "text/html",
  "text/css",
  "application/javascript",
  "text/javascript",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function isSupportedMediaFile(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("text/")) return true;
  if (SUPPORTED_MEDIA_MIME_TYPES.has(mime)) return true;

  // Fallback for browsers that omit MIME for some files
  const name = String(file.name || "").toLowerCase();
  return [
    ".pdf", ".txt", ".md", ".json", ".csv", ".doc", ".docx",
    ".xls", ".xlsx", ".ppt", ".pptx", ".rtf", ".xml",
    ".html", ".css", ".js", ".ts", ".py", ".java", ".c", ".cpp",
  ].some((ext) => name.endsWith(ext));
}

function isImageDataUrl(dataUrl) {
  return /^data:image\//i.test(String(dataUrl || ""));
}

function isValidMediaDataUrl(dataUrl) {
  return /^data:[^;,]+(?:;[^;,]+)*;base64,/i.test(
    String(dataUrl || ""),
  );
}

function isAnyDataUrl(dataUrl) {
  return /^data:/i.test(String(dataUrl || ""));
}

function getMediaKindLabel(mimeType = "", dataUrl = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/") || isImageDataUrl(dataUrl)) return "image";
  if (mime.includes("pdf")) return "PDF document";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "spreadsheet";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "presentation";
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("csv")) return "text document";
  if (mime.includes("word") || mime.includes("officedocument")) return "document";
  return "file";
}

function extractFirstHttpUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s)]+/i);
  return match ? sanitizeMarkdownUrl(match[0]) : "";
}

function isGeneratedImageReplyText(text) {
  const t = String(text || "");
  return /^Generated image for:/i.test(t) && !!extractFirstHttpUrl(t);
}

function createGeneratedImageReplyHtml({ imageUrl = "", prompt = "" }) {
  const safeUrl = escapeHtml(sanitizeMarkdownUrl(imageUrl));
  const safePrompt = escapeHtml(String(prompt || "").trim() || "Image prompt");
  return `
    <div class="generated-image-card">
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="generated-image-link">
        <img src="${safeUrl}" alt="${safePrompt}" class="generated-image-preview" />
      </a>
      <p class="generated-image-caption">${safePrompt}</p>
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="generated-image-open">Open image</a>
    </div>
  `;
}

function setImageMode(enabled) {
  imageModeEnabled = !!enabled;
  if (!imageModeBtn) return;
  imageModeBtn.classList.toggle("active", imageModeEnabled);
  imageModeBtn.setAttribute("aria-pressed", String(imageModeEnabled));
  imageModeBtn.title = imageModeEnabled ? "Image mode on" : "Image mode";
  if (chatInput && !pendingMediaSelected) {
    chatInput.placeholder = imageModeEnabled
      ? "Describe the image you want to generate..."
      : "Ask anything with GENIE...";
  }
}

function clearSelectedMediaPreview() {
  if (!selectedMediaPreview) return;
  selectedMediaPreview.innerHTML = "";
  selectedMediaPreview.style.display = "none";
}

function revokePendingMediaPreviewHref() {
  if (!pendingMediaPreviewHref) return;
  try {
    URL.revokeObjectURL(pendingMediaPreviewHref);
  } catch {}
  pendingMediaPreviewHref = null;
}

function renderSelectedMediaPreview({ mediaData, mediaName, mediaType, previewHref = "" }) {
  if (!selectedMediaPreview) return;
  const safeName = escapeHtml(mediaName || "file");
  const kindLabel = escapeHtml(getMediaKindLabel(mediaType, mediaData));
  const isImage = isImageDataUrl(mediaData);
  const href = escapeHtml(previewHref || mediaData || "#");

  selectedMediaPreview.innerHTML = `
    <div class="selected-media-chip">
      <a href="${href}" target="_blank" rel="noopener noreferrer" class="${isImage ? "selected-media-thumb-link" : "selected-media-doc-link"}">
        ${
          isImage
            ? `<img src="${mediaData}" alt="${safeName}" class="selected-media-thumb" />`
            : `<span class="selected-media-doc material-symbols-outlined">description</span>`
        }
      </a>
      <div class="selected-media-text">
        <a href="${href}" target="_blank" rel="noopener noreferrer" class="selected-media-name-link">${safeName}</a>
        <div class="selected-media-kind">${kindLabel}</div>
      </div>
      <button type="button" class="selected-media-remove material-symbols-outlined" title="Remove">close</button>
    </div>
  `;
  selectedMediaPreview.style.display = "block";

  const removeBtn = selectedMediaPreview.querySelector(".selected-media-remove");
  removeBtn?.addEventListener("click", () => {
    pendingImageData = null;
    pendingImageName = "";
    pendingMediaType = "";
    pendingMediaSelected = false;
    pendingMediaLoading = false;
    pendingDocumentContext = null;
    if (imageUploadInput) imageUploadInput.value = "";
    revokePendingMediaPreviewHref();
    if (chatInput) chatInput.placeholder = "Ask anything with GENIE...";
    clearSelectedMediaPreview();
  });
}

function loadMemories() {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    userMemories = Array.isArray(parsed) ? parsed : [];
  } catch {
    userMemories = [];
  }
  renderMemoryList();
}

function persistMemories() {
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(userMemories));
  updateMemorySettingsSummary();
}

function getMemories() {
  return Array.isArray(userMemories) ? userMemories : [];
}

function saveMemory(memory) {
  if (!memory?.key || !memory?.value) return;
  const key = String(memory.key).trim().toLowerCase();
  const value = String(memory.value).trim();
  if (!key || !value) return;

  const next = {
    id: memory.id || `${key}:${value}`.toLowerCase(),
    key,
    label: String(memory.label || key),
    value,
  };
  const existingIndex = userMemories.findIndex((item) => item.key === key);
  if (existingIndex >= 0) userMemories[existingIndex] = next;
  else userMemories.push(next);
  persistMemories();
}

function clearMemories() {
  userMemories = [];
  persistMemories();
}

function renderMemoryList() {
  updateMemorySettingsSummary();
}

function updateMemorySettingsSummary(memories = getMemories()) {
  if (sidebarMemorySummary) {
    sidebarMemorySummary.textContent = "Theme and account";
  }
  if (settingsThemeLabel) {
    settingsThemeLabel.textContent = document.body.classList.contains("light-mode")
      ? "Light mode"
      : "Dark mode";
  }
  const settingsThemeIcon = settingsThemeBtn?.querySelector(".material-symbols-outlined");
  if (settingsThemeIcon) {
    settingsThemeIcon.textContent = document.body.classList.contains("light-mode")
      ? "light_mode"
      : "dark_mode";
  }
  if (settingsThemeBtn) {
    settingsThemeBtn.setAttribute(
      "aria-label",
      document.body.classList.contains("light-mode")
        ? "Switch to dark mode"
        : "Switch to light mode",
    );
  }
}

function openMemoryModal() {
  if (!memoryModal) return;
  updateMemorySettingsSummary();
  memoryModal.hidden = false;
  document.body.classList.add("settings-open");
}

function closeMemoryModal() {
  if (!memoryModal) return;
  memoryModal.hidden = true;
  document.body.classList.remove("settings-open");
}

function toggleThemePreference() {
  document.body.classList.toggle("light-mode");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("light-mode") ? "light" : "dark",
  );
  updateMemorySettingsSummary();
}

function normalizeTextForSearch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUserMemories(message) {
  const text = String(message || "").trim();
  if (!text) return [];
  const lower = text.toLowerCase();
  const shouldStoreMemory = [
    "my name is",
    "i am learning",
    "i want a job in",
    "i prefer",
    "call me",
    "remember that",
  ].some((phrase) => lower.includes(phrase));
  if (!shouldStoreMemory) return [];

  const extracted = [];
  const patterns = [
    {
      key: "name",
      label: "Name",
      regex: /\bmy name is\s+([a-z][a-z\s'-]{1,40})/i,
    },
    {
      key: "learning_goal",
      label: "Learning",
      regex: /\bi am learning\s+([a-z0-9][a-z0-9\s+#.+-]{1,60})/i,
    },
    {
      key: "job_goal",
      label: "Job goal",
      regex: /\bi want a job in\s+([a-z0-9][a-z0-9\s&/+.-]{1,60})/i,
    },
    {
      key: "preference",
      label: "Preference",
      regex: /\bi prefer\s+([a-z0-9][a-z0-9\s,&/+.-]{1,80})/i,
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    const value = match?.[1]?.replace(/\s+/g, " ").trim();
    if (!value) continue;
    extracted.push({
      id: `${pattern.key}:${value}`.toLowerCase(),
      key: pattern.key,
      label: pattern.label,
      value,
    });
  }

  return extracted;
}

function saveExtractedMemories(message) {
  const extracted = extractUserMemories(message);
  extracted.forEach(saveMemory);
}

function chunkText(text, chunkSize = DOCUMENT_CHUNK_SIZE, overlap = DOCUMENT_CHUNK_OVERLAP) {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return [];
  const chunks = [];
  let index = 0;
  while (index < source.length) {
    const end = Math.min(source.length, index + chunkSize);
    const chunk = source.slice(index, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= source.length) break;
    index = Math.max(end - overlap, index + 1);
  }
  return chunks;
}

function scoreChunk(query, chunk) {
  const queryWords = Array.from(new Set(normalizeTextForSearch(query).split(" ").filter((word) => word.length > 2)));
  const chunkWords = new Set(normalizeTextForSearch(chunk).split(" ").filter(Boolean));
  if (!queryWords.length || !chunkWords.size) return 0;

  let score = 0;
  for (const word of queryWords) {
    if (chunkWords.has(word)) score += 1;
  }

  const normalizedChunk = normalizeTextForSearch(chunk);
  const normalizedQuery = normalizeTextForSearch(query);
  if (normalizedQuery && normalizedChunk.includes(normalizedQuery)) score += 4;
  return score;
}

function isMemoryRelevant(question, memories = getMemories()) {
  if (!Array.isArray(memories) || !memories.length) return false;
  const normalizedQuestion = normalizeTextForSearch(question);
  if (!normalizedQuestion) return false;

  const directNeedPatterns = [
    /\bmy\b/,
    /\bme\b/,
    /\bi\b/,
    /\bremember\b/,
    /\bpreference\b/,
    /\bprefer\b/,
    /\blearning\b/,
    /\bjob\b/,
    /\bname\b/,
  ];
  if (directNeedPatterns.some((pattern) => pattern.test(normalizedQuestion))) return true;

  return memories.some((memory) => {
    const key = normalizeTextForSearch(memory.key);
    const label = normalizeTextForSearch(memory.label);
    const value = normalizeTextForSearch(memory.value);
    return (
      (key && normalizedQuestion.includes(key)) ||
      (label && normalizedQuestion.includes(label)) ||
      (value && normalizedQuestion.includes(value))
    );
  });
}

function getRelevantChunks(question, chunks, maxChunks = DOCUMENT_MAX_CHUNKS) {
  return (Array.isArray(chunks) ? chunks : [])
    .map((chunk, index) => ({ chunk, index, score: scoreChunk(question, chunk) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxChunks)
    .map((entry) => entry.chunk);
}

function formatRecentConversation(limit = 6) {
  const recent = conversationMemory.slice(-limit);
  if (!recent.length) return "No recent chat.";
  return recent
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${String(item.text || "").trim()}`)
    .join("\n");
}

function formatUserMemories() {
  const memories = getMemories();
  if (!memories.length) return "No saved memory.";
  return memories.map((item) => `- ${item.label}: ${item.value}`).join("\n");
}

function shouldUseRecentConversation(question) {
  const normalized = normalizeTextForSearch(question);
  if (!normalized || conversationMemory.length < 2) return false;
  return [
    /\bthis\b/,
    /\bthat\b/,
    /\bit\b/,
    /\bagain\b/,
    /\bprevious\b/,
    /\bearlier\b/,
    /\bcontinue\b/,
    /\babove\b/,
    /\blast\b/,
  ].some((pattern) => pattern.test(normalized));
}

function isCodingRequest(message = "") {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return false;
  const patterns = [
    /```/,
    /\b(html|css|javascript|js|jsx|typescript|ts|python|java|c\+\+|cpp|react|node|express)\b/,
    /\b(code|coding|script|snippet|program|algorithm|app|project|component|function|calculator|todo)\b/,
    /\b(index\.html|styles?\.css|script\.js|app\.js|main\.js|main\.py)\b/,
    /\b(full|complete|entire|again|rewrite|regenerate|continue|rest of)\b.*\b(code|html|css|js|javascript|file|files)\b/,
    /\b(split|separate)\b.*\b(file|files)\b/,
    /\bgive\s+(me\s+)?(the\s+)?(html|css|js|javascript|code)\b/,
    /\bsend\s+(me\s+)?(the\s+)?(html|css|js|javascript|code)\b/,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function buildPrompt({ question, recentMessages, documentContext, memoryText }) {
  const safeQuestion = String(question || "").trim();
  return [
    "SYSTEM:",
    "You are Genie AI, a helpful assistant that explains clearly, simply, and accurately.",
    "If the user asks who you are or your name, reply that you are Genie, an AI assistant.",
    "Do not say you are Sarvam or Sarvam Chat. Sarvam is only the backend provider.",
    "",
    "USER MEMORY:",
    memoryText || "No saved memory.",
    "",
    "DOCUMENT CONTEXT:",
    documentContext || "No active document context.",
    "",
    "RECENT CHAT:",
    recentMessages || "No recent chat.",
    "",
    "USER QUESTION:",
    safeQuestion,
    "",
    "INSTRUCTIONS:",
    "- Answer clearly and directly",
    "- Use document context when relevant",
    "- Use saved memory only when useful",
    "- If context is insufficient, say so honestly",
  ].join("\n");
}

function saveActiveDocument(doc) {
  activeDocumentContext = doc;
  try {
    if (doc) sessionStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(doc));
    else sessionStorage.removeItem(DOCUMENT_STORAGE_KEY);
  } catch {}
  updateDocumentContextUI();
}

function loadActiveDocument() {
  try {
    const raw = sessionStorage.getItem(DOCUMENT_STORAGE_KEY);
    activeDocumentContext = raw ? JSON.parse(raw) : null;
  } catch {
    activeDocumentContext = null;
  }
  updateDocumentContextUI();
}

function clearActiveDocument() {
  saveActiveDocument(null);
}

function updateDocumentContextUI() {
  if (!documentContextBanner || !documentContextTitle || !documentContextSubtitle) return;
  if (!activeDocumentContext?.name) {
    documentContextBanner.hidden = true;
    return;
  }

  const chunkCount = Array.isArray(activeDocumentContext.chunks)
    ? activeDocumentContext.chunks.length
    : 0;
  documentContextTitle.textContent = `${activeDocumentContext.name} ready`;
  documentContextSubtitle.textContent =
    chunkCount > 0
      ? `Answer may use uploaded document. ${chunkCount} chunks indexed in browser.`
      : "Answer may use uploaded document.";
  documentContextBanner.hidden = false;
}

async function extractPdfText(file) {
  const pdfjsLib = (await window.pdfjsLibReady) || window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("PDF parsing is unavailable right now.");
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    disableWorker: true,
  }).promise;
  const pageTexts = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pageTexts.push(pageText);
  }

  return pageTexts.join("\n\n");
}

async function extractDocumentText(file) {
  if (!file) return "";
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.type || "").toLowerCase();

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("csv") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    [".txt", ".md", ".json", ".csv", ".xml", ".html", ".css", ".js", ".ts", ".py", ".java", ".c", ".cpp"].some((ext) => name.endsWith(ext))
  ) {
    return file.text();
  }

  return "";
}

async function handleDocumentUpload(file) {
  const extractedText = await extractDocumentText(file);
  const normalizedText = String(extractedText || "").replace(/\s+/g, " ").trim();
  if (!normalizedText) {
    clearActiveDocument();
    return false;
  }

  saveActiveDocument({
    name: file.name || "document",
    type: file.type || "",
    text: normalizedText.slice(0, 120000),
    chunks: chunkText(normalizedText),
    savedAt: Date.now(),
  });
  return true;
}

function buildDocumentContext(question) {
  if (!activeDocumentContext?.chunks?.length) return "";
  const matches = getRelevantChunks(question, activeDocumentContext.chunks);
  if (!matches.length) return "";

  const chunksToUse = matches.slice(0, Math.min(matches.length, 3));
  return chunksToUse
    .map((chunk, index) => `[Chunk ${index + 1}]\n${chunk}`)
    .join("\n\n");
}

function getStructuredPromptForQuestion(question) {
  const shouldUseMemory = isMemoryRelevant(question);
  const memoryText = shouldUseMemory ? formatUserMemories() : "No saved memory.";
  const documentContext = buildDocumentContext(question);
  const recentMessages = shouldUseRecentConversation(question)
    ? formatRecentConversation()
    : "No recent chat.";
  const shouldWrap =
    memoryText !== "No saved memory." ||
    !!documentContext ||
    recentMessages !== "No recent chat.";

  if (!shouldWrap) {
    return {
      message: question,
      usedMemory: false,
      usedDocument: false,
    };
  }

  return {
    message: buildPrompt({
      question,
      recentMessages,
      documentContext,
      memoryText,
    }),
    usedMemory: memoryText !== "No saved memory.",
    usedDocument: !!documentContext,
  };
}


// ================= DOM ELEMENTS =================
// ... (keep all your DOM element declarations as is)

// ================= SUPABASE AUTH =================
// ðŸ”´ REPLACE WITH YOUR ACTUAL VALUES
// ================= SUPABASE AUTH =================
// âœ… Use the ONE global client created in index.html
const supabaseClient = window.supabaseClient || null;

// small helper to avoid crashes
function ensureSupabase() {
  if (!supabaseClient) {
    console.warn("supabaseClient not found. Did you init it in index.html?");
    return false;
  }
  return true;
}

function hasOAuthCallbackParams() {
  const hash = String(window.location.hash || "");
  const search = String(window.location.search || "");
  return /access_token=|refresh_token=|code=|error=|error_code=/i.test(`${hash}${search}`);
}

const OAUTH_SESSION_SETTLE_MS = 10000;
let oauthSessionSettlingUntil = hasOAuthCallbackParams()
  ? Date.now() + OAUTH_SESSION_SETTLE_MS
  : 0;

function markOAuthSessionSettling(durationMs = OAUTH_SESSION_SETTLE_MS) {
  oauthSessionSettlingUntil = Date.now() + Math.max(500, durationMs);
}

function isOAuthSessionSettling() {
  return hasOAuthCallbackParams() || Date.now() < oauthSessionSettlingUntil;
}

function clearOAuthCallbackUrl() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

function clearLegacySessionState() {
  try {
    localStorage.removeItem("genie_session_state");
  } catch {}
}

function isInvalidRefreshTokenError(error) {
  const message = getAuthErrorText(error);
  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
}

function isMissingAuthSessionError(error) {
  const message = getAuthErrorText(error);
  const name = String(error?.name || error?.error || "").toLowerCase();
  return (
    name.includes("authsessionmissingerror") ||
    message.includes("auth session missing")
  );
}

function getAuthErrorText(error) {
  const parts = [
    error?.name,
    error?.message,
    error?.error,
    error?.error_description,
    error?.msg,
    error?.cause?.name,
    error?.cause?.message,
    error?.cause?.error,
    error?.cause?.error_description,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (parts.length) return parts.join(" | ");
  return String(error || "").toLowerCase();
}

function isExpectedSupabaseAuthError(error) {
  const text = getAuthErrorText(error);
  return (
    isMissingAuthSessionError(error) ||
    isInvalidRefreshTokenError(error) ||
    text.includes("invalid_grant") ||
    text.includes("token has expired") ||
    text.includes("session_not_found") ||
    text.includes("refresh_token_not_found")
  );
}

let authRecoveryPromise = null;

async function waitForSupabaseSession(timeoutMs = 8000, intervalMs = 200) {
  if (!ensureSupabase()) return null;

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        if (hasOAuthCallbackParams()) clearOAuthCallbackUrl();
        return session;
      }
    } catch (error) {
      if (!isExpectedSupabaseAuthError(error)) {
        console.warn("Waiting for OAuth session failed:", error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}


// ================= AUTH HELPER FUNCTIONS =================
async function getCurrentUser() {
  if (!ensureSupabase()) return null;
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

async function getSession() {
  if (!ensureSupabase()) return null;
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

// âœ… SINGLE getUserId function (KEEP THIS ONE, DELETE THE OTHER)
async function getUserId() {
  const user = await getCurrentUser();
  return user?.id || null;
}

// Update auth button based on login status
// ================= AUTH BUTTON HANDLER =================

// ================= AUTH BUTTON HANDLER =================

// ================= AUTH BUTTON HANDLER =================
// ================= COMPLETE AUTH SYSTEM WITH LOGOUT =================

// Update auth button based on login status
async function updateAuthButton() {
  const authBtn = document.getElementById("auth-btn");
  if (!authBtn) return;

  const newBtn = authBtn.cloneNode(true);
  authBtn.parentNode.replaceChild(newBtn, authBtn);

  if (newBtn.tagName === "BUTTON") newBtn.type = "button";

  let session = null;
  try {
    session = await recoverAuthSession();
  } catch (error) {
    console.warn("Error recovering session in updateAuthButton:", error);
  }

  if (session) {
    const userEmail = session.user?.email || "User";
    const displayName = userEmail.split("@")[0];

    newBtn.innerHTML = `
      <span class="material-symbols-outlined">account_circle</span>
      <span class="auth-copy">
        <strong class="auth-text">Account</strong>
        <small class="auth-subtext">${displayName} • ${userEmail}</small>
      </span>
    `;

    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "./auth.html";
    });

  } else {
    newBtn.innerHTML = `
      <span class="material-symbols-outlined">person</span>
      <span class="auth-copy">
        <strong class="auth-text">Account Login</strong>
        <small class="auth-subtext">Tap to sign in or manage your account</small>
      </span>
    `;

    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "./auth.html";
    });
  }

  try {
    await syncMicAuthState();
  } catch (error) {
    console.warn("Error syncing mic auth state:", error);
  }
}

// Delegated fallback: always open auth page when auth button is clicked.
document.addEventListener("click", (e) => {
  const btn = e.target.closest("#auth-btn");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  window.location.href = "./auth.html";
});


// Handle logout process
async function handleLogout() {
  try {
    console.log('Logging out...');
    
    // Show loading state
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
      authBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span><span>Logging out...</span>';
      authBtn.disabled = true;
    }
    
    // Sign out from Supabase
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;
    
    // Clear app-local data only.
    // Let Supabase manage its own auth storage keys to avoid desync.
    localStorage.removeItem('genie_activeChatId');
    clearLegacySessionState();
    
    // Reset UI but keep main chat layout (no welcome flow)
    if (chatbox) chatbox.innerHTML = '';
    document.body.classList.add('chat-started', 'show-chatbot');
    if (container) container.style.display = 'block';
    if (welcome) welcome.style.display = 'none';
    if (window.innerWidth > 480) document.body.classList.add('show-history');
    
    // Update button back to login
    await updateAuthButton();
    
    // Show success message
    alert('Logged out successfully!');
    
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout');
    await updateAuthButton();
  }
}

// Optional: Add a nice notification system
function showNotification(message, type = 'info') {
  // Check if notification container exists
  let container = document.getElementById('notification-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
    `;
    document.body.appendChild(container);
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
    font-weight: 500;
    min-width: 200px;
  `;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function ensureNetworkBanner() {
  let banner = document.getElementById("network-status-banner");
  if (banner) return banner;

  banner = document.createElement("div");
  banner.id = "network-status-banner";
  banner.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 20px;
    transform: translateX(-50%);
    z-index: 10000;
    max-width: min(92vw, 520px);
    width: max-content;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(17, 24, 39, 0.96);
    color: #fff;
    box-shadow: 0 10px 30px rgba(0,0,0,0.28);
    font-size: 14px;
    line-height: 1.45;
    display: none;
  `;
  document.body.appendChild(banner);
  return banner;
}

function showNetworkBanner(message) {
  const banner = ensureNetworkBanner();
  banner.textContent = message;
  banner.style.display = "block";
}

function hideNetworkBanner() {
  const banner = document.getElementById("network-status-banner");
  if (banner) banner.style.display = "none";
}

function isOfflineLikeError(error) {
  if (!error) return !navigator.onLine;
  const text = String(error?.message || error).toLowerCase();
  return (
    !navigator.onLine ||
    error?.name === "TypeError" ||
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("load failed") ||
    text.includes("network request failed") ||
    text.includes("internet")
  );
}

function getFriendlyOfflineMessage(action = "complete this request") {
  return `Internet is down. Please check your connection and try again to ${action}.`;
}

function updateNetworkStatusUI() {
  if (navigator.onLine) hideNetworkBanner();
  else showNetworkBanner("Internet is down. Please reconnect and refresh or try again.");
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  #auth-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border: none;
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  #auth-btn:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  }
  
  #auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .weather-reply-box {
    display: block;
    width: 100%;
    max-width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(148, 163, 184, 0.12);
    padding: 10px 12px;
    line-height: 1.6;
    white-space: pre-line;
  }

  body.light-mode .weather-reply-box {
    background: rgba(15, 23, 42, 0.06);
    border-color: rgba(15, 23, 42, 0.18);
    color: #0f172a;
  }
`;
document.head.appendChild(style);

// ================= APP CONFIG =================
const WEATHER_API_KEY = "c4846573091c7b3978af67020443a2b4";
const DEFAULT_BACKEND_URL = "https://genie-backend-1.onrender.com";
const IS_LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || "");
const BACKEND_URL = IS_LOCAL_HOST
  ? "http://localhost:3000"
  : (window.GENIE_BACKEND_URL || DEFAULT_BACKEND_URL);
const ACTIVE_CHAT_STORAGE_KEY = "genie_activeChatId";
const APP_RESUME_THROTTLE_MS = 2500;

function readStoredActiveChatId() {
  try {
    const stored = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
    return isValidChatId(stored) ? stored : null;
  } catch {
    return null;
  }
}

function readLastOpenedChatId() {
  try {
    const stored = localStorage.getItem(LAST_OPEN_CHAT_STORAGE_KEY);
    return isValidChatId(stored) ? stored : null;
  } catch {
    return null;
  }
}

function persistActiveChatId(chatId) {
  const nextChatId = isValidChatId(chatId) ? String(chatId).trim() : null;
  activeChatId = nextChatId;
  try {
    if (nextChatId) {
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, nextChatId);
      localStorage.setItem(LAST_OPEN_CHAT_STORAGE_KEY, nextChatId);
    } else {
      localStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
    }
  } catch {}
  return nextChatId;
}

async function recoverAuthSession() {
  if (authRecoveryPromise) return authRecoveryPromise;

  authRecoveryPromise = (async () => {
  if (!ensureSupabase()) return null;

  try {
    const session = await getSession();
    if (session?.access_token) return session;
  } catch (error) {
    if (!isExpectedSupabaseAuthError(error)) {
      console.warn("Initial session read failed:", error);
    }
  }

  // If OAuth callback is in progress, wait for it to be processed
  if (hasOAuthCallbackParams()) {
    markOAuthSessionSettling();
    console.log("OAuth callback detected, recovering session...");
    const callbackSession = await waitForSupabaseSession();
    // Always clean URL so one-time tokens are not reused on next reload.
    clearOAuthCallbackUrl();
    if (callbackSession?.access_token) {
      markOAuthSessionSettling(2500);
      return callbackSession;
    }
    clearLegacySessionState();
    return null;
  }

  // During OAuth settle window, avoid forcing refresh/recovery paths.
  if (isOAuthSessionSettling()) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  } catch (error) {
    if (isExpectedSupabaseAuthError(error)) {
      clearLegacySessionState();
      return null;
    }
    console.warn("Session recovery failed:", error);
    return null;
  }
  })();

  try {
    return await authRecoveryPromise;
  } finally {
    authRecoveryPromise = null;
  }
}

async function apiFetch(url, options = {}) {
  let session = await recoverAuthSession();
  let accessToken = session?.access_token;
  if (!accessToken && isOAuthSessionSettling()) {
    session = await waitForSupabaseSession(3000, 200);
    accessToken = session?.access_token;
  }
  if (!accessToken) {
    window.location.href = "./auth.html";
    throw new Error("Not authenticated");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  };

  let response = await fetch(url, { ...options, headers });
  if (response.status !== 401 || !supabaseClient) {
    return response;
  }

  try {
    if (isOAuthSessionSettling()) {
      return response;
    }
    const { data, error } = await supabaseClient.auth.refreshSession();
    const refreshedToken = data?.session?.access_token;
    if (error || !refreshedToken) {
      throw error || new Error("No refreshed session");
    }

    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${refreshedToken}`,
      },
    });

    if (response.status !== 401) {
      return response;
    }
  } catch (error) {
    if (isMissingAuthSessionError(error)) {
      return response;
    }
    if (isInvalidRefreshTokenError(error)) {
      clearLegacySessionState();
    }
    console.warn("Session refresh failed after 401:", error);
  }

  try {
    await supabaseClient.auth.signOut();
  } catch {}
  window.location.href = "./auth.html";
  throw new Error("Session expired");
}

let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let conversationMemory = [];
let activeChatId = readStoredActiveChatId();
let speechRecognition = null;
let voices = [];
let sttSupported = false;
let sttListening = false;
let sttInitialized = false;
let sttHasFinalInSession = false;
let sttAutoSendTimer = null;
const STT_AUTO_SEND_PAUSE_MS = 1200;
let isRequestInFlight = false;
let activeRequestController = null;
let stopGenerationRequested = false;
let isAssistantTypingAnimationActive = false;
let pendingChatScrollFrame = 0;
let sessionsSidebarLoadPromise = null;
let lastSessionsSidebarSnapshot = "";
let lastAppResumeAt = 0;

function isValidChatId(value) {
  const chatId = String(value || "").trim();
  if (!chatId) return false;

  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      chatId,
    )
  );
}

function generateDraftChatId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function requestStopGeneration() {
  stopGenerationRequested = true;
  if (activeRequestController) {
    try {
      activeRequestController.abort();
    } catch {}
  }
}

function throwIfGenerationStopped() {
  if (stopGenerationRequested) {
    const err = new Error("Generation stopped by user");
    err.name = "AbortError";
    throw err;
  }
}

async function rollbackCancelledResponse(userMessage) {
  try {
    if (!activeChatId) return;
    const trimmed = String(userMessage || "").trim();
    if (!trimmed) return;
    await apiFetch(`${BACKEND_URL}/chat/rollback-last`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: activeChatId,
        userMessage: trimmed,
      }),
    });
  } catch (error) {
    console.error("Failed to rollback cancelled response:", error);
  }
}

function setComposerBusy(isBusy) {
  isRequestInFlight = !!isBusy;
  if (chatInput) {
    chatInput.readOnly = false;
    chatInput.style.opacity = "";
  }
  if (sendChatBtn) {
    sendChatBtn.disabled = isRequestInFlight;
    sendChatBtn.style.display = "inline-flex";
    sendChatBtn.style.opacity = isRequestInFlight ? "0.55" : "";
    sendChatBtn.style.cursor = isRequestInFlight ? "not-allowed" : "";
  }
  if (stopChatBtn) {
    stopChatBtn.disabled = !isRequestInFlight;
    stopChatBtn.style.display = isRequestInFlight ? "inline-flex" : "none";
  }
  if (imageUploadInput) imageUploadInput.disabled = isRequestInFlight;
  if (imageUploadLabel) imageUploadLabel.setAttribute("aria-disabled", String(isRequestInFlight));
  if (imageModeBtn) imageModeBtn.disabled = isRequestInFlight;
  if (micBtn && isRequestInFlight) micBtn.disabled = true;
  if (!isRequestInFlight) {
    activeRequestController = null;
    stopGenerationRequested = false;
    syncMicAuthState().catch(() => {});
  }
}

// ================= INITIALIZATION =================
// âœ… SINGLE DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', async () => {
  console.log("Initializing app...");

  try {
    // Update auth button first
    await updateAuthButton();
    if (supabaseClient?.auth?.onAuthStateChange) {
      supabaseClient.auth.onAuthStateChange(async () => {
        await updateAuthButton();
        await syncMicAuthState();
      });
    }

    // Then initialize the rest
    await initializeApp();
    markAppView();
    setupDownloadAppButton();
    syncSidebarCloseButton();
  } finally {
    requestAnimationFrame(() => {
      revealAppShell();
      updateNetworkStatusUI();
    });
  }
});

// ================= WEBVIEW DETECTION =================
function markAppView() {
  const ua = navigator.userAgent || "";
  const isWebView = /wv/i.test(ua) || 
                    (ua.includes("Version/") && ua.includes("Chrome/"));
  
  if (isWebView) {
    document.body.classList.add("app-view");
    console.log("App view detected");
  }
}

async function initializeApp() {
  console.log("Initializing app...");

  // 1) Start directly on main chat page
  initUIState();
  loadMemories();
  loadActiveDocument();

  // 2) Recover auth once, then read user from recovered session/current auth state
  const recoveredSession = await recoverAuthSession();
  const userId = recoveredSession?.user?.id || (await getUserId());
  if (!userId) {
    console.warn("No authenticated session found. Redirecting to auth page...");
    window.location.href = "./auth.html";
    return;
  }
  console.log("User ID:", userId);

  // 3) Theme + speech + mic
  initTheme();
  initSpeechSynthesis();
  initMicrophone();

  // 4) Events
  initEventListeners();
  setImageMode(false);

  // 5) Backend check
  testBackendConnection().catch(console.error);

  // 6) Always start on the fresh home screen.
  persistActiveChatId(null);
  resetChatDraftView();
  await loadSessionsSidebar(true);
  syncFreshChatLayout();

  console.log("App initialized");
}
// ================= CORE FUNCTIONS =================

// 1. USER MANAGEMENT


function initUIState() {
  // Always open main chat layout
  document.body.classList.add("chat-started", "show-chatbot");
  if (window.innerWidth > 480) {
    document.body.classList.add("show-history");
  } else {
    document.body.classList.remove("show-history");
  }

  if (welcome) welcome.style.display = "none";
  if (container) container.style.display = "block";

  // Reset sidebar inline overrides from old welcome flow
  if (historySidebar) {
    historySidebar.classList.remove("active");
    historySidebar.style.display = "";
    historySidebar.style.transform = "";
  }

  syncFreshChatLayout();
}
// 3. THEME MANAGEMENT
function initTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
    }
    updateMemorySettingsSummary();
}
// 4. EVENT LISTENERS
function initEventListeners() {
    if (sidebarSettingsBtn) {
        sidebarSettingsBtn.addEventListener("click", () => openMemoryModal());
    }
    if (closeMemoryBtn) {
        closeMemoryBtn.addEventListener("click", () => closeMemoryModal());
    }
    if (clearMemoryBtn) {
        clearMemoryBtn.addEventListener("click", () => {
            clearMemories();
            renderMemoryList();
        });
    }
  if (settingsThemeBtn) {
        settingsThemeBtn.addEventListener("click", () => {
            toggleThemePreference();
        });
    }
    if (memoryModal) {
        memoryModal.addEventListener("click", (e) => {
            if (e.target instanceof HTMLElement && e.target.dataset.closeMemory === "true") {
                closeMemoryModal();
            }
        });
    }
    if (homeContinueBtn) {
        homeContinueBtn.addEventListener("click", async () => {
            const lastChatId = readLastOpenedChatId();
            if (!lastChatId) {
                return;
            }
            persistActiveChatId(lastChatId);
            await openSession(lastChatId);
        });
    }
    if (clearDocumentBtn) {
        clearDocumentBtn.addEventListener("click", () => {
            clearActiveDocument();
            pendingDocumentContext = null;
        });
    }

    // ðŸ”´ COMMENT OUT THIS OLD AUTH HANDLER - It's conflicting!
    // if (authBtn) {
    //     authBtn.addEventListener("click", () => {
    //         const authPath = "./auth.html";
    //         window.location.href = authPath;
    //     });
    // }

    // Send message on button click
    if (sendChatBtn) sendChatBtn.addEventListener("click", handleChat);
    if (stopChatBtn) stopChatBtn.addEventListener("click", requestStopGeneration);
    if (imageModeBtn) {
        imageModeBtn.addEventListener("click", () => {
            if (pendingMediaSelected) {
                alert("Remove selected file to use image generation mode.");
                return;
            }
            setImageMode(!imageModeEnabled);
            chatInput?.focus();
        });
    }
    
    // Send message on Enter (without Shift)
    if (chatInput) {
        const resizeComposer = () => {
            chatInput.style.height = "44px";
            chatInput.style.height = `${Math.min(chatInput.scrollHeight, 160)}px`;
        };
        chatInput.addEventListener("input", resizeComposer);
        resizeComposer();

        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChat();
            }
        });
    }
    
    // Start chat button
    if (startChatBtn) {
        startChatBtn.addEventListener("click", async () => {
            await startChat();
        });
    }
    
    // Close chatbot
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            // Keep app on main chat page; only close sidebar on mobile
            if (historySidebar && window.innerWidth <= 480) {
                historySidebar.classList.remove("active");
                historySidebar.style.display = "none";
                historySidebar.style.transform = "translateX(-100%)";
            }
        });
    }
    
    // SIDEBAR TOGGLE - FIXED VERSION
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            console.log("ðŸ“± Sidebar toggle clicked");
            
            if (!historySidebar) {
                console.error("History sidebar not found");
                return;
            }
            
            const isMobile = window.innerWidth <= 480;
            
            if (isMobile) {
                // Mobile: toggle active class
                historySidebar.classList.toggle("active");
                console.log("ðŸ“± Sidebar active:", historySidebar.classList.contains("active"));
                
                // Show/hide with display property for mobile
                if (historySidebar.classList.contains("active")) {
                    historySidebar.style.display = "block";
                    historySidebar.style.transform = "translateX(0)";
                } else {
                    historySidebar.style.display = "none";
                    historySidebar.style.transform = "translateX(-100%)";
                }
            } else {
                // Desktop: just ensure it's visible
                historySidebar.style.display = "block";
                historySidebar.style.transform = "translateX(0)";
            }
        });
    }
    
    // New chat button
    if (newChatBtn) {
        newChatBtn.addEventListener("click", async () => {
            await createNewChat();
        });
    }
    
    // Delete all chats
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener("click", async () => {
            await deleteAllChats();
        });
    }

    if (imageUploadInput) {
        imageUploadInput.addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!isSupportedMediaFile(file)) {
                alert("Please select an image or supported document.");
                return;
            }

            revokePendingMediaPreviewHref();
            pendingMediaPreviewHref = URL.createObjectURL(file);
            pendingMediaSelected = true;
            pendingMediaLoading = true;
            pendingDocumentContext = null;
            setImageMode(false);
            pendingImageData = null;
            pendingImageName = file.name || "file";
            pendingMediaType = String(file.type || "");

            const reader = new FileReader();
            reader.onload = async () => {
                pendingImageData = String(reader.result || "");
                pendingImageName = file.name || "file";
                pendingMediaType = String(file.type || "");
                try {
                    const docReady = await handleDocumentUpload(file);
                    pendingDocumentContext = docReady ? { name: pendingImageName, type: pendingMediaType } : null;
                } catch (error) {
                    console.error("Document extraction failed:", error);
                    pendingDocumentContext = null;
                    if ((pendingMediaType || "").includes("pdf") || (pendingMediaType || "").startsWith("text/")) {
                        showNotification(error.message || "Could not read document in browser.", "error");
                    }
                } finally {
                    pendingMediaLoading = false;
                }
                renderSelectedMediaPreview({
                    mediaData: pendingImageData,
                    mediaName: pendingImageName,
                    mediaType: pendingMediaType,
                    previewHref: pendingMediaPreviewHref,
                });

                if (chatInput) {
                    chatInput.placeholder = pendingDocumentContext
                      ? "Ask a question about the loaded document..."
                      : "Add prompt for selected file...";
                    chatInput.focus();
                }
            };
            reader.onerror = () => {
                pendingImageData = null;
                pendingImageName = "";
                pendingMediaType = "";
                pendingMediaSelected = false;
                pendingMediaLoading = false;
                pendingDocumentContext = null;
                revokePendingMediaPreviewHref();
                alert("Failed to read file.");
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Close sidebar when clicking outside (mobile only)
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 480 && 
            historySidebar && 
            historySidebar.classList.contains("active") &&
            !historySidebar.contains(e.target) &&
            e.target !== sidebarToggle &&
            !sidebarToggle?.contains(e.target)) {
            historySidebar.classList.remove("active");
            historySidebar.style.display = "none";
            historySidebar.style.transform = "translateX(-100%)";
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && memoryModal && !memoryModal.hidden) {
            closeMemoryModal();
        }
    });
    
    // Handle window resize
    window.addEventListener("resize", handleResize);
    window.addEventListener("pageshow", () => {
        resumeAppSession({ reloadChat: true }).catch(console.error);
    });
    window.addEventListener("focus", () => {
        resumeAppSession({ reloadChat: false }).catch(console.error);
    });
    window.addEventListener("online", () => {
        updateNetworkStatusUI();
        resumeAppSession({ reloadChat: true }).catch(console.error);
    });
    window.addEventListener("offline", () => {
        updateNetworkStatusUI();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            updateNetworkStatusUI();
            resumeAppSession({ reloadChat: true }).catch(console.error);
        }
    });
}

// 5. CHAT MANAGEMENT
async function startChat() {
    console.log("ðŸ’¬ Starting chat...");
    
    // Update UI state
    document.body.classList.add("chat-started", "show-chatbot");
    
    if (welcome) welcome.style.display = "none";
    if (container) container.style.display = "block";
    
    // Handle sidebar based on screen size
    if (window.innerWidth > 480) {
        // Desktop: show sidebar
        if (historySidebar) {
            historySidebar.style.display = "block";
            historySidebar.style.transform = "translateX(0)";
        }
        document.body.classList.add("show-history");
    } else {
        // Mobile: hide sidebar initially
        if (historySidebar) {
            historySidebar.style.display = "none";
            historySidebar.style.transform = "translateX(-100%)";
        }
    }
    
    // Keep the composer ready, but don't auto-open any previous chat on load
    await ensureActiveChat({ createIfMissing: false, loadMessages: false });
    
    // Focus on input
    if (chatInput) chatInput.focus();
}

function resetChatDraftView() {
    persistActiveChatId(null);
    activePromptGroup = "";
    conversationMemory = [];
    if (chatbox) {
        chatbox.innerHTML = "";
        chatbox.scrollTo(0, 0);
    }
    syncFreshChatLayout();
}

async function ensureActiveChat(options = {}) {
    const {
        createIfMissing = true,
        loadMessages = true,
        refreshSidebar = true,
    } = options;
    const userId = await getUserId();  // âœ… Added await
    if (!userId) return;

    if (activeChatId && !isValidChatId(activeChatId)) {
        persistActiveChatId(null);
    }
    
    if (!activeChatId) {
        if (!createIfMissing) {
            resetChatDraftView();
            if (refreshSidebar) await loadSessionsSidebar();
            return null;
        }

        // Keep the draft local until the first successful response is saved.
        persistActiveChatId(generateDraftChatId());
    }
    
    if (refreshSidebar) {
        // Load sidebar sessions
        await loadSessionsSidebar();
    }
    
    if (loadMessages) {
        // Load chat messages
        await loadChatFromServer(activeChatId);
    }

    return activeChatId;
}

async function createNewChat() {
    resetChatDraftView();
    await loadSessionsSidebar();
    if (chatInput) chatInput.focus();
}

async function openSession(chatId) {
    persistActiveChatId(chatId);
    await loadChatFromServer(chatId);
    await loadSessionsSidebar();
    syncFreshChatLayout();
}

function closeAllHistoryMenus() {
    document.querySelectorAll(".history-item.menu-open").forEach((item) => {
        item.classList.remove("menu-open");
    });
    document.querySelectorAll(".history-item-actions-menu.open").forEach((menu) => {
        menu.classList.remove("open");
        menu.classList.remove("open-up");
    });
}

function positionHistoryMenu(li, menu) {
    if (!li || !menu) return;
    menu.classList.remove("open-up");
    const listRect = historyList?.getBoundingClientRect?.() || null;
    const menuRect = menu.getBoundingClientRect();
    const limitBottom = listRect ? Math.min(listRect.bottom, window.innerHeight) : window.innerHeight;
    if (menuRect.bottom > limitBottom - 8) {
        menu.classList.add("open-up");
    }
}

async function saveSessionTitle(chatId, title) {
    const userId = await getUserId();
    if (!userId) return false;
    const sanitized = String(title || "").trim().slice(0, 60);
    if (!sanitized) return false;
    try {
        const resp = await apiFetch(`${BACKEND_URL}/chat/${userId}/${chatId}/title`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: sanitized }),
        });
        return resp.ok;
    } catch (error) {
        console.error("? Error renaming session:", error);
        return false;
    }
}

function beginInlineRename(li, session) {
    if (!li || li.classList.contains("renaming")) return;
    const titleEl = li.querySelector(".history-title");
    if (!titleEl) return;

    li.classList.add("renaming");
    const originalTitle = String(session.title || "New chat");
    titleEl.innerHTML = "";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "history-title-input";
    input.value = originalTitle;
    input.maxLength = 60;
    titleEl.appendChild(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = async (save) => {
        if (finished) return;
        finished = true;
        const next = input.value.trim();
        li.classList.remove("renaming");

        if (save && next && next !== originalTitle) {
            const ok = await saveSessionTitle(session.chatId, next);
            if (!ok) {
                await loadSessionsSidebar();
                return;
            }
        }
        await loadSessionsSidebar();
    };

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            await finish(true);
        } else if (e.key === "Escape") {
            e.preventDefault();
            await finish(false);
        }
    });

    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("blur", async () => {
        await finish(true);
    });
}

function renderSessionsSidebar(sessions = []) {
    if (!historyList) return;

    historyList.innerHTML = "";

    if (sessions.length === 0) {
        const noChatsLi = document.createElement("li");
        noChatsLi.className = "no-chats";
        noChatsLi.textContent = "No chats yet";
        historyList.appendChild(noChatsLi);
        return;
    }

    sessions.forEach(session => {
        const li = document.createElement("li");
        li.className = "history-item";
        if (session.chatId === activeChatId) li.classList.add("active");

        li.innerHTML = `
            <span class="history-title"><span class="history-title__text">${escapeHtml(session.title || "New chat")}</span></span>
            <button class="history-actions-btn material-symbols-outlined" type="button" title="More">more_horiz</button>
            <div class="history-item-actions-menu">
              <button type="button" class="history-menu-item edit-item">
                <span class="material-symbols-outlined">edit</span>
                <span>Edit</span>
              </button>
              <button type="button" class="history-menu-item delete-item">
                <span class="material-symbols-outlined">delete</span>
                <span>Delete</span>
              </button>
            </div>
        `;

        li.addEventListener("click", (e) => {
            if (e.target.closest(".history-actions-btn") || e.target.closest(".history-item-actions-menu")) return;
            openSession(session.chatId);
        });

        const actionsBtn = li.querySelector(".history-actions-btn");
        const menu = li.querySelector(".history-item-actions-menu");
        actionsBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains("open");
            closeAllHistoryMenus();
            if (!isOpen) {
                menu.classList.add("open");
                li.classList.add("menu-open");
                requestAnimationFrame(() => positionHistoryMenu(li, menu));
            }
        });

        li.querySelector(".edit-item")?.addEventListener("click", async (e) => {
            e.stopPropagation();
            closeAllHistoryMenus();
            beginInlineRename(li, session);
        });

        li.querySelector(".delete-item")?.addEventListener("click", async (e) => {
            e.stopPropagation();
            closeAllHistoryMenus();
            await deleteSession(session.chatId);
        });

        historyList.appendChild(li);
    });

    const spacer = document.createElement("li");
    spacer.className = "history-list-spacer";
    spacer.setAttribute("aria-hidden", "true");
    historyList.appendChild(spacer);
}

async function loadSessionsSidebar(force = false) {
    if (sessionsSidebarLoadPromise && !force) return sessionsSidebarLoadPromise;

    sessionsSidebarLoadPromise = (async () => {
        const userId = await getUserId();
        if (!userId) return;

        try {
            const resp = await apiFetch(`${BACKEND_URL}/chats/${userId}`);
            if (!resp.ok) throw new Error("Failed to load sessions");

            const data = await resp.json();
            const sessions = data.sessions || [];
            const snapshot = JSON.stringify(
                sessions.map((session) => ({
                    chatId: session.chatId,
                    title: session.title || "New chat",
                    active: session.chatId === activeChatId,
                }))
            );

            if (!force && snapshot === lastSessionsSidebarSnapshot) return;

            lastSessionsSidebarSnapshot = snapshot;
            renderSessionsSidebar(sessions);
        } catch (error) {
            console.error("Error loading sessions:", error);
            const errorLi = document.createElement("li");
            errorLi.className = "error";
            errorLi.textContent = isOfflineLikeError(error)
              ? "Internet is down. Reconnect and refresh to load chats."
              : "Failed to load chats";
            historyList.innerHTML = "";
            historyList.appendChild(errorLi);
            setTimeout(() => {
                loadSessionsSidebar(true).catch(() => {});
            }, 2500);
        } finally {
            sessionsSidebarLoadPromise = null;
        }
    })();

    return sessionsSidebarLoadPromise;
}

document.addEventListener("click", (e) => {
    if (!e.target.closest(".history-item-actions-menu") && !e.target.closest(".history-actions-btn")) {
        closeAllHistoryMenus();
    }
});

async function loadChatFromServer(chatId) {
    const userId = await getUserId();
    if (!userId) return;
    
    try {
        const resp = await apiFetch(`${BACKEND_URL}/chat/${userId}/${chatId}`);
        if (!resp.ok) throw new Error("Failed to load chat");
        
        const data = await resp.json();
        chatbox.innerHTML = "";
        conversationMemory = [];
        
        (data.messages || []).forEach(msg => {
            if (msg.role === "user") {
                chatbox.appendChild(createChatLi(msg.message, "outgoing"));
                conversationMemory.push({ role: "user", text: msg.message });
            } else {
                const li = createChatLi("", "incoming");
                const content = li.querySelector(".bot-message-content");

                renderAssistantMessage(content, msg.message);

                if (window.Prism) Prism.highlightAllUnder(content);
                enableCopyButtons(content);
                ensureMsgActions(li.querySelector(".bot-message-container"));
                
                chatbox.appendChild(li);
                conversationMemory.push({ role: "assistant", text: msg.message });
            }
        });
        
        chatbox.scrollTo(0, chatbox.scrollHeight);
        syncFreshChatLayout();
    } catch (error) {
        console.error("Error loading chat:", error);
        const looksRecoverable =
            error?.name === "TypeError" ||
            /network|fetch|load chat/i.test(String(error?.message || ""));
        if (looksRecoverable) {
            setTimeout(() => {
                if (chatId === activeChatId) {
                    loadChatFromServer(chatId).catch(() => {});
                }
            }, 2500);
        }
        // Create properly styled error message
        const errorLi = document.createElement("li");
        errorLi.className = "chat incoming error";
        errorLi.innerHTML = `
            <div class="bot-message-container">
                <p>${escapeHtml(
                  isOfflineLikeError(error)
                    ? "Internet is down. Please reconnect and refresh or open the chat again."
                    : "Failed to load chat. Please check your connection and try again."
                )}</p>
            </div>
        `;
        chatbox.innerHTML = "";
        chatbox.appendChild(errorLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        syncFreshChatLayout();
    }
}

async function deleteSession(chatId) {
    const userId = await getUserId();
    if (!userId) return;
    
    try {
        await apiFetch(`${BACKEND_URL}/chat/${userId}/${chatId}`, {
            method: "DELETE"
        });
        
        // If deleted current chat, create a new one
        if (chatId === activeChatId) {
            resetChatDraftView();
            await loadSessionsSidebar();
        } else {
            await loadSessionsSidebar();
        }
    } catch (error) {
        console.error("Error deleting session:", error);
    }
}

async function deleteAllChats() {
    const userId = await getUserId();
    if (!userId) return;
    
    if (!confirm("Are you sure you want to delete all chats?")) return;
    
    try {
        await apiFetch(`${BACKEND_URL}/chats/${userId}`, {
            method: "DELETE"
        });
        
        resetChatDraftView();
        await loadSessionsSidebar();
    } catch (error) {
        console.error("Error deleting all chats:", error);
    }
}

async function resumeAppSession(options = {}) {
    const { reloadChat = true } = options;
    const now = Date.now();
    if (now - lastAppResumeAt < APP_RESUME_THROTTLE_MS) return;
    lastAppResumeAt = now;

    revealAppShell();
    initUIState();

    const session = await recoverAuthSession();
    if (!session) return;

    await updateAuthButton();
    await syncMicAuthState();

    const storedChatId = readStoredActiveChatId();
    if (storedChatId) {
        activeChatId = storedChatId;
    }

    await loadSessionsSidebar(true);
    if (reloadChat && activeChatId) {
        await loadChatFromServer(activeChatId);
    } else {
        syncFreshChatLayout();
    }
}

// 6. MESSAGE HANDLING
function handleChat() {
    if (isRequestInFlight) return;
    const userMessage = chatInput?.value.trim() || "";
    if (!chatInput) return;
    if (!userMessage && !pendingMediaSelected) return;
    stopGenerationRequested = false;
    setComposerBusy(true);

    if (pendingMediaSelected && pendingMediaLoading) {
        alert("File is still loading. Please wait a moment and send again.");
        setComposerBusy(false);
        return;
    }
    
    // Clear input
    chatInput.value = "";
    chatInput.style.height = "44px";

    const imageData = pendingImageData;
    const imageName = pendingImageName;
    const mediaType = pendingMediaType;
    const mediaWasSelected = pendingMediaSelected;
    const localDocumentContext = pendingDocumentContext;
    pendingImageData = null;
    pendingImageName = "";
    pendingMediaType = "";
    pendingMediaSelected = false;
    pendingMediaLoading = false;
    pendingDocumentContext = null;
    revokePendingMediaPreviewHref();
    if (imageUploadInput) imageUploadInput.value = "";
    if (chatInput) {
      chatInput.placeholder = imageModeEnabled
        ? "Describe the image you want to generate..."
        : "Ask anything with GENIE...";
    }
    clearSelectedMediaPreview();

    const hasMediaPayload = mediaWasSelected && isAnyDataUrl(imageData);
    const shouldUseLocalDocumentChat =
      !!localDocumentContext &&
      ((mediaType || "").includes("pdf") || (mediaType || "").startsWith("text/") || ["application/json", "text/csv", "application/xml", "text/xml", "application/javascript", "text/javascript"].includes((mediaType || "").toLowerCase()));
    const shouldGenerateImage = !hasMediaPayload && imageModeEnabled && !!userMessage;

    if (mediaWasSelected && !hasMediaPayload) {
        const errorLi = createChatLi(
          "Selected file could not be prepared. Please upload again.",
          "incoming",
        );
        chatbox.appendChild(errorLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        syncFreshChatLayout();
        setComposerBusy(false);
        return;
    }

    // Add user message to chatbox
    if (hasMediaPayload) {
        chatbox.appendChild(createOutgoingMediaLi({
            mediaData: imageData,
            mediaName: imageName || "file",
            mediaType,
            mediaHref: imageData,
            prompt: userMessage,
        }));
    } else {
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    }
    chatbox.scrollTo(0, chatbox.scrollHeight);
    syncFreshChatLayout();
    
    // Show typing indicator and generate response immediately
    const typingLi = showTypingIndicator();
    const requestMode = hasMediaPayload
      ? "media"
      : shouldUseLocalDocumentChat
        ? "chat"
        : shouldGenerateImage
          ? "image"
          : "chat";
    console.log(`[GENIE] Client requestMode=${requestMode} mediaWasSelected=${mediaWasSelected}`);
    generateResponse(
      typingLi,
      userMessage,
      hasMediaPayload
        ? {
            mediaData: imageData,
            mediaName: imageName || "file",
            mediaType,
          }
        : null,
      requestMode,
    ).catch((err) => {
      console.error("generateResponse error:", err);
      setComposerBusy(false);
    });
}
async function generateResponse(
  incomingChatli,
  userMessage,
  mediaUpload = null,
  requestMode = "chat",
) {
  const messageElement = convertTypingToMessage(incomingChatli);
  let stopThinkingState = applyThinkingState(messageElement, requestMode);
  const hasMediaUpload = requestMode === "media";
  const isImageGeneration = requestMode === "image";
  let responseRenderingStarted = false;

  if (!navigator.onLine) {
    messageElement.textContent = getFriendlyOfflineMessage("send your message");
    showNetworkBanner("Internet is down. Please reconnect and try again.");
    setComposerBusy(false);
    return;
  }

  const ensuredChatId = await ensureActiveChat({
    createIfMissing: true,
    loadMessages: false,
    refreshSidebar: true,
  });
  if (!ensuredChatId) {
    messageElement.innerHTML = "Could not start a new chat. Please try again.";
    setComposerBusy(false);
    return;
  }

  // Check for special commands
  if (!isImageGeneration && (await handleSpecialCommands(messageElement, userMessage))) {
    setComposerBusy(false);
    return;
  }

  let timeout = null;
  try {
    const userId =await getUserId();
    if (!userId) {
      messageElement.innerHTML = "Please login first to continue chatting.";
      window.location.href = "./auth.html";
      return;
    }
    const controller = new AbortController();
    activeRequestController = controller;
    const requestTimeoutMs = hasMediaUpload || isImageGeneration ? 300000 : 30000;
    timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let responseText = "";
    let generatedImageUrl = "";

    if (hasMediaUpload) {
      if (!isAnyDataUrl(mediaUpload?.mediaData)) {
        messageElement.innerHTML =
          "Selected media is not ready yet. Please re-upload the file and send again.";
        return;
      }
      console.log("[GENIE] Route: /analyze-media");
      const response = await apiFetch(`${BACKEND_URL}/analyze-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.trim() || "Analyze this file in detail.",
          mediaData: mediaUpload.mediaData,
          mediaName: mediaUpload.mediaName || "file",
          mediaType: mediaUpload.mediaType || "",
          chatId: activeChatId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let serverMsg = "";
        try {
          const bad = await response.json();
          serverMsg = String(bad?.reply || bad?.error || "");
        } catch {}
        if (response.status >= 500 || response.status === 429 || response.status === 504) {
          responseText =
            "Media analysis is taking longer than expected. Please try again in a moment.";
        } else if (serverMsg) {
          responseText = serverMsg;
        } else {
          responseText = "Media analysis failed. Please try again.";
        }
      } else {
        const data = await response.json();
        responseText = data.reply || "No response from AI.";
      }
    } else if (isImageGeneration) {
      console.log("[GENIE] Route: /generate-image");
      const response = await apiFetch(`${BACKEND_URL}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          prompt: userMessage.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        responseText = data?.reply || data?.error || "Image generation failed. Please try again.";
      } else {
        responseText = data?.reply || "Image generated.";
        generatedImageUrl = String(data?.imageUrl || "").trim();
      }
    } else {
      console.log("[GENIE] Route: /chat");
      saveExtractedMemories(userMessage);
      const promptPayload = getStructuredPromptForQuestion(userMessage);
      const response = await apiFetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          chatId: activeChatId,
          message: userMessage.trim(),
          promptEnvelope: promptPayload.message,
          clientContextMeta: {
            forceCodeMode: isCodingRequest(userMessage),
            usedMemory: promptPayload.usedMemory,
            usedDocument: promptPayload.usedDocument,
            activeDocumentName: activeDocumentContext?.name || "",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      responseText = data.reply || "No response from AI.";
    }

    responseText = normalizeInlineCodeArtifacts(responseText);
    throwIfGenerationStopped();
    responseRenderingStarted = true;
    stopThinkingState();
    stopThinkingState = () => {};
    messageElement.innerHTML = "";

    if (isImageGeneration && generatedImageUrl) {
      messageElement.innerHTML = createGeneratedImageReplyHtml({
        imageUrl: generatedImageUrl,
        prompt: userMessage,
      });
    } else {
      await renderAssistantMessageAnimated(messageElement, responseText);
      throwIfGenerationStopped();
    }

    if (window.Prism) Prism.highlightAllUnder(messageElement);
    enableCopyButtons(messageElement);
    ensureMsgActions(messageElement.closest(".bot-message-container"));


    // Save to conversation memory
    const userMemoryText = userMessage || (mediaUpload?.mediaName ? `[Media] ${mediaUpload.mediaName}` : "");
    conversationMemory.push({ role: "user", text: userMemoryText });
    conversationMemory.push({
      role: "assistant",
      text: responseText.replace(/<[^>]*>/g, ""),
    });

    // Update sidebar
    loadSessionsSidebar().catch((sidebarError) => {
      console.error("Failed to refresh sessions sidebar:", sidebarError);
    });
  } catch (error) {
    console.error("Error generating response:", error);
    if (error?.name === "AbortError") {
      if (stopGenerationRequested) {
        const currentText = String(messageElement.textContent || "").trim();
        const hasThinking =
          !!messageElement.querySelector(".thinking-block") ||
          /^thinking/i.test(currentText);
        const hasAnyRenderedContent = currentText.length > 0 && !hasThinking;

        // If stopped before response started, keep message empty.
        if (!responseRenderingStarted || !hasAnyRenderedContent) {
          messageElement.innerHTML = "";
        } else {
          // If stopped mid-generation, keep partial content and expose actions.
          enableCopyButtons(messageElement);
          ensureMsgActions(messageElement.closest(".bot-message-container"));
        }
        await rollbackCancelledResponse(userMessage);
      } else {
        messageElement.innerHTML = hasMediaUpload
          ? "Media analysis is still running and took too long. Please retry in a moment."
          : isImageGeneration
            ? "Image generation took too long. Please retry in a moment."
            : "Request timed out. Please try again.";
      }
    } else {
      const offlineMessage = isOfflineLikeError(error)
        ? getFriendlyOfflineMessage(
            hasMediaUpload
              ? "analyze the file"
              : isImageGeneration
                ? "generate the image"
                : "get a reply"
          )
        : "";
      if (offlineMessage) {
        messageElement.textContent = offlineMessage;
        showNetworkBanner("Internet is down. Please reconnect and try again.");
      } else {
        messageElement.innerHTML = hasMediaUpload
          ? "Media analysis failed or service is busy. Please try again shortly."
          : isImageGeneration
            ? "Image generation failed or service is busy. Please try again shortly."
            : "Failed to get response. Please try again.";
      }
    }
  } finally {
    stopThinkingState();
    if (timeout) clearTimeout(timeout);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    setComposerBusy(false);
  }
}


async function handleSpecialCommands(messageElement, userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Weather command
    if (
        lowerMessage.includes("weather") ||
        lowerMessage.includes("temperature") ||
        lowerMessage.includes("forecast") ||
        lowerMessage.includes("rain")
    ) {
        const cleaned = userMessage
            .replace(/[?.,!]+$/g, "")
            .trim();
        const cityMatch = cleaned.match(
            /(?:weather|temperature|forecast|rain)\s*(?:in|at|for)?\s*([a-zA-Z\s-]{2,})$/i
        );
        let city = cityMatch ? cityMatch[1].trim() : "";
        
        if (!city) {
            const tokens = cleaned.split(/\s+/);
            city = tokens.slice(-2).join(" ").trim();
            if (!/[a-zA-Z]/.test(city)) city = "";
        }
        
        if (!city) {
            const replyText = "Please specify a location for the weather.";
            await renderTypedBoxReply(messageElement, replyText);
            await persistManualExchange(userMessage, replyText);
            return true;
        }
        
        const weatherData = await fetchWeather(city);
        if (!weatherData) {
            const replyText = `Sorry, I couldn't find weather data for "${city}".`;
            await renderTypedBoxReply(messageElement, replyText);
            await persistManualExchange(userMessage, replyText);
            return true;
        }
        
        const { temp, feels_like, humidity } = weatherData.main;
        const description = weatherData.weather[0].description;
        const windSpeed = weatherData.wind.speed;
        const cityName = weatherData.name;
        const country = weatherData.sys.country;
        
        const weatherReply = `Weather in ${cityName}, ${country}:
Temperature: ${temp}°C (feels like ${feels_like}°C)
Condition: ${description}
Humidity: ${humidity}%
Wind Speed: ${windSpeed} m/s`;

        await renderTypedBoxReply(messageElement, weatherReply);
        await persistManualExchange(userMessage, weatherReply);
        return true;
    }
    
    // Clear memory command
    if (lowerMessage.includes("clear memory")) {
        clearMemories();
        messageElement.innerHTML = "Memory cleared.";
        return true;
    }
    
    return false;
}

async function persistManualExchange(userMessage, assistantReply) {
    try {
        if (!activeChatId) return;
        await apiFetch(`${BACKEND_URL}/chat/manual`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chatId: activeChatId,
                message: String(userMessage || "").trim(),
                reply: String(assistantReply || "").trim(),
            }),
        });
    } catch (error) {
        console.error("Failed to persist manual exchange:", error);
    }
}

function isWeatherReplyText(text) {
    const t = String(text || "");
    return /Weather in .+:/i.test(t) && /Temperature:/i.test(t);
}

function renderAssistantMessage(contentElement, messageText) {
    const text = String(messageText || "");
    if (isWeatherReplyText(text)) {
        const box = document.createElement("div");
        box.className = "weather-reply-box";
        box.textContent = text;
        contentElement.innerHTML = "";
        contentElement.appendChild(box);
        scrollChatToBottom(true);
        return;
    }
    if (isGeneratedImageReplyText(text)) {
        const imageUrl = extractFirstHttpUrl(text);
        const promptMatch = text.match(/^Generated image for:\s*"?(.*?)"?\s*(?:\n|$)/i);
        contentElement.innerHTML = createGeneratedImageReplyHtml({
            imageUrl,
            prompt: promptMatch?.[1] || "Generated image",
        });
        scrollChatToBottom(true);
        return;
    }
    contentElement.innerHTML = parseFencedBlocks(text);
    scrollChatToBottom(true);
}

function getAdaptiveTypingSpeeds(fullText = "") {
    const length = String(fullText || "").length;
    if (length > 3200) return { textSpeed: 0, codeSpeed: 0 };
    if (length > 1800) return { textSpeed: 1, codeSpeed: 0 };
    if (length > 900) return { textSpeed: 2, codeSpeed: 1 };
    if (length > 300) return { textSpeed: 4, codeSpeed: 2 };
    return { textSpeed: 6, codeSpeed: 3 };
}

async function renderAssistantMessageAnimated(contentElement, messageText) {
    const text = String(messageText || "");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (
        reducedMotion ||
        isWeatherReplyText(text) ||
        isGeneratedImageReplyText(text)
    ) {
        renderAssistantMessage(contentElement, text);
        return;
    }

    const { textSpeed, codeSpeed } = getAdaptiveTypingSpeeds(text);
    isAssistantTypingAnimationActive = true;
    try {
        await typeTextAndCode(contentElement, text, textSpeed, codeSpeed);
        if (window.Prism) Prism.highlightAllUnder(contentElement);
    } finally {
        isAssistantTypingAnimationActive = false;
        scrollChatToBottom(true);
    }
}

async function renderTypedBoxReply(messageElement, text) {
    const box = document.createElement("div");
    box.className = "weather-reply-box";
    messageElement.innerHTML = "";
    messageElement.appendChild(box);
    scrollChatToBottom(true);

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reducedMotion) {
        box.textContent = String(text || "");
        scrollChatToBottom(true);
        return;
    }

    box.textContent = "";
    for (const ch of String(text || "")) {
        box.textContent += ch;
        scrollChatToBottom(true);
        await new Promise((resolve) => setTimeout(resolve, 12));
    }
    scrollChatToBottom(true);
}

async function fetchWeather(city) {
    try {
        const safeCity = encodeURIComponent(String(city || "").trim());
        if (!safeCity) return null;
        const resp = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${safeCity}&appid=${WEATHER_API_KEY}&units=metric`
        );
        return resp.ok ? await resp.json() : null;
    } catch {
        return null;
    }
}

// 7. UI ELEMENTS CREATION
function createOutgoingMediaLi({ mediaData, mediaName, mediaType, mediaHref = "", prompt }) {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", "outgoing", "outgoing-media");

    const safeName = escapeHtml(mediaName || "file");
    const safePrompt = escapeHtml((prompt || "").trim());
    const kindLabel = getMediaKindLabel(mediaType, mediaData);
    const showImage = isImageDataUrl(mediaData);
    const href = escapeHtml(mediaHref || mediaData || "#");

    let html = `<div class="user-media-card">`;

    if (showImage) {
        html += `
          <a href="${href}" target="_blank" rel="noopener noreferrer" class="user-media-open-link">
            <img src="${mediaData}" alt="${safeName}" class="user-media-preview" />
          </a>
        `;
    } else {
        html += `
          <div class="user-media-file">
            <span>${safeName}</span>
            <div class="user-media-file-actions">
              <a href="${href}" target="_blank" rel="noopener noreferrer" class="user-media-open-btn">Open</a>
              <a href="${href}" download="${safeName}" class="user-media-open-btn">Download</a>
            </div>
          </div>
        `;
    }

    html += `<div class="user-media-meta">${safeName} (${escapeHtml(kindLabel)})</div>`;

    if (safePrompt) {
        html += `<p class="user-media-prompt">${safePrompt}</p>`;
    }

    html += `</div>`;
    chatLi.innerHTML = html;
    return chatLi;
}

function createChatLi(message, className) {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);
    
    if (className === "outgoing") {
        chatLi.innerHTML = `<p class="outgoing-message">${escapeHtml(message)}</p>`;
    } else {
        const container = document.createElement("div");
        container.className = "bot-message-container";

        const content = document.createElement("div");
        content.className = "bot-message-content";
        content.innerHTML = message;
        container.appendChild(content);
        
        chatLi.appendChild(container);
    }
    
    return chatLi;
}

function showTypingIndicator() {
    const typingLi = document.createElement("li");
    typingLi.className = "chat incoming typing";
    
    typingLi.innerHTML = `
        <div class="bot-message-container">
            <div class="typing-indicator">
                <div class="typing-indicator__orb" aria-hidden="true">
                    <span></span><span></span><span></span>
                </div>
                <div class="typing-indicator__copy">
                    <strong class="typing-indicator__title">Genie is thinking</strong>
                    <span class="typing-indicator__status">Preparing a helpful reply</span>
                </div>
                <div class="typing-indicator__trail" aria-hidden="true">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    
    chatbox.appendChild(typingLi);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    return typingLi;
}

function getThinkingStatuses(mode = "chat") {
    return THINKING_STATUS_BY_MODE[mode] || THINKING_STATUS_BY_MODE.chat;
}

function applyThinkingState(container, mode = "chat") {
    if (!container) return () => {};
    const statuses = getThinkingStatuses(mode);
    let index = 0;

    const render = () => {
        const title = escapeHtml(statuses[index % statuses.length] || "Thinking");
        const detail = escapeHtml(statuses[(index + 1) % statuses.length] || "Preparing a reply");
        container.innerHTML = `
            <div class="thinking-block" data-mode="${escapeHtml(mode)}">
                <div class="thinking-block__header">
                    <span class="thinking-block__pulse" aria-hidden="true"></span>
                    <span class="thinking-block__label">${title}</span>
                </div>
                <div class="thinking-block__status">${detail}</div>
                <div class="thinking-block__lines" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
    };

    render();
    const intervalId = window.setInterval(() => {
        index += 1;
        render();
    }, 1700);

    return () => window.clearInterval(intervalId);
}

function convertTypingToMessage(incomingChatli) {
    incomingChatli.className = "chat incoming";
    incomingChatli.innerHTML = `
        <div class="bot-message-container">
            <div class="bot-message-content"></div>
        </div>
    `;
    return incomingChatli.querySelector(".bot-message-content");
}

function ensureMsgActions(container) {
    if (!container || container.querySelector(".msg-actions")) return;
    
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    
    actions.innerHTML = `
        <button class="copy-btn material-symbols-outlined" title="Copy">content_copy</button>
        <button class="speak-btn material-symbols-outlined" title="Speak">volume_up</button>
    `;
    
    // Copy button functionality
    actions.querySelector(".copy-btn").addEventListener("click", () => {
        const messageText =
            container.querySelector(".bot-message-content")?.innerText ||
            container.querySelector("p")?.innerText ||
            "";
        navigator.clipboard.writeText(messageText).then(() => {
            const btn = actions.querySelector(".copy-btn");
            btn.textContent = "done";
            setTimeout(() => {
                btn.textContent = "content_copy";
            }, 1500);
        });
    });
    
    // Speak button functionality
    actions.querySelector(".speak-btn").addEventListener("click", () => {
        const messageText =
            container.querySelector(".bot-message-content")?.innerText ||
            container.querySelector("p")?.innerText ||
            "";
        if (!messageText) return;
        
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            actions.querySelector(".speak-btn").textContent = "volume_up";
            return;
        }
        
        const speakBtn = actions.querySelector(".speak-btn");
        speakBtn.textContent = "volume_off";
        
        const utterance = new SpeechSynthesisUtterance(messageText);
        if (voices.length > 0) {
            const englishVoice = voices.find(v => v.lang.startsWith("en"));
            if (englishVoice) utterance.voice = englishVoice;
        }
        
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            speakBtn.textContent = "volume_up";
        };
        
        window.speechSynthesis.speak(utterance);
    });
    
    container.appendChild(actions);
}

// 8. CODE BLOCKS AND FORMATTING
function normalizeInlineCodeArtifacts(text) {
    return String(text || "")
      .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
      .replace(/<\/?think\b[^>]*>/gi, "")
      // Wrap leaked placeholder tokens as inline markdown code without changing content.
      .replace(/(@{1,2}\s*INL\w*\s*_?\s*CODE\s*_?\s*\d+\s*@{1,2})/gi, "`$1`")
      .replace(/(@{1,2}\s*INL\w*\s*_?\s*CODE\s*@{1,2})/gi, "`$1`")
      .trim();
}

function getCodeLanguageFromFilename(filename = "") {
  const ext = String(filename || "").trim().split(".").pop()?.toLowerCase() || "";
  const map = {
    html: "html",
    htm: "html",
    css: "css",
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    json: "json",
    md: "markdown",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    go: "go",
    sql: "sql",
  };
  return map[ext] || "text";
}

function matchFileSectionHeading(line = "") {
  const trimmed = String(line || "").trim();
  return (
    trimmed.match(/^(\d+)\.\s+([A-Za-z0-9_./-]+\.(html?|css|js|jsx|ts|tsx|json|md|py|java|c|cpp|cs|php|rb|go|sql))$/i) ||
    trimmed.match(/^([A-Za-z0-9_./-]+\.(html?|css|js|jsx|ts|tsx|json|md|py|java|c|cpp|cs|php|rb|go|sql))(?:\s*\([^)]*\))?:$/i)
  );
}

function isLikelyCodeLine(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  return /^(<!DOCTYPE|<html|<head|<body|<\/?[a-z][^>]*>|[.#]?[A-Za-z0-9_-]+\s*\{|@media\b|:root\b|const\b|let\b|var\b|function\b|import\b|export\b|if\s*\(|for\s*\(|while\s*\(|return\b|document\.|window\.|body\s*\{|button\s*\{|input\s*\{|div\s*\{|\.|#)/i.test(trimmed);
}

function convertStructuredFileSections(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const output = [];

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = matchFileSectionHeading(lines[i]);
    if (!headingMatch) {
      output.push(lines[i]);
      continue;
    }

    const filename = headingMatch[2] || headingMatch[1];
    let cursor = i + 1;
    let sawCopyLine = false;

    if (String(lines[cursor] || "").trim().toLowerCase() === "copy") {
      sawCopyLine = true;
      cursor += 1;
    }

    while (cursor < lines.length && !String(lines[cursor] || "").trim()) {
      cursor += 1;
    }

    if (!sawCopyLine && !isLikelyCodeLine(lines[cursor] || "")) {
      output.push(lines[i]);
      continue;
    }

    const codeLines = [];
    let end = cursor;
    for (; end < lines.length; end++) {
      const nextHeading = matchFileSectionHeading(lines[end]);
      if (nextHeading) break;
      codeLines.push(lines[end]);
    }

    while (codeLines.length && !String(codeLines[codeLines.length - 1] || "").trim()) {
      codeLines.pop();
    }

    output.push(`### ${filename}`);
    output.push("```" + getCodeLanguageFromFilename(filename));
    output.push(codeLines.join("\n"));
    output.push("```");

    i = end - 1;
  }

  return output.join("\n");
}

function parseFencedBlocks(text) {
    const source = convertStructuredFileSections(normalizeInlineCodeArtifacts(text)).replace(/\r\n/g, "\n");
    const codeBlocks = [];
    const withPlaceholders = source.replace(
      /```([\w#+-]+)?\n([\s\S]*?)```/g,
      (_, lang, code) => {
        const idx =
          codeBlocks.push({ lang: normalizeCodeLanguage(lang || "text"), code }) - 1;
        return `\n@@CODE_BLOCK_${idx}@@\n`;
      },
    );

    const lines = withPlaceholders.split("\n");
    let html = "";
    let paragraphLines = [];
    let listType = null;
    let inBlockquote = false;
    let blockquoteLines = [];

    const closeParagraph = () => {
      if (!paragraphLines.length) return;
      html += `<p>${formatInlineText(paragraphLines.join("\n"))}</p>`;
      paragraphLines = [];
    };

    const closeList = () => {
      if (!listType) return;
      html += `</${listType}>`;
      listType = null;
    };

    const closeBlockquote = () => {
      if (!inBlockquote) return;
      const body = blockquoteLines
        .map((line) => `<p>${formatInlineText(line)}</p>`)
        .join("");
      html += `<blockquote>${body}</blockquote>`;
      blockquoteLines = [];
      inBlockquote = false;
    };

    for (const rawLine of lines) {
      const line = rawLine || "";
      const trimmed = line.trim();
      const codeToken = trimmed.match(/^@@CODE_BLOCK_(\d+)@@$/);

      if (codeToken) {
        closeParagraph();
        closeList();
        closeBlockquote();
        const block = codeBlocks[Number(codeToken[1])];
        if (!block) continue;
        html += `
          <div class="code-block">
            <button class="code-copy-btn" type="button">Copy</button>
            <pre class="language-${block.lang}"><code class="language-${block.lang}">${escapeHtml(block.code)}</code></pre>
          </div>
        `;
        continue;
      }

      if (!trimmed) {
        closeParagraph();
        closeList();
        closeBlockquote();
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        closeParagraph();
        closeList();
        closeBlockquote();
        const level = heading[1].length;
        html += `<h${level}>${formatInlineText(heading[2])}</h${level}>`;
        continue;
      }

      const blockquote = trimmed.match(/^>\s?(.*)$/);
      if (blockquote) {
        closeParagraph();
        closeList();
        inBlockquote = true;
        blockquoteLines.push(blockquote[1]);
        continue;
      }

      const orderedItem = trimmed.match(/^\d+\.\s+(.+)$/);
      if (orderedItem) {
        closeParagraph();
        closeBlockquote();
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          html += "<ol>";
        }
        html += `<li>${formatInlineText(orderedItem[1])}</li>`;
        continue;
      }

      const unorderedItem = trimmed.match(/^[-*+]\s+(.+)$/);
      if (unorderedItem) {
        closeParagraph();
        closeBlockquote();
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          html += "<ul>";
        }
        html += `<li>${formatInlineText(unorderedItem[1])}</li>`;
        continue;
      }

      closeList();
      closeBlockquote();
      paragraphLines.push(trimmed);
    }

    closeParagraph();
    closeList();
    closeBlockquote();
    return html;
}

function sanitizeMarkdownUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized) return "#";
  if (/^(https?:|mailto:)/i.test(normalized)) return normalized;
  return "#";
}

function formatInlineText(text) {
  let output = escapeHtml(String(text || ""));
  const inlineCodeTokens = [];

  output = output.replace(/`([^`]+)`/g, (_, code) => {
    // Use a markdown-safe sentinel (no underscores) so emphasis parsing cannot corrupt it.
    const token = `%%INLINECODE${inlineCodeTokens.length}%%`;
    inlineCodeTokens.push(`<code class="inline-code">${code}</code>`);
    return token;
  });

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = escapeHtml(sanitizeMarkdownUrl(url));
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  output = output.replace(/(^|[^\*])\*([^*]+)\*/g, "$1<em>$2</em>");
  output = output.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  output = output.replace(/\n/g, "<br>");

  output = output.replace(/%%INLINECODE(\d+)%%/g, (_, idx) => {
    return inlineCodeTokens[Number(idx)] || "";
  });

  return output;
}

function enableCopyButtons(container) {
    if (!container) return;
    
    container.querySelectorAll(".code-copy-btn").forEach(btn => {
        btn.onclick = () => {
            const code = btn.nextElementSibling?.innerText || "";
            if (!code) return;
            
            navigator.clipboard.writeText(code).then(() => {
                const originalText = btn.innerText;
                btn.innerText = "Copied!";
                setTimeout(() => {
                    btn.innerText = originalText;
                }, 1500);
            });
        };
    });
}

// 9. SPEECH SYNTHESIS
function initSpeechSynthesis() {
    function loadVoices() {
        voices = window.speechSynthesis.getVoices();
    }
    
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

// 10. MICROPHONE FUNCTIONALITY
function setSpeechStatus(text) {
    if (!speechStatus) return;
    const raw = String(text || "").toLowerCase();
    let icon = "mic";
    let label = "Mic ready";

    if (raw.includes("listening")) {
        icon = "graphic_eq";
        label = "Listening";
    } else if (raw.includes("permission denied")) {
        icon = "mic_off";
        label = "Permission denied";
    } else if (raw.includes("not supported")) {
        icon = "warning";
        label = "Speech-to-text not supported";
    } else if (raw.includes("no internet")) {
        icon = "wifi_off";
        label = "No internet";
    } else if (raw.includes("https required")) {
        icon = "lock";
        label = "HTTPS required";
    } else if (raw.includes("login required")) {
        icon = "person_off";
        label = "Login required";
    } else if (raw.includes("no microphone")) {
        icon = "mic_off";
        label = "No microphone";
    } else if (raw.includes("error") || raw.includes("could not")) {
        icon = "error";
        label = "Speech recognition error";
    } else if (raw.includes("stopped")) {
        icon = "mic";
        label = "Stopped";
    }

    speechStatus.textContent = icon;
    speechStatus.setAttribute("aria-label", label);
    speechStatus.setAttribute("title", label);
    speechStatus.classList.toggle("listening", icon === "graphic_eq");
}

function appendFinalTranscript(text) {
    if (!chatInput) return;
    const cleaned = String(text || "").trim();
    if (!cleaned) return;
    const spacer = chatInput.value && !/\s$/.test(chatInput.value) ? " " : "";
    chatInput.value += spacer + cleaned;
    chatInput.style.height = "44px";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 160)}px`;
    chatInput.focus();
}

function applySuggestedPrompt(promptText) {
    if (!chatInput) return;
    const prompt = String(promptText || "").trim();
    if (!prompt) return;

    if (activePromptGroup) {
        recordPromptGroupUsage(activePromptGroup);
    }

    chatInput.value = prompt;
    chatInput.style.height = "44px";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 160)}px`;
    chatInput.focus();
}

function renderPromptOptions(groupName = "") {
    if (!chatHomeOptions) return;

    activePromptGroup = String(groupName || "").trim();
    const options = getSuggestedPromptOptions(activePromptGroup);
    document.body.classList.toggle("prompt-options-open", options.length > 0);

    document.querySelectorAll(".chat-home-prompt").forEach((button) => {
        button.classList.toggle("active", button.dataset.group === activePromptGroup);
    });

    chatHomeOptions.innerHTML = "";
    chatHomeOptions.hidden = options.length === 0;
    if (!options.length) return;

    options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-home-option";
        button.dataset.group = activePromptGroup;
        button.dataset.prompt = option.prompt;
        button.innerHTML = `
          <span class="chat-home-option__icon material-symbols-outlined">${PROMPT_GROUP_ICONS[activePromptGroup] || "article"}</span>
          <span class="chat-home-option__text">${option.prompt}</span>
        `;
        chatHomeOptions.appendChild(button);
    });
}

async function syncMicAuthState() {
    if (!micBtn) return;
    const session = await getSession();
    const isLoggedIn = !!session;
    const isAppView = document.body.classList.contains("app-view");
    const enabled = isLoggedIn && (sttSupported || isAppView);
    micBtn.disabled = !enabled;
    micBtn.setAttribute("aria-disabled", String(!enabled));

    if (!isLoggedIn) {
        setSpeechStatus("Login required");
    } else if (!sttSupported && !isAppView) {
        setSpeechStatus("Speech-to-text not supported. Use Chrome or enable Google Speech Services.");
    } else if (!sttSupported && isAppView) {
        setSpeechStatus("Enable microphone permission in app settings");
    } else if (!sttListening) {
        setSpeechStatus("Stopped");
    }
}

function initMicrophone() {
    if (!micBtn || !chatInput) return;
    if (sttInitialized) {
        syncMicAuthState().catch(console.error);
        return;
    }
    sttInitialized = true;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSecureOrigin =
      window.isSecureContext ||
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";

    sttSupported = !!SpeechRecognition && isSecureOrigin;
    if (!isSecureOrigin) {
        setSpeechStatus("HTTPS required for microphone");
    } else if (!SpeechRecognition) {
        setSpeechStatus("Speech-to-text not supported. Use Chrome or enable Google Speech Services.");
    } else {
        setSpeechStatus("Stopped");
    }

    if (!SpeechRecognition) {
        syncMicAuthState().catch(console.error);
        return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = navigator.language || "en-US";
    speechRecognition.interimResults = true;
    speechRecognition.continuous = true;
    speechRecognition.maxAlternatives = 1;

    micBtn.addEventListener("click", async () => {
        const session = await getSession();
        if (!session) {
            micBtn.disabled = true;
            setSpeechStatus("Login required");
            return;
        }

        // If native Android bridge exists, request runtime permission first.
        try {
            if (window.Android && typeof window.Android.requestRecordAudioPermission === "function") {
                window.Android.requestRecordAudioPermission();
            }
        } catch {}

        if (sttListening) {
            speechRecognition.stop();
            setSpeechStatus("Stopped");
            return;
        }

        try {
            // Trigger audio permission prompt on browsers/WebView that support getUserMedia.
            if (navigator.mediaDevices?.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach((t) => t.stop());
                } catch (permErr) {
                    setSpeechStatus("Permission denied");
                    return;
                }
            }

            if (!sttSupported || !speechRecognition) {
                setSpeechStatus("Speech-to-text not supported. Use Chrome or enable Google Speech Services.");
                return;
            }

            setSpeechStatus("Listening...");
            speechRecognition.start();
        } catch (error) {
            console.error("Microphone start error:", error);
            if (String(error?.name || "").toLowerCase().includes("notallowed")) {
                setSpeechStatus("Permission denied");
            } else {
                setSpeechStatus("Could not start microphone");
            }
        }
    });

    speechRecognition.onstart = () => {
        sttListening = true;
        sttHasFinalInSession = false;
        if (sttAutoSendTimer) {
            clearTimeout(sttAutoSendTimer);
            sttAutoSendTimer = null;
        }
        micBtn.classList.add("listening");
        micBtn.textContent = "mic_off";
        setSpeechStatus("Listening...");
    };

    speechRecognition.onend = () => {
        sttListening = false;
        if (sttAutoSendTimer) {
            clearTimeout(sttAutoSendTimer);
            sttAutoSendTimer = null;
        }
        micBtn.classList.remove("listening");
        micBtn.textContent = "mic";
        const shouldAutoSend = sttHasFinalInSession && !!chatInput?.value.trim();
        sttHasFinalInSession = false;
        if (navigator.onLine) {
            setSpeechStatus("Stopped");
        }
        if (shouldAutoSend) {
            handleChat();
        }
    };

    speechRecognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const part = event.results[i]?.[0]?.transcript || "";
            if (event.results[i].isFinal) finalText += part;
            else interimText += part;
        }

        if (finalText) {
            sttHasFinalInSession = true;
            appendFinalTranscript(finalText);
            const sentenceComplete = /[.!?]\s*$/.test(finalText.trim());
            if (sttAutoSendTimer) {
                clearTimeout(sttAutoSendTimer);
                sttAutoSendTimer = null;
            }
            sttAutoSendTimer = setTimeout(() => {
                if (!sttListening || !chatInput?.value.trim()) return;
                handleChat();
                sttHasFinalInSession = false;
                sttAutoSendTimer = null;
            }, sentenceComplete ? 180 : STT_AUTO_SEND_PAUSE_MS);
        }

        if (interimText && sttListening) {
            setSpeechStatus(`Listening... ${interimText.trim()}`);
        } else if (sttListening) {
            setSpeechStatus("Listening...");
        }
    };

    speechRecognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        sttListening = false;
        if (sttAutoSendTimer) {
            clearTimeout(sttAutoSendTimer);
            sttAutoSendTimer = null;
        }
        micBtn.classList.remove("listening");
        micBtn.textContent = "mic";

        switch (event.error) {
            case "not-allowed":
            case "service-not-allowed":
                setSpeechStatus("Permission denied");
                break;
            case "network":
                setSpeechStatus("No internet");
                break;
            case "no-speech":
                setSpeechStatus("No speech detected");
                break;
            case "audio-capture":
                setSpeechStatus("No microphone available");
                break;
            default:
                setSpeechStatus("Speech recognition error");
                break;
        }
    };

    window.addEventListener("offline", () => {
        if (sttListening && speechRecognition) {
            try { speechRecognition.stop(); } catch {}
        }
        if (sttAutoSendTimer) {
            clearTimeout(sttAutoSendTimer);
            sttAutoSendTimer = null;
        }
        setSpeechStatus("No internet");
    });

    syncMicAuthState().catch(console.error);
}

// 11. UTILITY FUNCTIONS
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function testBackendConnection() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`);

        if (response.ok) {
            console.log("Backend is reachable");
            hideNetworkBanner();
            return true;
        } else {
            console.error("Backend error:", response.status);
            return false;
        }
    } catch (error) {
        console.error("Cannot reach backend:", error);
        if (isOfflineLikeError(error)) {
            showNetworkBanner("Internet is down. Please reconnect and refresh or try again.");
        }
        return false;
    }
}

function handleResize() {
    // Update sidebar visibility based on screen size
    if (window.innerWidth > 480) {
        // Desktop: show sidebar if chat is started
        if (document.body.classList.contains("chat-started") && historySidebar) {
            historySidebar.style.display = "block";
            historySidebar.style.transform = "translateX(0)";
            if (sidebarToggle) sidebarToggle.style.display = "none";
        }
    } else {
        // Mobile: hide sidebar toggle button and ensure proper state
        if (sidebarToggle) sidebarToggle.style.display = "block";
        if (historySidebar && !historySidebar.classList.contains("active")) {
            historySidebar.style.display = "none";
            historySidebar.style.transform = "translateX(-100%)";
        }
    }
}

function closeHistorySidebar() {
  const sidebar = document.querySelector(".history-sidebar");
  if (!sidebar) return;

  sidebar.classList.remove("active");

  if (window.innerWidth <= 480) {
    sidebar.style.transform = "translateX(-100%)";
    sidebar.style.display = "none";
  }
}

function syncSidebarCloseButton() {
  const closeBtn = document.getElementById("close-sidebar");
  const sidebar = document.querySelector(".history-sidebar");

  if (!closeBtn || !sidebar) {
    return;
  }

  if (closeBtn.dataset.sidebarBound === "true") {
    return;
  }

  closeBtn.onclick = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    closeHistorySidebar();
    return false;
  };

  closeBtn.dataset.sidebarBound = "true";

  if (sidebar.dataset.sidebarBound === "true") {
    return;
  }

  sidebar.addEventListener("click", (e) => {
    if (e.target.id === "close-sidebar" || e.target.closest("#close-sidebar")) {
      e.preventDefault();
      e.stopPropagation();
      closeHistorySidebar();
    }
  });
  sidebar.dataset.sidebarBound = "true";
}

// Re-run quietly only when the close button may have been re-rendered
document.addEventListener("click", function(e) {
  if (e.target.closest("#sidebar-toggle") || e.target.closest(".start-chat-btn")) {
    setTimeout(syncSidebarCloseButton, 300);
  }
});

document.addEventListener("click", function(e) {
  const promptBtn = e.target.closest(".chat-home-prompt");
  if (promptBtn) {
    const group = promptBtn.dataset.group || "";
    renderPromptOptions(activePromptGroup === group ? "" : group);
    return;
  }

  const optionBtn = e.target.closest(".chat-home-option");
  if (!optionBtn) return;
  applySuggestedPrompt(optionBtn.dataset.prompt || "");
});

// ---- Typing simulation helpers ----
function escapeHTML(str = "") {
  return escapeHtml(str);
}

function typeCharsInto(el, text, baseSpeed = 10, mode = "html") {
  return new Promise((resolve) => {
    const safe = mode === "html" ? escapeHTML(text) : text;
    let i = 0;

    function tick() {
      if (stopGenerationRequested) return resolve();
      if (i >= safe.length) return resolve();

      const ch = safe[i++];

      if (mode === "html") {
        // convert \n to <br> for normal text
        if (ch === "\n") el.innerHTML += "<br>";
        else el.innerHTML += ch;
      } else {
        // code: keep exact newlines/spacing
        el.textContent += ch;
      }

      scheduleChatScroll();

      let delay = baseSpeed;
      if (ch === "\n") delay = 25;
      else if (ch === "." || ch === "!" || ch === "?") delay = 120;
      else if (ch === "," || ch === ";") delay = 60;

      setTimeout(tick, delay);
    }

    tick();
  });
}

async function typeTextAndCode(element, fullText, textSpeed = 12, codeSpeed = 4) {
  fullText = normalizeInlineCodeArtifacts(fullText);
  const regex = /```([\w#+-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  element.innerHTML = "";

  // helper: type normal text with live markdown formatting
  async function typePlainText(target, text) {
    const raw = String(text || "");
    let buffer = "";
    const chunkSize = raw.length > 1800 ? 18 : raw.length > 900 ? 12 : 8;
    for (let i = 0; i < raw.length; i++) {
      throwIfGenerationStopped();
      const ch = raw[i];
      buffer += ch;

      if (shouldRenderTypingFrame(i, raw.length, ch, chunkSize)) {
        target.innerHTML = parseFencedBlocks(buffer);
      }

      scheduleChatScroll();

      let delay = textSpeed;
      if (ch === "\n") delay = Math.max(20, textSpeed + 8);
      else if (ch === "." || ch === "!" || ch === "?")
        delay = Math.max(45, textSpeed + 35);
      else if (ch === "," || ch === ";") delay = Math.max(30, textSpeed + 18);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // helper: type code EXACT (textContent), highlight only after typing completes
  async function typeCode(target, code) {
    target.textContent = "";
    for (let i = 0; i < code.length; i++) {
      throwIfGenerationStopped();
      target.textContent += code[i];

      if (shouldRenderTypingFrame(i, code.length, code[i], 6)) {
        scheduleChatScroll();
      }

      await new Promise((r) => setTimeout(r, codeSpeed));
    }
    if (window.Prism) Prism.highlightElement(target);
  }

  while ((match = regex.exec(fullText)) !== null) {
    throwIfGenerationStopped();
    const before = fullText.slice(lastIndex, match.index);
    const lang = normalizeCodeLanguage(match[1] || "text");
    const code = match[2] || "";

    // âœ… Type normal text (preserve newlines)
    if (before) {
      const textChunk = document.createElement("div");
      textChunk.className = "live-text-chunk";
      element.appendChild(textChunk);
      await typePlainText(textChunk, before);
    }

    // âœ… Create code block
    const block = document.createElement("div");
    block.className = "code-block";
    block.innerHTML = `
      <button class="code-copy-btn" type="button">Copy</button>
      <pre class="language-${lang}"><code class="language-${lang}"></code></pre>
    `;
    element.appendChild(block);

    // âœ… Type code (exact formatting)
    const codeEl = block.querySelector("code");
    await typeCode(codeEl, code);

    lastIndex = match.index + match[0].length;
  }

  // âœ… Remaining text
  const rest = fullText.slice(lastIndex);
  if (rest) {
    const textChunk = document.createElement("div");
    textChunk.className = "live-text-chunk";
    element.appendChild(textChunk);
    await typePlainText(textChunk, rest);
  }
}

function normalizeCodeLanguage(lang = "text") {
  const normalized = String(lang || "text").trim().toLowerCase();
  const aliases = {
    js: "javascript",
    react: "jsx",
    py: "python",
    python3: "python",
    "c#": "csharp",
    csharp: "csharp",
    "c++": "cpp",
  };
  return aliases[normalized] || normalized || "text";
}

async function typeRichMarkdown(element, fullText, textSpeed = 12) {
  const text = normalizeInlineCodeArtifacts(fullText);
  let buffer = "";
  const chunkSize = text.length > 1800 ? 18 : text.length > 900 ? 12 : 8;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buffer += ch;

    if (shouldRenderTypingFrame(i, text.length, ch, chunkSize)) {
      element.innerHTML = parseFencedBlocks(buffer);
      scheduleChatScroll();
    }

    let delay = textSpeed;
    if (ch === "\n") delay = Math.max(20, textSpeed + 8);
    else if (ch === "." || ch === "!" || ch === "?")
      delay = Math.max(45, textSpeed + 35);
    else if (ch === "," || ch === ";") delay = Math.max(30, textSpeed + 18);

    await new Promise((r) => setTimeout(r, delay));
  }
  if (window.Prism) Prism.highlightAllUnder(element);
  scheduleChatScroll(true);
}

const APK_URL =
  "https://github.com/Anup851/genie.apk/releases/download/v1.0/Genie.AI_v1.0.apk";

function isRunningInsideApp() {
  if (window.GENIE_APP === true) return true;
  if (document.body.classList.contains("app-view")) return true;

  const ua = navigator.userAgent || "";
  const isWebView =
    /wv/i.test(ua) || (ua.includes("Version/") && ua.includes("Chrome/"));
  return isWebView;
}


function setupDownloadAppButton() {
  const btn = document.getElementById("download-app-btn");
  if (!btn) return;

  if (isRunningInsideApp()) {
    btn.style.display = "none";
    return;
  }

  btn.style.display = "inline-flex";
  btn.href = APK_URL;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    // GitHub release link works great with direct navigation
    window.location.href = APK_URL;
  });
}



// ================= END OF CODE =================






