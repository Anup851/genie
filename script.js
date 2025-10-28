const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");
const chatbox = document.querySelector(".chatbox");
const historySidebar = document.querySelector(".history-sidebar");
const historyList = document.querySelector(".history-list");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const welcomeText = document.querySelector(".welcome");
const sidebarToggle = document.getElementById("sidebar-toggle");
const closeSidebarBtn = document.getElementById("close-sidebar");

// API configurations
const WEATHER_API_KEY = "c4846573091c7b3978af67020443a2b4";
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
let conversationMemory = [];

// Timezone data
const timeZones = {
  india: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  newyork: "America/New_York",
  "new york": "America/New_York",
  london: "Europe/London",
  tokyo: "Asia/Tokyo",
  sydney: "Australia/Sydney",
  dubai: "Asia/Dubai",
  paris: "Europe/Paris",
  singapore: "Asia/Singapore",
  california: "America/Los_Angeles",
  berlin: "Europe/Berlin",
  chicago: "America/Chicago",
  beijing: "Asia/Shanghai",
  seoul: "Asia/Seoul"
};

// Create chat message element
function createChatLi(message, className) {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", className);

  if (className === "outgoing") {
    chatLi.innerHTML = `<p>${message}</p>`;
  } else {
    const container = document.createElement("div");
    container.className = "bot-message-container";

    container.innerHTML = `<p>${message}</p>`;

    const speakBtn = document.createElement("button");
    speakBtn.className = "speak-btn material-symbols-outlined";
    speakBtn.textContent = "volume_up";
    container.appendChild(speakBtn);

    const botIcon = document.createElement("span");
    botIcon.className = "material-symbols-outlined";
    botIcon.textContent = "smart_toy";

    chatLi.appendChild(botIcon);
    chatLi.appendChild(container);
  }

  return chatLi;
}

// Save search history
const saveSearchHistory = (message) => {
  searchHistory.push(message);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  updateHistorySidebar();
};

// Update history sidebar
const updateHistorySidebar = () => {
  historyList.innerHTML = "";
  if (searchHistory.length === 0) {
    historyList.innerHTML = "<li>No history available</li>";
  } else {
    searchHistory.forEach((query, index) => {
      const listItem = document.createElement("li");
      listItem.textContent = query;
      const deleteIcon = document.createElement("span");
      deleteIcon.classList.add("material-icons", "delete-icon");
      deleteIcon.textContent = "delete";
      deleteIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryItem(index);
      });
      listItem.appendChild(deleteIcon);
      listItem.addEventListener("click", () => {
        chatInput.value = query;
      });
      historyList.appendChild(listItem);
    });
  }
};

// Delete history item
const deleteHistoryItem = (index) => {
  searchHistory.splice(index, 1);
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  updateHistorySidebar();
};

// Handle chat
const handleChat = () => {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatInput.value = "";
  chatbox.appendChild(createChatLi(userMessage, "outgoing"));
  chatbox.scrollTo(0, chatbox.scrollHeight);

  setTimeout(() => {
    const incomingChatli = createChatLi("", "incoming");
    chatbox.appendChild(incomingChatli);
    generateResponse(incomingChatli, userMessage);
  }, 600);
};

// Fetch real-time weather
async function fetchWeather(city) {
  try {
    const resp = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Fetch real-time time in a timezone
function getTimeInZone(timeZone) {
  return new Date().toLocaleTimeString("en-US", { timeZone });
}

// Main response generator
const generateResponse = async (incomingChatli, userMessage) => {
  const messageElement = incomingChatli.querySelector("p");
  messageElement.innerHTML = "Thinking<span class='dots'></span>";

  const lowerMessage = userMessage.toLowerCase();

  // ---------- WEATHER HANDLING ----------
  if (lowerMessage.includes("weather") || lowerMessage.includes("temperature")) {
    let city = userMessage
      .replace(/\b(weather|temperature|in|at|for|what|is|the|current)\b/gi, "")
      .trim();

    // Fallback: last word
    if (!city) {
      const words = userMessage.split(" ");
      city = words[words.length - 1];
    }

    if (!city) {
      messageElement.innerHTML = "Please specify a location for the weather.";
      return;
    }

    const weatherData = await fetchWeather(city);
    if (!weatherData) {
      messageElement.innerHTML = `Sorry, I couldn't find weather data for "${city}".`;
      return;
    }

    const { temp, feels_like, humidity } = weatherData.main;
    const description = weatherData.weather[0].description;
    const windSpeed = weatherData.wind.speed;
    const { name: cityName, sys: { country } } = weatherData;

    const weatherReply = `🌤️ <b>Weather in ${cityName}, ${country}</b>:<br>
      Temperature: ${temp}°C (feels like ${feels_like}°C)<br>
      Condition: ${description}<br>
      Humidity: ${humidity}%<br>
      Wind Speed: ${windSpeed} m/s`;

    messageElement.innerHTML = weatherReply;
    conversationMemory.push({ role: "user", text: userMessage });
    conversationMemory.push({ role: "assistant", text: weatherReply.replace(/<[^>]*>/g, "") });
    saveSearchHistory(userMessage);
    return;
  }

  // Clear memory command
  if (lowerMessage.includes("clear memory")) {
    conversationMemory = [];
    messageElement.innerHTML = "🧠 Memory cleared.";
    return;
  }

  // Push user message first
  conversationMemory.push({ role: "user", text: userMessage });

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  // Call your Replit backend instead of OpenAI directly
  const response = await fetch("https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
  messages: conversationMemory.map(m => ({
    role: m.role,
    content: m.text // ✅ use 'content' not 'text'
  }))
}),

    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.reply; // your backend returns { reply: "..." }

  if (!responseText) {
    throw new Error("Invalid response: 'reply' field is missing");
  }

  // Format text for HTML
  const finalText = responseText
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");

  messageElement.innerHTML = finalText;

  // Save plain text to memory
  const plainText = responseText.replace(/<[^>]*>/g, "");
  saveSearchHistory(userMessage);
  conversationMemory.push({ role: "assistant", text: plainText });

} catch (error) {
    console.error("❌ Backend error:", error);
    messageElement.innerHTML = "❌ Failed to get response. Please try again later.";
  } finally {
    chatbox.scrollTo(0, chatbox.scrollHeight);
  }
};

