

// ================= DOM ELEMENTS =================
const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");
const chatbox = document.querySelector(".chatbox");
const historySidebar = document.querySelector(".history-sidebar");
const historyList = document.querySelector(".history-list");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const welcome = document.querySelector(".welcome");
const container = document.querySelector(".container");
const sidebarToggle = document.getElementById("sidebar-toggle");
const closeSidebarBtn = document.getElementById("close-sidebar");
const newChatBtn = document.getElementById("new-chat-btn");
const startChatBtn = document.querySelector(".start-chat-btn");
const modeToggle = document.getElementById("mode-toggle");
const modeIcon = modeToggle?.querySelector(".material-symbols-outlined");
const micBtn = document.getElementById("mic-btn");
const speechStatus = document.getElementById("speech-status");
const authBtn = document.getElementById("auth-btn");
const imageUploadInput = document.getElementById("image-upload");
const imageUploadLabel = document.querySelector('label[for="image-upload"]');
const selectedMediaPreview = document.getElementById("selected-media-preview");

let pendingImageData = null;
let pendingImageName = "";
let pendingMediaType = "";
let pendingMediaPreviewHref = null;
let pendingMediaSelected = false;
let pendingMediaLoading = false;

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
    if (imageUploadInput) imageUploadInput.value = "";
    revokePendingMediaPreviewHref();
    if (chatInput) chatInput.placeholder = "Ask anything with GENIE...";
    clearSelectedMediaPreview();
  });
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
    console.warn("âŒ supabaseClient not found. Did you init it in index.html?");
    return false;
  }
  return true;
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
  // Use only authenticated Supabase user
  const user = await getCurrentUser();
  if (user) {
    return user.id;
  }

  return null;
}

// Update auth button based on login status
// ================= AUTH BUTTON HANDLER =================

// ================= AUTH BUTTON HANDLER =================

// ================= AUTH BUTTON HANDLER =================
// ================= COMPLETE AUTH SYSTEM WITH LOGOUT =================

// Update auth button based on login status
// ================= COMPLETE AUTH SYSTEM WITH NO REFRESH =================

