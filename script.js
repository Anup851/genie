const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");
const chatbox = document.querySelector(".chatbox");
const historySidebar = document.querySelector(".history-sidebar");
const historyList = document.querySelector(".history-list");
const deleteAllBtn = document.querySelector(".delete-all-btn");
const welcomeText = document.querySelector(".welcome");

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

    // Regular text message
    container.innerHTML = `<p>${message}</p>`;

    // Add speak button
    const speakBtn = document.createElement("button");
    speakBtn.className = "speak-btn material-symbols-outlined";
    speakBtn.textContent = "volume_up";
    container.appendChild(speakBtn);

    // Add bot icon
    const botIcon = document.createElement("span");
    botIcon.className = "material-symbols-outlined";
    botIcon.textContent = "smart_toy";

    // Build the message
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

// Get time in specific timezone
function getTimeInZone(location) {
  const now = new Date();
  return now.toLocaleString("en-US", {
    timeZone: location,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// Fetch weather data
async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.cod === 200 ? data : null;
  } catch (error) {
    console.error("Weather API error:", error);
    return null;
  }
}

// Generate response
// Generate response
const generateResponse = async (incomingChatli, userMessage) => {
  const messageElement = incomingChatli.querySelector("p");
  messageElement.innerHTML = "Thinking<span class='dots'></span>";

  // 1. Fixed variable name from 'message' to 'userMessage'
  const lowerMessage = userMessage.toLowerCase();

  // 2. Improved timezone detection with regex boundaries
  for (const location in timeZones) {
    const locationPattern = new RegExp(`\\b${location}\\b`, 'i');
    if (
      /\b(what(?:'s| is)? the time|current time|time now|time in)\b/i.test(lowerMessage) &&
      locationPattern.test(lowerMessage)
    ) {
      const timeString = getTimeInZone(timeZones[location]);
      const capitalizedLocation = location.replace(/\b\w/g, l => l.toUpperCase());
      const reply = `The current time in ${capitalizedLocation} is ${timeString}.`;
      messageElement.innerHTML = `🕒 ${reply}`;
      
      // Add to conversation memory
      conversationMemory.push({ role: "user", text: userMessage });
      conversationMemory.push({ role: "assistant", text: reply });
      
      saveSearchHistory(userMessage);
      return;
    }
  }

  // 3. Fixed local time detection
  if (/\b(what(?:'s| is)? the time|current time|time now)\b/i.test(lowerMessage)) {
    const localTime = new Date().toLocaleTimeString();
    const reply = `The current local time is ${localTime}.`;
    messageElement.innerHTML = `🕒 ${reply}`;
    
    // Add to conversation memory
    conversationMemory.push({ role: "user", text: userMessage });
    conversationMemory.push({ role: "assistant", text: reply });
    
    saveSearchHistory(userMessage);
    return;
  }

  // 4. Improved weather detection with regex
  if (lowerMessage.includes("weather")) {
    const weatherRegex = /weather\s+(?:in|at|for)\s+(.+)/i;
    const match = userMessage.match(weatherRegex);
    const city = match ? match[1].trim() : "";

    if (!city) {
      messageElement.innerHTML = "Please specify a location after 'weather in'.";
      return;
    }

    const weatherData = await fetchWeather(city);
    if (!weatherData) {
      messageElement.innerHTML = `Sorry, I couldn't find weather data for ${city}.`;
      return;
    }

    const { temp, feels_like, humidity } = weatherData.main;
    const description = weatherData.weather[0].description;
    const windSpeed = weatherData.wind.speed;
    const { name: cityName, sys: { country } } = weatherData;

    const weatherReply = `🌤️ <b>Weather in ${cityName}, ${country}</b>:<br>Temperature: ${temp}°C (feels like ${feels_like}°C)<br>Condition: ${description}<br>Humidity: ${humidity}%<br>Wind Speed: ${windSpeed} m/s`;
    messageElement.innerHTML = weatherReply;
    
    // Add to conversation memory
    conversationMemory.push({ role: "user", text: userMessage });
    conversationMemory.push({ role: "assistant", text: weatherReply.replace(/<[^>]*>/g, "") });
    
    saveSearchHistory(userMessage);
    return;
  }

  // 5. Clear memory command
  if (lowerMessage.includes("clear memory")) {
    conversationMemory = [];
    messageElement.innerHTML = "🧠 Memory cleared.";
    return;
  }

 // Default AI response
conversationMemory.push({ role: "user", text: userMessage });

try {
  const response = await fetch("https://8c4f04f8-814c-43a8-99c8-a96f45bfd9e6-00-1p3byqr3jjezl.sisko.replit.dev/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // "Authorization": "Bearer YOUR_API_KEY_HERE" // if needed
    },
    body: JSON.stringify({
      messages: conversationMemory.map((m) => ({
        role: m.role,
        content: m.text
      }))
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error: ${response.status}`);
  }

  const data = await response.json();
  console.log("✅ API response:", data);

  // ✅ Use `data.reply` directly
  const responseText = data.reply;

  if (!responseText) {
    console.error("⚠️ Unexpected response format:", data);
    throw new Error("Invalid response: 'reply' field is missing");
  }

  const finalText = responseText
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br>");

  messageElement.innerHTML = finalText;

  const plainText = responseText.replace(/<[^>]*>/g, "");
  saveSearchHistory(userMessage);
  conversationMemory.push({ role: "assistant", text: plainText });

} catch (error) {
  console.error("❌ Backend error:", error);
  messageElement.innerHTML = "❌ Failed to get response. Please try again later.";
}

 finally {
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

// Voice recognition
const micBtn = document.getElementById("mic-btn");
let recognition;

// Check for standard and webkit implementations
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    micBtn.textContent = "🎙️ Listening...";
    micBtn.classList.add("listening");
  };

  recognition.onend = () => {
    micBtn.textContent = "mic";
    micBtn.classList.remove("listening");
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    micBtn.textContent = "mic";
    micBtn.classList.remove("listening");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    // Auto-send after voice input
    setTimeout(handleChat, 500);
  };
} else {
  micBtn.style.display = "none";
  console.warn("Speech recognition not supported in this browser");
}

micBtn.addEventListener("click", () => {
  if (recognition && !micBtn.classList.contains("listening")) {
    try {
      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }
});



document.addEventListener("DOMContentLoaded", () => {
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const closeSidebar = document.getElementById("close-sidebar"); // NEW
  const historySidebar = document.querySelector(".history-sidebar");
  const container = document.querySelector(".container");
  const welcome = document.querySelector(".welcome");
  const startChatBtn = document.querySelector(".start-chat-btn");

  // Initial view
  if (welcome && container) {
    welcome.style.display = "block";
    container.style.display = "none";
  }

  if (startChatBtn) {
    startChatBtn.addEventListener("click", () => {
      if (welcome && container) {
        welcome.style.display = "none";
        container.style.display = "block";
      }
    });
  }

  if (sidebarToggle && historySidebar && container) {
    sidebarToggle.addEventListener("click", () => {
      historySidebar.classList.toggle("active");

      if (historySidebar.classList.contains("active")) {
        container.style.display = "none";
      } else {
        container.style.display = "block";
      }
    });
  }

  // ✅ NEW: Close sidebar button click
  if (closeSidebar && historySidebar && container) {
    closeSidebar.addEventListener("click", () => {
      historySidebar.classList.remove("active");
      container.style.display = "block";
    });
  }

  // Handle resize
  window.addEventListener("resize", () => {
    if (window.innerWidth > 480 && historySidebar && container) {
      historySidebar.classList.remove("active");
      container.style.display = "block";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.querySelector("#close-chatbot");
  const container = document.querySelector(".container");
  const welcome = document.querySelector(".welcome");
  const startChatBtn = document.querySelector(".start-chat-btn");

  // Show welcome screen initially
  if (welcome && container) {
    welcome.style.display = "block";
    container.style.display = "none";
  }

  // Start chat button logic
  if (startChatBtn && welcome && container) {
    startChatBtn.addEventListener("click", () => {
      welcome.style.display = "none";
      container.style.display = "block";
    });
  }

  // ✅ Close chatbot and go back to welcome screen
  if (closeBtn && container && welcome) {
    closeBtn.addEventListener("click", () => {
      container.style.display = "none";
      welcome.style.display = "block"; // 👈 show welcome again
    });
  }
});


