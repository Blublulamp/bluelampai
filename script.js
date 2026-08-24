const API_BASE_URL = "https://globalblamp.vercel.app/v1";

const settingsBtn = document.getElementById("settingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

const settingsModal = document.getElementById("settingsModal");

const apiKeyInput = document.getElementById("apiKeyInput");
const modelSelect = document.getElementById("modelSelect");

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");


let messages = [];

let currentApiKey = localStorage.getItem("globalblamp_api_key") || "";
let currentModel = localStorage.getItem("globalblamp_model") || "gpt-5.6-sol";


function loadSettings() {
  apiKeyInput.value = currentApiKey;
  modelSelect.value = currentModel;
}


function openSettings() {
  loadSettings();
  settingsModal.classList.remove("hidden");
}


function closeSettings() {
  settingsModal.classList.add("hidden");
}


function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  if (!apiKey) {
    alert("Please enter your API key.");
    return;
  }

  if (!apiKey.startsWith("gk-")) {
    alert("Your API key should start with gk-");
    return;
  }

  currentApiKey = apiKey;
  currentModel = model;

  localStorage.setItem("globalblamp_api_key", currentApiKey);
  localStorage.setItem("globalblamp_model", currentModel);

  closeSettings();
}


function removeWelcomeMessage() {
  const welcomeMessage = document.querySelector(".welcome-message");

  if (welcomeMessage) {
    welcomeMessage.remove();
  }
}


function addMessage(role, content, isError = false) {
  removeWelcomeMessage();

  const messageWrapper = document.createElement("div");

  messageWrapper.className = `message ${role}`;


  const roleLabel = document.createElement("div");

  roleLabel.className = "message-role";

  roleLabel.textContent =
    role === "user"
      ? "You"
      : currentModel;


  const bubble = document.createElement("div");

  bubble.className = "message-bubble";

  if (isError) {
    bubble.classList.add("error-message");
  }

  bubble.textContent = content;


  messageWrapper.appendChild(roleLabel);
  messageWrapper.appendChild(bubble);

  chatArea.appendChild(messageWrapper);

  chatArea.scrollTop = chatArea.scrollHeight;

  return bubble;
}


function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  messageInput.disabled = isLoading;

  if (isLoading) {
    sendBtn.textContent = "…";
  } else {
    sendBtn.textContent = "➤";
  }
}


async function sendMessage() {
  const userText = messageInput.value.trim();

  if (!userText) {
    return;
  }


  if (!currentApiKey) {
    openSettings();
    alert("Please enter your API key first.");
    return;
  }


  messageInput.value = "";
  resizeTextarea();


  addMessage("user", userText);


  messages.push({
    role: "user",
    content: userText
  });


  setLoading(true);


  const assistantBubble = addMessage(
    "assistant",
    "Thinking..."
  );


  try {
    const response = await fetch(
      `${API_BASE_URL}/chat/completions`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentApiKey}`
        },

        body: JSON.stringify({
          model: currentModel,
          messages: messages
        })
      }
    );


    let data;

    try {
      data = await response.json();
    } catch {
      data = null;
    }


    if (!response.ok) {
      let errorMessage = `API Error ${response.status}`;

      if (data?.error?.message) {
        errorMessage = data.error.message;
      }

      throw new Error(errorMessage);
    }


    const assistantText =
      data?.choices?.[0]?.message?.content;


    if (!assistantText) {
      throw new Error(
        "The API returned an empty response."
      );
    }


    assistantBubble.textContent = assistantText;


    messages.push({
      role: "assistant",
      content: assistantText
    });


  } catch (error) {

    assistantBubble.textContent =
      `Error: ${error.message}`;

    assistantBubble.classList.add(
      "error-message"
    );

    console.error(error);

  } finally {

    setLoading(false);

    messageInput.focus();

    chatArea.scrollTop =
      chatArea.scrollHeight;
  }
}


function resizeTextarea() {
  messageInput.style.height = "auto";

  const newHeight = Math.min(
    messageInput.scrollHeight,
    150
  );

  messageInput.style.height =
    `${newHeight}px`;
}


settingsBtn.addEventListener(
  "click",
  openSettings
);


closeSettingsBtn.addEventListener(
  "click",
  closeSettings
);


saveSettingsBtn.addEventListener(
  "click",
  saveSettings
);


settingsModal.addEventListener(
  "click",
  (event) => {

    if (event.target === settingsModal) {
      closeSettings();
    }

  }
);


sendBtn.addEventListener(
  "click",
  sendMessage
);


messageInput.addEventListener(
  "input",
  resizeTextarea
);


messageInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }

  }
);


loadSettings();