// Update auth button based on login status
async function updateAuthButton() {
  const authBtn = document.getElementById("auth-btn");
  if (!authBtn) return;

  const newBtn = authBtn.cloneNode(true);
  authBtn.parentNode.replaceChild(newBtn, authBtn);

  if (newBtn.tagName === "BUTTON") newBtn.type = "button";

  const session = await getSession();

  if (session) {
    const userEmail = session.user?.email || "User";
    const displayName = userEmail.split("@")[0];

    newBtn.innerHTML = `
      <span class="material-symbols-outlined">account_circle</span>
      <span class="auth-text">${displayName}</span>
    `;

    // âœ… CHANGE: go to auth page instead of logout confirm
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "./auth.html";
    });

  } else {
    newBtn.innerHTML = `
      <span class="material-symbols-outlined">person</span>
      <span class="auth-text">Login</span>
    `;

    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "./auth.html";
    });
  }

  await syncMicAuthState();
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
    console.log('ðŸšª Logging out...');
    
    // Show loading state
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
      authBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span><span>Logging out...</span>';
      authBtn.disabled = true;
    }
    
    // Sign out from Supabase
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;
    
    // Clear local data
    localStorage.removeItem('genie_guest_id');
    localStorage.removeItem('genie_activeChatId');
    
    // Clear Supabase session data
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Reset UI but keep main chat layout (no welcome flow)
    if (chatbox) chatbox.innerHTML = '';
    document.body.classList.add('chat-started', 'show-chatbot');
    if (container) container.style.display = 'block';
    if (welcome) welcome.style.display = 'none';
    if (window.innerWidth > 480) document.body.classList.add('show-history');
    
    // Update button back to login
    await updateAuthButton();
    
    // Show success message
    alert('âœ… Logged out successfully!');
    
  } catch (error) {
    console.error('âŒ Logout error:', error);
    alert('âŒ Failed to logout');
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
`;
document.head.appendChild(style);

// ================= APP CONFIG =================
const WEATHER_API_KEY = "c4846573091c7b3978af67020443a2b4";
const BACKEND_URL = "https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev";

async function apiFetch(url, options = {}) {
  const session = await getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    window.location.href = "./auth.html";
    throw new Error("Not authenticated");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  };

  return fetch(url, { ...options, headers });
}

let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let conversationMemory = [];
let activeChatId = localStorage.getItem("genie_activeChatId") || null;
let speechRecognition = null;
let voices = [];
let sttSupported = false;
let sttListening = false;
let sttInitialized = false;
let sttHasFinalInSession = false;
let sttAutoSendTimer = null;
const STT_AUTO_SEND_PAUSE_MS = 1200;
let isRequestInFlight = false;

function setComposerBusy(isBusy) {
  isRequestInFlight = !!isBusy;
  if (chatInput) {
    chatInput.readOnly = isRequestInFlight;
    chatInput.style.opacity = isRequestInFlight ? "0.85" : "";
  }
  if (sendChatBtn) sendChatBtn.disabled = isRequestInFlight;
  if (imageUploadInput) imageUploadInput.disabled = isRequestInFlight;
  if (imageUploadLabel) imageUploadLabel.setAttribute("aria-disabled", String(isRequestInFlight));
  if (micBtn && isRequestInFlight) micBtn.disabled = true;
  if (!isRequestInFlight) {
    syncMicAuthState().catch(() => {});
  }
}

// ================= INITIALIZATION =================
// âœ… SINGLE DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', async () => {
  console.log("ðŸš€ Initializing app...");
  
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
  fixSidebarCloseButton();
  setupWebViewCloseButton();
});

// ================= WEBVIEW DETECTION =================
function markAppView() {
  const ua = navigator.userAgent || "";
  const isWebView = /wv/i.test(ua) || 
                    (ua.includes("Version/") && ua.includes("Chrome/"));
  
  if (isWebView) {
    document.body.classList.add("app-view");
    console.log("ðŸ“± App view detected");
  }
}

async function initializeApp() {
  console.log("ðŸš€ Initializing app...");

  // 1) Start directly on main chat page
  initUIState();

  // 2) User - âœ… FIXED with await
  const userId = await getUserId();
  if (!userId) {
    console.warn("No authenticated session found. Redirecting to auth page...");
    window.location.href = "./auth.html";
    return;
  }
  console.log("ðŸ‘¤ User ID:", userId);

  // 3) Theme + speech + mic
  initTheme();
  initSpeechSynthesis();
  initMicrophone();

  // 4) Events
  initEventListeners();

  // 5) Backend check
  testBackendConnection().catch(console.error);

  // 6) Ensure chat + sessions are ready on first load
  await ensureActiveChat();

  console.log("âœ… App initialized");
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
}
// 3. THEME MANAGEMENT
function initTheme() {
    if (!modeToggle || !modeIcon) return;
    
    // Set initial icon
    modeIcon.textContent = document.body.classList.contains("light-mode") 
        ? "light_mode" 
        : "dark_mode";
    
    modeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        modeIcon.textContent = document.body.classList.contains("light-mode") 
            ? "light_mode" 
            : "dark_mode";
        localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    });
    
    // Load saved theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        modeIcon.textContent = "light_mode";
    }
}
// 4. EVENT LISTENERS
function initEventListeners() {
    // ðŸ”´ COMMENT OUT THIS OLD AUTH HANDLER - It's conflicting!
    // if (authBtn) {
    //     authBtn.addEventListener("click", () => {
    //         const authPath = "./auth.html";
    //         window.location.href = authPath;
    //     });
    // }

    // Send message on button click
    if (sendChatBtn) sendChatBtn.addEventListener("click", handleChat);
    
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
                console.error("âŒ History sidebar not found!");
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
            pendingImageData = null;
            pendingImageName = file.name || "file";
            pendingMediaType = String(file.type || "");

            const reader = new FileReader();
            reader.onload = () => {
                pendingImageData = String(reader.result || "");
                pendingMediaLoading = false;
                pendingImageName = file.name || "file";
                pendingMediaType = String(file.type || "");
                renderSelectedMediaPreview({
                    mediaData: pendingImageData,
                    mediaName: pendingImageName,
                    mediaType: pendingMediaType,
                    previewHref: pendingMediaPreviewHref,
                });

                if (chatInput) {
                    chatInput.placeholder = "Add prompt for selected file...";
                    chatInput.focus();
                }
            };
            reader.onerror = () => {
                pendingImageData = null;
                pendingImageName = "";
                pendingMediaType = "";
                pendingMediaSelected = false;
                pendingMediaLoading = false;
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
    
    // Handle window resize
    window.addEventListener("resize", handleResize);
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
    
    // Ensure active chat exists
    await ensureActiveChat();
    
    // Focus on input
    if (chatInput) chatInput.focus();
}

async function ensureActiveChat() {
    const userId = await getUserId();  // âœ… Added await
    if (!userId) return;
    
    if (!activeChatId) {
        // Create new chat
        const resp = await apiFetch(`${BACKEND_URL}/chat/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title: "New chat" })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            activeChatId = data.chatId;
            localStorage.setItem("genie_activeChatId", activeChatId);
        } else {
            console.error("âŒ Failed to create new chat");
            return;
        }
    }
    
    // Load sidebar sessions
    await loadSessionsSidebar();
    
    // Load chat messages
    await loadChatFromServer(activeChatId);
}

