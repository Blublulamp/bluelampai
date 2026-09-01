const API_BASE_URL = "https://ai.geraikita.com/v1";
const HISTORY_API = "https://history.bluelamp.workers.dev";

const loginScreen = document.getElementById("loginScreen");
const chatApp = document.getElementById("chatApp");

const loginMessage =
  document.getElementById("loginMessage");
const telegramLoginBtn =
  document.getElementById(
    "telegramLoginBtn"
  );

const settingsBtn = document.getElementById("settingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const logoutBtn =
  document.getElementById("logoutBtn");
const settingsModal = document.getElementById("settingsModal");

const apiKeyInput = document.getElementById("apiKeyInput");
const modelSelect = document.getElementById("modelSelect");

const historyBtn =
  document.getElementById("historyBtn");

const historyBackdrop =
  document.getElementById("historyBackdrop");

const historyPanel =
  document.getElementById("historyPanel");

const closeHistoryBtn =
  document.getElementById("closeHistoryBtn");

const newChatBtn =
  document.getElementById("newChatBtn");

const chatList =
  document.getElementById("chatList");

const currentChatTitle =
  document.getElementById("currentChatTitle");

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");


let messages = [];
let currentChatId = null;

let currentApiKey = "";

let currentSessionToken =
  localStorage.getItem(
    "globalblamp_session_token"
  ) || "";

let currentModel =
  localStorage.getItem(
    "globalblamp_model"
  ) || "gpt-5.6-sol";
function getHistoryAuthToken() {
  return currentSessionToken;
}
function setCurrentChatTitle(title) {
  currentChatTitle.textContent =
    title || "New Chat";
}

function resetToNewChat() {
  currentChatId = null;
  messages = [];

  setCurrentChatTitle("New Chat");

  chatArea.innerHTML = `
    <div class="welcome-message">
      <h2>New Chat</h2>

      <p>
        Start a new conversation.
      </p>
    </div>
  `;
}

function setLoginMessage(text, type = "") {
  loginMessage.textContent = text;

  loginMessage.classList.remove(
    "error",
    "success"
  );

  if (type) {
    loginMessage.classList.add(type);
  }
}


function showLogin() {
  loginScreen.classList.remove("hidden");
  chatApp.classList.add("hidden");
}


function showChat() {
  loginScreen.classList.add("hidden");
  chatApp.classList.remove("hidden");
}

async function handleTelegramOidcResult(
  result
) {
  if (!result) {
    setLoginMessage(
      "Telegram login failed.",
      "error"
    );

    return;
  }


  if (result.error) {
    setLoginMessage(
      result.error,
      "error"
    );

    return;
  }


  if (!result.id_token) {
    setLoginMessage(
      "Telegram did not return an ID token.",
      "error"
    );

    return;
  }


  setLoginMessage(
    "Checking Telegram account..."
  );


  try {
    const response = await fetch(
      `${HISTORY_API}/auth/telegram`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          id_token:
            result.id_token
        })
      }
    );


    let data = null;

    try {
      data =
        await response.json();

    } catch {
      data = null;
    }


    if (!response.ok) {
      throw new Error(
        data?.error ||
        "Telegram login failed"
      );
    }


console.log(
  "Telegram login successful:",
  data
);


currentSessionToken =
  data.session_token;


localStorage.setItem(
  "globalblamp_session_token",
  currentSessionToken
);


localStorage.setItem(
  "globalblamp_telegram_user",
  JSON.stringify(data.user)
);


setLoginMessage(
  "Telegram login successful.",
  "success"
);


showChat();


/*
  Active API already linked.

  This is a normal licensed Telegram
  account, so it must NOT use the
  temporary 30-minute timer.
*/

if (
  data.api_access &&
  data.api_access.active
) {
  localStorage.removeItem(
    "globalblamp_unlicensed_login_at"
  );


  try {
    const chats =
      await loadChats();


    if (chats.length > 0) {
      await openSavedChat(
        chats[0]
      );

    } else {
      resetToNewChat();
    }

  } catch (error) {
    console.error(
      "Could not load chats after Telegram login:",
      error
    );
  }


  return;
}