// Event listeners
sendChatBtn.addEventListener("click", handleChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleChat();
  }
});
chatbotToggler.addEventListener("click", () => {
  document.body.classList.toggle("show-chatbot");
  document.body.classList.toggle("show-history");
});
closeBtn.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot");
  document.body.classList.remove("show-history");
});
updateHistorySidebar();
deleteAllBtn.addEventListener("click", () => {
  searchHistory = [];
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  updateHistorySidebar();
});
const startChatBtn = document.querySelector(".start-chat-btn");
startChatBtn.addEventListener("click", () => {
  document.body.classList.add("show-chatbot");
  document.body.classList.add("show-history");
});

// Dark/light mode toggle
const toggleButton = document.getElementById("mode-toggle");
const icon = toggleButton.querySelector(".material-symbols-outlined");
toggleButton.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  icon.textContent = document.body.classList.contains("light-mode") ? "light_mode" : "dark_mode";
});
window.addEventListener("DOMContentLoaded", () => {
  icon.textContent = document.body.classList.contains("light-mode") ? "light_mode" : "dark_mode";
});


// History sidebar functionality
if (sidebarToggle && closeSidebarBtn) {
  sidebarToggle.addEventListener("click", () => {
    historySidebar.classList.toggle("active");
    document.body.classList.toggle("show-history");
  });
  closeSidebarBtn.addEventListener("click", () => {
    historySidebar.classList.remove("active");
    document.body.classList.remove("show-history");
  });
  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 480 && 
        historySidebar.classList.contains("active") && 
        !historySidebar.contains(event.target) && 
        event.target !== sidebarToggle) {
      historySidebar.classList.remove("active");
      document.body.classList.remove("show-history");
    }
  });
}

// Welcome screen and container management
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const welcome = document.querySelector(".welcome");
  const startChatBtn = document.querySelector(".start-chat-btn");
  if (welcome && container) {
    welcome.style.display = "block";
    container.style.display = "none";
  }
  historySidebar.classList.remove("active");
  document.body.classList.remove("show-history");
  if (startChatBtn) {
    startChatBtn.addEventListener("click", () => {
      if (welcome && container) {
        welcome.style.display = "none";
        container.style.display = "block";
      }
      historySidebar.classList.add("active");
      document.body.classList.add("show-history");
    });
  }
  if (closeBtn && container && welcome) {
    closeBtn.addEventListener("click", () => {
      container.style.display = "none";
      welcome.style.display = "block";
      historySidebar.classList.remove("active");
      document.body.classList.remove("show-history");
    });
  }
});

// Adjust sidebar on window resize
window.addEventListener("resize", () => {
  if (window.innerWidth <= 480) {
    historySidebar.classList.remove("active");
    document.body.classList.remove("show-history");
  } else {
    const container = document.querySelector(".container");
    if (container && container.style.display === "block") {
      historySidebar.classList.add("active");
      document.body.classList.add("show-history");
    } else {
      historySidebar.classList.remove("active");
      document.body.classList.remove("show-history");
    }
  }
});

// Disable zoom
window.addEventListener("wheel", function(e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
window.addEventListener("keydown", function(e) {
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) e.preventDefault();
});

document.addEventListener("DOMContentLoaded", () => {
  const micBtn = document.getElementById("mic-btn");
  const chatInput = document.querySelector(".chat-input textarea");

  if (!micBtn || !chatInput) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.style.display = "none"; // hide mic if not supported
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let isListening = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.textContent = "🎙️ Listening...";
    micBtn.classList.add("listening");
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.textContent = "mic";
    micBtn.classList.remove("listening");
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    isListening = false;
    micBtn.textContent = "mic";
    micBtn.classList.remove("listening");
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (!transcript) return;

    chatInput.value = transcript; // set the transcript in input
    handleChat();                // immediately send to chatbot
  };

  micBtn.addEventListener("click", async () => {
    if (!isListening) {
      try {
        // Ask for mic permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognition.start();
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Please allow microphone access in your browser.");
      }
    } else {
      recognition.stop();
    }
  });
});