async function createNewChat() {
    const userId = await getUserId();
    if (!userId) return;
    
    try {
        const resp = await apiFetch(`${BACKEND_URL}/chat/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title: "New chat" })
        });
        
        if (resp.ok) {
            const data = await resp.json();
            await openSession(data.chatId);
        }
    } catch (error) {
        console.error("âŒ Error creating new chat:", error);
    }
}

async function openSession(chatId) {
    activeChatId = chatId;
    localStorage.setItem("genie_activeChatId", activeChatId);
    await loadChatFromServer(chatId);
    await loadSessionsSidebar();
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
        console.error("❌ Error renaming session:", error);
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

async function loadSessionsSidebar() {
    const userId = await getUserId();
    if (!userId) return;
    
    try {
        const resp = await apiFetch(`${BACKEND_URL}/chats/${userId}`);
        if (!resp.ok) throw new Error("Failed to load sessions");
        
        const data = await resp.json();
        const sessions = data.sessions || [];
        
        historyList.innerHTML = "";
        
        if (sessions.length === 0) {
            // Create styled "no chats" message
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
                <span class="history-title">${escapeHtml(session.title || "New chat")}</span>
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
            
            // Open chat on click
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

        // Keep an invisible spacer at the end so last-item menus never get clipped.
        const spacer = document.createElement("li");
        spacer.className = "history-list-spacer";
        spacer.setAttribute("aria-hidden", "true");
        historyList.appendChild(spacer);
    } catch (error) {
        console.error("âŒ Error loading sessions:", error);
        // Create styled error message
        const errorLi = document.createElement("li");
        errorLi.className = "error";
        errorLi.textContent = "Failed to load chats";
        historyList.innerHTML = "";
        historyList.appendChild(errorLi);
    }
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
        
        (data.messages || []).forEach(msg => {
            if (msg.role === "user") {
                chatbox.appendChild(createChatLi(msg.message, "outgoing"));
            } else {
                const li = createChatLi("", "incoming");
                const content = li.querySelector(".bot-message-content");

                content.innerHTML = parseFencedBlocks(msg.message);

                if (window.Prism) Prism.highlightAllUnder(content);
                enableCopyButtons(content);
                ensureMsgActions(li.querySelector(".bot-message-container"));
                
                chatbox.appendChild(li);
            }
        });
        
        chatbox.scrollTo(0, chatbox.scrollHeight);
    } catch (error) {
        console.error("âŒ Error loading chat:", error);
        // Create properly styled error message
        const errorLi = document.createElement("li");
        errorLi.className = "chat incoming error";
        errorLi.innerHTML = `
            <div class="bot-message-container">
                <p>Failed to load chat. Please check your connection and try again.</p>
            </div>
        `;
        chatbox.innerHTML = "";
        chatbox.appendChild(errorLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
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
            activeChatId = null;
            localStorage.removeItem("genie_activeChatId");
            await ensureActiveChat();
        } else {
            await loadSessionsSidebar();
        }
    } catch (error) {
        console.error("âŒ Error deleting session:", error);
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
        
        activeChatId = null;
        localStorage.removeItem("genie_activeChatId");
        await ensureActiveChat();
    } catch (error) {
        console.error("âŒ Error deleting all chats:", error);
    }
}

// 6. MESSAGE HANDLING
function handleChat() {
    if (isRequestInFlight) return;
    const userMessage = chatInput?.value.trim() || "";
    if (!chatInput) return;
    if (!userMessage && !pendingMediaSelected) return;
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
    pendingImageData = null;
    pendingImageName = "";
    pendingMediaType = "";
    pendingMediaSelected = false;
    pendingMediaLoading = false;
    revokePendingMediaPreviewHref();
    if (imageUploadInput) imageUploadInput.value = "";
    if (chatInput) chatInput.placeholder = "Ask anything with GENIE...";
    clearSelectedMediaPreview();

    const hasMediaPayload = mediaWasSelected && isAnyDataUrl(imageData);

    if (mediaWasSelected && !hasMediaPayload) {
        const errorLi = createChatLi(
          "Selected file could not be prepared. Please upload again.",
          "incoming",
        );
        chatbox.appendChild(errorLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
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
    
    // Show typing indicator and generate response
    setTimeout(() => {
        const typingLi = showTypingIndicator();
        const requestMode = hasMediaPayload ? "media" : "chat";
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
    }, 600);
}
async function generateResponse(
  incomingChatli,
  userMessage,
  mediaUpload = null,
  requestMode = "chat",
) {
  const messageElement = convertTypingToMessage(incomingChatli);
  messageElement.innerHTML = "Thinking<span class='dots'></span>";
  const hasMediaUpload = requestMode === "media";

  // Check for special commands
  if (await handleSpecialCommands(messageElement, userMessage)) {
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
    const requestTimeoutMs = hasMediaUpload ? 300000 : 30000;
    timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let responseText = "";

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
    } else {
      console.log("[GENIE] Route: /chat");
      const response = await apiFetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          chatId: activeChatId,
          message: userMessage.trim(),
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
    messageElement.innerHTML = "";
    const textSpeed =
      responseText.length > 2200 ? 4 : responseText.length > 1200 ? 7 : 12;
    await typeTextAndCode(messageElement, responseText, textSpeed, 5);
    messageElement.innerHTML = parseFencedBlocks(responseText);
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
    await loadSessionsSidebar();
  } catch (error) {
    console.error("Error generating response:", error);
    if (error?.name === "AbortError") {
      messageElement.innerHTML = hasMediaUpload
        ? "Media analysis is still running and took too long. Please retry in a moment."
        : "Request timed out. Please try again.";
    } else {
      messageElement.innerHTML = hasMediaUpload
        ? "Media analysis failed or service is busy. Please try again shortly."
        : "Failed to get response. Please try again.";
    }
  } finally {
    if (timeout) clearTimeout(timeout);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    setComposerBusy(false);
  }
}


async function handleSpecialCommands(messageElement, userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Weather command
    if (lowerMessage.includes("weather") || lowerMessage.includes("temperature")) {
        const cityMatch = userMessage.match(/weather|temperature\s+(?:in|at|for)?\s*([a-zA-Z\s]+)/i);
        let city = cityMatch ? cityMatch[1].trim() : "";
        
        if (!city) {
            const words = userMessage.split(" ");
            city = words[words.length - 1];
        }
        
        if (!city) {
            messageElement.innerHTML = "Please specify a location for the weather.";
            return true;
        }
        
        const weatherData = await fetchWeather(city);
        if (!weatherData) {
            messageElement.innerHTML = `Sorry, I couldn't find weather data for "${city}".`;
            return true;
        }
        
        const { temp, feels_like, humidity } = weatherData.main;
        const description = weatherData.weather[0].description;
        const windSpeed = weatherData.wind.speed;
        const cityName = weatherData.name;
        const country = weatherData.sys.country;
        
        const weatherReply = `ðŸŒ¤ï¸ Weather in ${cityName}, ${country}:<br>
        Temperature: ${temp}Â°C (feels like ${feels_like}Â°C)<br>
        Condition: ${description}<br>
        Humidity: ${humidity}%<br>
        Wind Speed: ${windSpeed} m/s`;
        
        messageElement.innerHTML = weatherReply;
        return true;
    }
    
    // Clear memory command
    if (lowerMessage.includes("clear memory")) {
        conversationMemory = [];
        messageElement.innerHTML = "ðŸ§  Memory cleared.";
        return true;
    }
    
    return false;
}