/*
  Telegram account is valid,
  but it does not have an active
  API license yet.

  Keep the Telegram identity signed in
  and ask the user to connect an API.
*/

openSettings();

  } catch (error) {
    console.error(
      "Telegram login error:",
      error
    );


    setLoginMessage(
      error.message,
      "error"
    );
  }
}

function loadSettings() {
  apiKeyInput.value = "";
  modelSelect.value = currentModel;
}

function openHistory() {
  historyBackdrop.classList.remove("hidden");
  historyPanel.classList.remove("hidden");
}


function closeHistory() {
  historyBackdrop.classList.add("hidden");
  historyPanel.classList.add("hidden");
}

function openSettings() {
  loadSettings();
  settingsModal.classList.remove("hidden");
}


function closeSettings() {
  settingsModal.classList.add("hidden");
}

function logout() {
  localStorage.removeItem(
    "globalblamp_api_key"
  );

  localStorage.removeItem(
    "globalblamp_session_token"
  );

  localStorage.removeItem(
    "globalblamp_telegram_user"
  );
  localStorage.removeItem(
    "globalblamp_unlicensed_login_at"
  );


  currentApiKey = "";
  currentSessionToken = "";

  apiKeyInput.value = "";


  resetToNewChat();

  closeSettings();
  closeHistory();
  showLogin();

  setLoginMessage("");
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  if (!currentSessionToken) {
    alert("Please log in with Telegram first.");
    showLogin();
    return;
  }
  
  const accountChanged =
  apiKey !== currentApiKey;
  
  if (!apiKey) {
    alert("Please enter your API key.");
    return;
  }

  if (!apiKey.startsWith("gk-")) {
    alert("Your API key should start with gk-");
    return;
  }

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.textContent = "Checking...";

try {
  const response = await fetch(
    `${HISTORY_API}/account/link-api`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "Authorization":
          `Bearer ${currentSessionToken}`
      },

      body: JSON.stringify({
        api_key: apiKey
      })
    }
  );


  let data = null;


  try {
    data =
      await response.json();

  } catch {
    data = null;
  }


  if (!response.ok) {
    throw new Error(
      data?.error ||
      "This API key cannot be used."
    );
  }
localStorage.removeItem(
  "globalblamp_unlicensed_login_at"
);

const modelChanged =
  model !== currentModel;

/*
  The API key has already been securely
  linked and encrypted by the Worker.

  Do not keep the raw gk key in the
  browser after a successful save.
*/

currentApiKey = "";
currentModel = model;

apiKeyInput.value = "";

localStorage.removeItem(
  "globalblamp_api_key"
);

localStorage.setItem(
  "globalblamp_model",
  currentModel
);

if (accountChanged) {
  resetToNewChat();

  try {
    const chats = await loadChats();

    if (chats.length > 0) {
      await openSavedChat(chats[0]);
    }
  } catch (error) {
    console.error(
      "Could not load chats after account switch:",
      error
    );
  }

  closeSettings();
  return;
}
    
if (modelChanged && currentChatId) {
  resetToNewChat();

  try {
    await loadChats();
  } catch (error) {
    console.error(
      "Could not refresh chats after model change:",
      error
    );
  }
}

closeSettings();

  } catch (error) {
    alert(error.message);

    apiKeyInput.value = "";

  } finally {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.textContent = "Save Settings";
  }
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