async function fetchWeather(city) {
    try {
        const resp = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
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
        chatLi.innerHTML = `<p>${escapeHtml(message)}</p>`;
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
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    
    chatbox.appendChild(typingLi);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    return typingLi;
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
      // Wrap leaked placeholder tokens as inline markdown code without changing content.
      .replace(/(@{1,2}\s*INL\w*\s*_?\s*CODE\s*_?\s*\d+\s*@{1,2})/gi, "`$1`")
      .replace(/(@{1,2}\s*INL\w*\s*_?\s*CODE\s*@{1,2})/gi, "`$1`");
}

function parseFencedBlocks(text) {
    const source = normalizeInlineCodeArtifacts(text).replace(/\r\n/g, "\n");
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
        const response = await fetch(`${BACKEND_URL}/`);

        if (response.ok) {
            console.log("âœ… Backend is reachable");
            return true;
        } else {
            console.error("âŒ Backend error:", response.status);
            return false;
        }
    } catch (error) {
        console.error("âŒ Cannot reach backend:", error);
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

// ================= FIX SIDEBAR CLOSE BUTTON =================
function fixSidebarCloseButton() {
  const closeBtn = document.getElementById("close-sidebar");
  const sidebar = document.querySelector(".history-sidebar");
  
  if (!closeBtn) {
    console.error("âŒ Close sidebar button not found!");
    return;
  }
  
  if (!sidebar) {
    console.error("âŒ History sidebar not found!");
    return;
  }
  
  console.log("âœ… Found sidebar close button:", closeBtn);
  
  // Remove any existing event listeners by cloning
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  
  // Add click event listener
  newCloseBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("ðŸŸ¡ Closing sidebar...");
    
    // Remove active class
    sidebar.classList.remove("active");
    
    // On mobile, also hide with transform
    if (window.innerWidth <= 480) {
      sidebar.style.transform = "translateX(-100%)";
    }
    
    console.log("âœ… Sidebar closed");
  });
  
  // Also add event listener to the original sidebar reference
  sidebar.addEventListener("click", function(e) {
    if (e.target.id === "close-sidebar" || 
        e.target.closest("#close-sidebar")) {
      e.stopPropagation();
      sidebar.classList.remove("active");
      if (window.innerWidth <= 480) {
        sidebar.style.transform = "translateX(-100%)";
      }
    }
  });
}