async function loadChats() {
  const response = await fetch(
    `${HISTORY_API}/chats`,
    {
      method: "GET",

      headers: {
        "Authorization":
          `Bearer ${getHistoryAuthToken()}`
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || "Could not load chats"
    );
  }

  const chats = Array.isArray(data?.chats)
    ? data.chats
    : [];

  renderChatList(chats);

  return chats;
}

function renderChatList(chats) {
  chatList.innerHTML = "";

  if (!chats.length) {
    const empty = document.createElement("div");

    empty.className = "history-empty";
    empty.textContent = "No chats yet.";

    chatList.appendChild(empty);

    return;
  }

  chats.forEach((chat) => {
    const button =
      document.createElement("button");

    button.className =
      "chat-list-item";

    if (chat.id === currentChatId) {
      button.classList.add("active");
    }


    const title =
      document.createElement("div");

    title.className =
      "chat-list-title";

    title.textContent =
      chat.title || "New Chat";


    const meta =
      document.createElement("div");

    meta.className =
      "chat-list-meta";

    meta.textContent =
      chat.model || "";


button.appendChild(title);
button.appendChild(meta);


const deleteBtn =
  document.createElement("button");

deleteBtn.className =
  "chat-delete-button";

deleteBtn.textContent = "Delete";


deleteBtn.addEventListener(
  "click",
  async (event) => {
    event.stopPropagation();

    const confirmed = confirm(
      `Delete "${chat.title || "New Chat"}"?`
    );

    if (!confirmed) {
      return;
    }

    deleteBtn.disabled = true;

    try {
      await deleteCloudChat(chat.id);

if (currentChatId === chat.id) {
  resetToNewChat();
}

      await loadChats();

    } catch (error) {
      console.error(
        "Could not delete chat:",
        error
      );

      alert(
        error.message ||
        "Could not delete chat"
      );

    } finally {
      deleteBtn.disabled = false;
    }
  }
);

button.addEventListener(
  "click",
  async () => {
    button.disabled = true;

    try {
      await openSavedChat(chat);

    } catch (error) {
      console.error(
        "Could not open chat:",
        error
      );

      alert(
        error.message ||
        "Could not open chat"
      );

    } finally {
      button.disabled = false;
    }
  }
);

const row =
  document.createElement("div");

row.className =
  "chat-list-row";

row.appendChild(button);
row.appendChild(deleteBtn);

chatList.appendChild(row);
    
  });
}

async function loadCloudMessages(chatId) {
  const response = await fetch(
    `${HISTORY_API}/messages/${chatId}`,
    {
      method: "GET",

      headers: {
        "Authorization":
          `Bearer ${getHistoryAuthToken()}`
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || "Could not load messages"
    );
  }

  const savedMessages =
    Array.isArray(data?.messages)
      ? data.messages
      : [];

  return savedMessages;
}

async function openSavedChat(chat) {
  const savedMessages =
    await loadCloudMessages(chat.id);

currentChatId = chat.id;

setCurrentChatTitle(
  chat.title || "New Chat"
);

currentModel =
  chat.model || currentModel;

  localStorage.setItem(
    "globalblamp_model",
    currentModel
  );

  modelSelect.value = currentModel;

  messages = savedMessages.map(
    (message) => ({
      role: message.role,
      content: message.content
    })
  );


  chatArea.innerHTML = "";

if (!messages.length) {
  const welcomeMessage =
    document.createElement("div");

  welcomeMessage.className =
    "welcome-message";


  const title =
    document.createElement("h2");

  title.textContent =
    chat.title || "New Chat";


  const description =
    document.createElement("p");

  description.textContent =
    "Start chatting.";


  welcomeMessage.appendChild(title);
  welcomeMessage.appendChild(description);

  chatArea.appendChild(welcomeMessage);

} else {

    messages.forEach((message) => {
      addMessage(
        message.role,
        message.content
      );
    });
  }


  try {
    await loadChats();

  } catch (error) {
    console.error(
      "Could not refresh chat list:",
      error
    );
  }


  closeHistory();

  messageInput.focus();
}

async function deleteCloudChat(chatId) {
  const response = await fetch(
    `${HISTORY_API}/chats/${chatId}`,
    {
      method: "DELETE",

      headers: {
        "Authorization":
          `Bearer ${getHistoryAuthToken()}`
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || "Could not delete chat"
    );
  }

  return true;
}

function makeChatTitle(text) {
  const cleanTitle =
    text
      .replace(/\s+/g, " ")
      .trim();

  if (!cleanTitle) {
    return "New Chat";
  }

  return cleanTitle.slice(0, 60);
}

async function createCloudChat(firstMessage) {
  const response = await fetch(
    `${HISTORY_API}/chats`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${getHistoryAuthToken()}`
      },

      body: JSON.stringify({
        title: makeChatTitle(firstMessage),
        model: currentModel
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
    throw new Error(
      data?.error || "Could not create chat"
    );
  }

currentChatId = data.chat.id;

setCurrentChatTitle(
  data.chat.title || makeChatTitle(firstMessage)
);

try {
  await loadChats();
} catch (error) {
  console.error(
    "Could not refresh chat list:",
    error
  );
}

return data.chat;
}

async function saveCloudMessage(role, content) {
  if (!currentChatId) {
    throw new Error("No active chat");
  }

  const response = await fetch(
    `${HISTORY_API}/messages`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${getHistoryAuthToken()}`
      },

      body: JSON.stringify({
        chat_id: currentChatId,
        role: role,
        content: content
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
    throw new Error(
      data?.error || "Could not save message"
    );
  }

  return true;
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

  if (!currentSessionToken) {
    alert(
      "Please sign in with Telegram first."
    );
    return;
  }

  messageInput.value = "";
  resizeTextarea();


try {
  if (!currentChatId) {
    await createCloudChat(userText);
  }

} catch (error) {
    alert(error.message);
    return;
  }


  addMessage("user", userText);


  messages.push({
    role: "user",
    content: userText
  });


  try {
    await saveCloudMessage(
      "user",
      userText
    );

  } catch (error) {
    console.error(
      "Could not save user message:",
      error
    );
  }


  setLoading(true);


  const assistantBubble = addMessage(
    "assistant",
    "Thinking..."
  );


try {
  const response = await fetch(
    "/api/chat",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "Authorization":
          `Bearer ${currentSessionToken}`
      },

      body: JSON.stringify({
        model: currentModel,
        messages: messages
      })
    }
  );


  if (!response.ok) {
    let errorMessage =
      `API Error ${response.status}`;

    try {
      const errorData =
        await response.json();

      if (errorData?.error?.message) {
        errorMessage =
          errorData.error.message;
      }

    } catch {
      try {
        const errorText =
          await response.text();

        if (errorText) {
          errorMessage = errorText;
        }

      } catch {
        // Keep the normal API error.
      }
    }

    throw new Error(errorMessage);
  }


  if (!response.body) {
    throw new Error(
      "Streaming response is unavailable."
    );
  }


  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();


  let assistantText = "";
  let buffer = "";


  assistantBubble.textContent = "";


  while (true) {
    const {
      done,
      value
    } = await reader.read();


    if (done) {
      break;
    }


    buffer += decoder.decode(
      value,
      {
        stream: true
      }
    );


    const lines =
      buffer.split("\n");


    buffer = lines.pop() || "";


    for (const rawLine of lines) {
      const line =
        rawLine.trim();


      if (!line.startsWith("data:")) {
        continue;
      }


      const dataText =
        line.slice(5).trim();


      if (!dataText) {
        continue;
      }


      if (dataText === "[DONE]") {
        continue;
      }


      let chunkData;

      try {
        chunkData =
          JSON.parse(dataText);
      } catch {
        continue;
      }


      const chunk =
        chunkData?.choices?.[0]?.delta?.content;


      if (!chunk) {
        continue;
      }


      assistantText += chunk;

      assistantBubble.textContent =
        assistantText;


      chatArea.scrollTop =
        chatArea.scrollHeight;
    }
  }


  /*
    Flush any remaining decoder data.
  */

  buffer += decoder.decode();


  if (buffer.trim()) {
    const remainingLines =
      buffer.split("\n");


    for (const rawLine of remainingLines) {
      const line =
        rawLine.trim();


      if (!line.startsWith("data:")) {
        continue;
      }


      const dataText =
        line.slice(5).trim();


      if (
        !dataText ||
        dataText === "[DONE]"
      ) {
        continue;
      }


      try {
        const chunkData =
          JSON.parse(dataText);

        const chunk =
          chunkData?.choices?.[0]?.delta?.content;


        if (chunk) {
          assistantText += chunk;

          assistantBubble.textContent =
            assistantText;
        }

      } catch {
        // Ignore incomplete final SSE data.
      }
    }
  }


  if (!assistantText) {
    throw new Error(
      "The API returned an empty response."
    );
  }


  messages.push({
    role: "assistant",
    content: assistantText
  });


  try {
    await saveCloudMessage(
      "assistant",
      assistantText
    );

  } catch (error) {
    console.error(
      "Could not save assistant message:",
      error
    );
  }


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

historyBtn.addEventListener(
  "click",
  async () => {
    openHistory();

    try {
      await loadChats();

    } catch (error) {
      console.error(
        "Could not load chats:",
        error
      );
    }
  }
);


closeHistoryBtn.addEventListener(
  "click",
  closeHistory
);


historyBackdrop.addEventListener(
  "click",
  closeHistory
);

newChatBtn.addEventListener(
  "click",
  () => {
    resetToNewChat();

    closeHistory();

    messageInput.focus();
  }
);

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

logoutBtn.addEventListener(
  "click",
  logout
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


async function startApp() {
  setupTelegramLogin();

  loadSettings();


  /*
    TELEGRAM ACCOUNT MODE

    Telegram is now the permanent
    website identity.

    If a Telegram session exists,
    always try to restore it first.
  */

  if (currentSessionToken) {
    try {
      const response =
        await fetch(
          `${HISTORY_API}/auth/session`,
          {
            method: "GET",

            headers: {
              "Authorization":
                `Bearer ${currentSessionToken}`
            }
          }
        );


      /*
        The stored Telegram session
        is no longer valid.
      */

if (response.status === 401) {
  localStorage.removeItem(
    "globalblamp_session_token"
  );

  localStorage.removeItem(
    "globalblamp_telegram_user"
  );

  localStorage.removeItem(
    "globalblamp_unlicensed_login_at"
  );

  localStorage.removeItem(
    "globalblamp_api_key"
  );


  currentSessionToken = "";
  currentApiKey = "";

  apiKeyInput.value = "";


  showLogin();
  return;
}

      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Could not restore Telegram session"
        );
      }


      /*
        Refresh the locally cached
        Telegram profile.
      */

      if (data.user) {
        localStorage.setItem(
          "globalblamp_telegram_user",
          JSON.stringify(data.user)
        );
      }


      /*
        The Telegram account currently
        has an active approved API.
      */

      if (data.api_access?.active) {
        localStorage.removeItem(
          "globalblamp_unlicensed_login_at"
        );


        showChat();


        try {
          await loadChats();
        } catch (error) {
          console.error(
            "Could not load chats:",
            error
          );
        }


/*
  The server already has this Telegram
  user's approved API credential stored
  securely.

  The browser does not need the raw
  gk key anymore.
*/


        return;
      }


/*
  Telegram session itself is valid.

  An API being missing, disabled,
  expired or unavailable must NOT
  log the Telegram account out.
*/

showChat();
openSettings();
return;


    } catch (error) {
      console.error(
        "Telegram session restore failed:",
        error
      );


      /*
        A temporary network/Worker error
        should not erase the saved login.

        Keep the stored Telegram session
        so another refresh can retry it.
      */

      showChat();
      return;
    }
  }


  /*
    Telegram is now required as the
    permanent website identity.

    A saved API key by itself must
    never restore chat/history access.
  */

  showLogin();
  return;
}

function setupTelegramLogin() {
  if (
    !window.Telegram ||
    !window.Telegram.Login
  ) {
    console.error(
      "Telegram Login library did not load."
    );

    return;
  }


  Telegram.Login.init(
    {
      client_id: 8741110567,
      scope: ["profile"],
      lang: "en"
    },

    handleTelegramOidcResult
  );


  telegramLoginBtn.addEventListener(
    "click",
    () => {
      Telegram.Login.open();
    }
  );
}


startApp();