// Run fix when page loads
document.addEventListener("DOMContentLoaded", function() {
  console.log("ðŸš€ DOM loaded, fixing sidebar close button...");
  setTimeout(fixSidebarCloseButton, 500); // Delay to ensure everything is loaded
});

// Also run fix when chat starts (if sidebar is dynamically shown)
document.addEventListener("click", function(e) {
  if (e.target.closest(".start-chat-btn")) {
    setTimeout(fixSidebarCloseButton, 1000);
  }
});

// ================= WEBVIEW FIX FOR SIDEBAR CLOSE BUTTON =================
// ADD THIS AT THE VERY BOTTOM OF THE FILE

// ================= WEBVIEW FIX FOR SIDEBAR CLOSE BUTTON =================

function setupWebViewCloseButton() {
  console.log("ðŸ”§ Setting up WebView close button...");
  
  const closeBtn = document.getElementById("close-sidebar");
  const sidebar = document.querySelector(".history-sidebar");
  
  if (!closeBtn || !sidebar) {
    console.log("â³ WebView: Waiting for elements...");
    return;
  }
  
  console.log("âœ… WebView: Found close button and sidebar");
  
  // SIMPLEST SOLUTION: Direct onclick
  closeBtn.onclick = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("ðŸŽ¯ WebView: Close button CLICKED!");
    
    // Close sidebar
    sidebar.classList.remove("active");
    
    // Force hide on mobile
    if (window.innerWidth <= 480) {
      sidebar.style.transform = "translateX(-100%)";
      sidebar.style.display = "none";
    }
    
    return false;
  };
  
  console.log("âœ… WebView: Close button setup complete");
}

// Run setup immediately and multiple times
setupWebViewCloseButton();
setTimeout(setupWebViewCloseButton, 500);
setTimeout(setupWebViewCloseButton, 1000);
setTimeout(setupWebViewCloseButton, 2000);

// Run when sidebar opens
document.addEventListener("click", function(e) {
  if (e.target.closest("#sidebar-toggle") || 
      e.target.closest(".start-chat-btn")) {
    console.log("ðŸ”„ Sidebar state changed, re-setting up close button...");
    setTimeout(setupWebViewCloseButton, 300);
  }
});

// ---- Typing simulation helpers ----
function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function typeCharsInto(el, text, baseSpeed = 10, mode = "html") {
  return new Promise((resolve) => {
    const safe = mode === "html" ? escapeHTML(text) : text;
    let i = 0;

    function tick() {
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

      const chatbox = document.querySelector(".chatbox");
      if (chatbox) chatbox.scrollTop = chatbox.scrollHeight;

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
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      buffer += ch;

      if (i % 2 === 0 || i === raw.length - 1) {
        target.innerHTML = parseFencedBlocks(buffer);
      }

      const chatbox = document.querySelector(".chatbox");
      if (chatbox) chatbox.scrollTop = chatbox.scrollHeight;

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
      target.textContent += code[i];

      const chatbox = document.querySelector(".chatbox");
      if (chatbox) chatbox.scrollTop = chatbox.scrollHeight;

      await new Promise((r) => setTimeout(r, codeSpeed));
    }
    if (window.Prism) Prism.highlightElement(target);
  }

  while ((match = regex.exec(fullText)) !== null) {
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

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buffer += ch;

    // Render every 2 chars for smoother animation without heavy reflow.
    if (i % 2 === 0 || i === text.length - 1) {
      element.innerHTML = parseFencedBlocks(buffer);
      if (window.Prism) Prism.highlightAllUnder(element);
      const chatbox = document.querySelector(".chatbox");
      if (chatbox) chatbox.scrollTop = chatbox.scrollHeight;
    }

    let delay = textSpeed;
    if (ch === "\n") delay = Math.max(20, textSpeed + 8);
    else if (ch === "." || ch === "!" || ch === "?")
      delay = Math.max(45, textSpeed + 35);
    else if (ch === "," || ch === ";") delay = Math.max(30, textSpeed + 18);

    await new Promise((r) => setTimeout(r, delay));
  }
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


console.log("Loaded from:", location.href);
console.log("Script version: v12");

