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

const toggleApiKeyBtn =
  document.getElementById(
    "toggleApiKeyBtn"
  );


const settingsStatus =
  document.getElementById(
    "settingsStatus"
  );


const confirmModal =
  document.getElementById(
    "confirmModal"
  );

const confirmTitle =
  document.getElementById(
    "confirmTitle"
  );

const confirmMessage =
  document.getElementById(
    "confirmMessage"
  );

const confirmCancelBtn =
  document.getElementById(
    "confirmCancelBtn"
  );

const confirmAcceptBtn =
  document.getElementById(
    "confirmAcceptBtn"
  );


const appToast =
  document.getElementById(
    "appToast"
  );

const modelSelect = document.getElementById("modelSelect");
const headerModelSelect =
  document.getElementById(
    "headerModelSelect"
  );

const themeToggleBtn =
  document.getElementById(
    "themeToggleBtn"
  );
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
const chatSearchInput =
  document.getElementById(
    "chatSearchInput"
  );
const chatList =
  document.getElementById("chatList");

const currentChatTitle =
  document.getElementById("currentChatTitle");

const chatMenuBtn =
  document.getElementById(
    "chatMenuBtn"
  );

const chatMenu =
  document.getElementById(
    "chatMenu"
  );

const renameChatBtn =
  document.getElementById(
    "renameChatBtn"
  );

const deleteCurrentChatBtn =
  document.getElementById(
    "deleteCurrentChatBtn"
  );


const renameChatModal =
  document.getElementById(
    "renameChatModal"
  );

const renameChatInput =
  document.getElementById(
    "renameChatInput"
  );

const saveRenameChatBtn =
  document.getElementById(
    "saveRenameChatBtn"
  );

const cancelRenameChatBtn =
  document.getElementById(
    "cancelRenameChatBtn"
  );

const closeRenameChatBtn =
  document.getElementById(
    "closeRenameChatBtn"
  );

const sidebarProfileBtn =
  document.getElementById(
    "sidebarProfileBtn"
  );

const sidebarProfileAvatar =
  document.getElementById(
    "sidebarProfileAvatar"
  );

const sidebarProfileName =
  document.getElementById(
    "sidebarProfileName"
  );

const sidebarProfileUsername =
  document.getElementById(
    "sidebarProfileUsername"
  );


const profileModal =
  document.getElementById(
    "profileModal"
  );

const closeProfileBtn =
  document.getElementById(
    "closeProfileBtn"
  );

const cancelProfileBtn =
  document.getElementById(
    "cancelProfileBtn"
  );

const saveProfileBtn =
  document.getElementById(
    "saveProfileBtn"
  );

const profileDisplayNameInput =
  document.getElementById(
    "profileDisplayNameInput"
  );

const profileEditorAvatar =
  document.getElementById(
    "profileEditorAvatar"
  );

const profileTelegramUsername =
  document.getElementById(
    "profileTelegramUsername"
  );

const changeProfilePhotoBtn =
  document.getElementById(
    "changeProfilePhotoBtn"
  );

const removeProfilePhotoBtn =
  document.getElementById(
    "removeProfilePhotoBtn"
  );

const profilePhotoInput =
  document.getElementById(
    "profilePhotoInput"
  );

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const scrollToLatestBtn =
  document.getElementById(
    "scrollToLatestBtn"
  );

let cachedChats = [];

let messages = [];
let currentChatId = null;
let activeChatController = null;

let isGenerating = false;
let sendInFlight = false;

let hasActiveApi = false;


const DRAFT_STORAGE_KEY =
  "globalblamp_message_draft";


function saveMessageDraft() {
  const draft =
    messageInput.value;


  if (draft) {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      draft
    );

  } else {
    sessionStorage.removeItem(
      DRAFT_STORAGE_KEY
    );
  }
}


function restoreMessageDraft() {
  const draft =
    sessionStorage.getItem(
      DRAFT_STORAGE_KEY
    ) || "";


  messageInput.value =
    draft;


  resizeTextarea();
  updateSendButtonState();
}


function clearMessageDraft() {
  sessionStorage.removeItem(
    DRAFT_STORAGE_KEY
  );
}

let currentModel =
  localStorage.getItem(
    "globalblamp_model"
  ) || "gpt-5.6-sol";
function setupHeaderModelPicker() {
  if (
    !headerModelSelect ||
    !modelSelect
  ) {
    return;
  }


  /*
    Settings owns the model list.

    Copy the same options into
    the top-bar picker so we do not
    maintain two separate model lists.
  */

  headerModelSelect.innerHTML =
    modelSelect.innerHTML;


  headerModelSelect.value =
    currentModel;


  modelSelect.value =
    currentModel;
}


function setSelectedModel(model) {
  if (!model) {
    return;
  }


  const modelChanged =
    model !== currentModel;


  currentModel = model;


  localStorage.setItem(
    "globalblamp_model",
    currentModel
  );


  if (modelSelect) {
    modelSelect.value =
      currentModel;
  }


  if (headerModelSelect) {
    headerModelSelect.value =
      currentModel;
  }


  /*
    A saved conversation keeps
    the model it was created with.

    Changing models therefore starts
    a fresh conversation.
  */

  if (
    modelChanged &&
    currentChatId
  ) {
    resetToNewChat();
  }
}

const PROFILE_NAME_STORAGE_KEY =
  "globalblamp_profile_display_name";
const PROFILE_PHOTO_STORAGE_KEY =
  "globalblamp_profile_photo";


let pendingProfilePhoto = null;

function getCachedTelegramUser() {
  try {
    const raw =
      localStorage.getItem(
        "globalblamp_telegram_user"
      );

    return raw
      ? JSON.parse(raw)
      : null;

  } catch {
    return null;
  }
}


function getTelegramDefaultName(user) {
  const firstName =
    typeof user?.first_name === "string"
      ? user.first_name.trim()
      : "";

  const lastName =
    typeof user?.last_name === "string"
      ? user.last_name.trim()
      : "";


  const fullName =
    `${firstName} ${lastName}`
      .replace(/\s+/g, " ")
      .trim();


  if (fullName) {
    return fullName;
  }


  if (
    typeof user?.username === "string" &&
    user.username.trim()
  ) {
    return user.username.trim();
  }


  return "User";
}


function getProfileDisplayName() {
  const customName =
    localStorage
      .getItem(
        PROFILE_NAME_STORAGE_KEY
      )
      ?.trim() || "";


  if (customName) {
    return customName;
  }


  return getTelegramDefaultName(
    getCachedTelegramUser()
  );
}


function getProfileUsername() {
  const user =
    getCachedTelegramUser();


  if (
    typeof user?.username === "string" &&
    user.username.trim()
  ) {
    return `@${user.username.trim()}`;
  }


  return "Telegram account";
}


function makeProfileInitials(name) {
  const words =
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (!words.length) {
    return "U";
  }


  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }


  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();
}

function getProfilePhoto() {
  return (
    localStorage.getItem(
      PROFILE_PHOTO_STORAGE_KEY
    ) || ""
  );
}


function applyProfileAvatar(
  element,
  photo,
  initials
) {
  if (!element) {
    return;
  }


  if (photo) {
    element.style.backgroundImage =
      `url("${photo}")`;

    element.classList.add(
      "has-photo"
    );

    element.textContent = "";

    return;
  }


  element.style.backgroundImage =
    "";

  element.classList.remove(
    "has-photo"
  );

  element.textContent =
    initials;
}


function renderProfileEditorPhoto(
  photo
) {
  const initials =
    makeProfileInitials(
      getProfileDisplayName()
    );


  applyProfileAvatar(
    profileEditorAvatar,
    photo,
    initials
  );


  removeProfilePhotoBtn.disabled =
    !photo;
}


function resizeProfilePhoto(file) {
  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onerror =
        () => {
          reject(
            new Error(
              "Could not read this image."
            )
          );
        };


      reader.onload =
        () => {
          const image =
            new Image();


          image.onerror =
            () => {
              reject(
                new Error(
                  "This image could not be opened."
                )
              );
            };


          image.onload =
            () => {
              const size = 256;

              const canvas =
                document.createElement(
                  "canvas"
                );

              canvas.width = size;
              canvas.height = size;


              const context =
                canvas.getContext("2d");


              if (!context) {
                reject(
                  new Error(
                    "Could not prepare profile photo."
                  )
                );

                return;
              }


              const sourceSize =
                Math.min(
                  image.width,
                  image.height
                );


              const sourceX =
                (
                  image.width -
                  sourceSize
                ) / 2;

              const sourceY =
                (
                  image.height -
                  sourceSize
                ) / 2;


              context.drawImage(
                image,
                sourceX,
                sourceY,
                sourceSize,
                sourceSize,
                0,
                0,
                size,
                size
              );


              resolve(
                canvas.toDataURL(
                  "image/jpeg",
                  0.86
                )
              );
            };


          image.src =
            reader.result;
        };


      reader.readAsDataURL(
        file
      );
    }
  );
}

function renderProfile() {
  const displayName =
    getProfileDisplayName();

  const username =
    getProfileUsername();

  const initials =
    makeProfileInitials(
      displayName
    );

  const photo =
    getProfilePhoto();


  sidebarProfileName.textContent =
    displayName;

  sidebarProfileUsername.textContent =
    username;

  profileTelegramUsername.textContent =
    username;


  applyProfileAvatar(
    sidebarProfileAvatar,
    photo,
    initials
  );


  applyProfileAvatar(
    profileEditorAvatar,
    photo,
    initials
  );
}

function openProfileModal() {
  renderProfile();


  profileDisplayNameInput.value =
    getProfileDisplayName();


  pendingProfilePhoto =
    getProfilePhoto();


  renderProfileEditorPhoto(
    pendingProfilePhoto
  );


  profilePhotoInput.value = "";


  profileModal.classList.remove(
    "hidden"
  );


  profileDisplayNameInput.focus();
  profileDisplayNameInput.select();
}


function closeProfileModal() {
  profileModal.classList.add(
    "hidden"
  );
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

      <h2>
        How can I help?
      </h2>

      <p>
        Start a conversation with GlobalBLAMP AI.
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
      "/api/auth/telegram",
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

localStorage.setItem(
  "globalblamp_telegram_user",
  JSON.stringify(data.user)
);
renderProfile();

setLoginMessage(
  "Telegram login successful.",
  "success"
);

hasActiveApi =
  data.api_access?.active === true;

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

  apiKeyInput.placeholder =
    hasActiveApi
      ? "API connected — paste a new gk key only to replace it"
      : "Enter your gk API key";

modelSelect.value =
  currentModel;

headerModelSelect.value =
  currentModel;
}

function isDesktopLayout() {
  return window.matchMedia(
    "(min-width: 900px)"
  ).matches;
}


function openHistory() {
  if (isDesktopLayout()) {
    chatApp.classList.remove(
      "sidebar-collapsed"
    );

    return;
  }


  historyBackdrop.classList.remove(
    "hidden"
  );

  historyPanel.classList.remove(
    "hidden"
  );
}


function closeHistory() {
  if (isDesktopLayout()) {
    chatApp.classList.add(
      "sidebar-collapsed"
    );

    return;
  }


  historyBackdrop.classList.add(
    "hidden"
  );

  historyPanel.classList.add(
    "hidden"
  );
}


function toggleHistory() {
  if (isDesktopLayout()) {
    chatApp.classList.toggle(
      "sidebar-collapsed"
    );

    return;
  }


  const isOpen =
    !historyPanel.classList.contains(
      "hidden"
    );


  if (isOpen) {
    closeHistory();

  } else {
    openHistory();
  }
}

let toastTimer = null;


function showSettingsStatus(
  message,
  type = "success"
) {
  if (!settingsStatus) {
    return;
  }


  settingsStatus.textContent =
    message;

  settingsStatus.classList.remove(
    "hidden",
    "success",
    "error"
  );

  settingsStatus.classList.add(
    type
  );
}


function clearSettingsStatus() {
  if (!settingsStatus) {
    return;
  }


  settingsStatus.textContent = "";

  settingsStatus.classList.add(
    "hidden"
  );

  settingsStatus.classList.remove(
    "success",
    "error"
  );
}


function showToast(
  message,
  type = "normal"
) {
  if (!appToast) {
    return;
  }


  if (toastTimer) {
    clearTimeout(toastTimer);
  }


  appToast.textContent =
    message;

  appToast.classList.remove(
    "hidden",
    "error",
    "success"
  );


  if (
    type === "error" ||
    type === "success"
  ) {
    appToast.classList.add(type);
  }


  toastTimer = setTimeout(
    () => {
      appToast.classList.add(
        "hidden"
      );
    },
    2800
  );
}


function askConfirmation({
  title = "Confirm",
  message = "",
  confirmText = "Confirm",
  danger = false
}) {
  return new Promise(
    (resolve) => {

      confirmTitle.textContent =
        title;

      confirmMessage.textContent =
        message;

      confirmAcceptBtn.textContent =
        confirmText;


      confirmAcceptBtn.classList.toggle(
        "danger-button",
        danger
      );

      confirmAcceptBtn.classList.toggle(
        "primary-confirm-button",
        !danger
      );


      confirmModal.classList.remove(
        "hidden"
      );


      const finish =
        (result) => {
          confirmModal.classList.add(
            "hidden"
          );


          confirmAcceptBtn.onclick =
            null;

          confirmCancelBtn.onclick =
            null;


          resolve(result);
        };


      confirmAcceptBtn.onclick =
        () => finish(true);


      confirmCancelBtn.onclick =
        () => finish(false);
    }
  );
}

function openSettings() {
  loadSettings();

  clearSettingsStatus();

  apiKeyInput.type =
    "password";

  toggleApiKeyBtn.textContent =
    "Show";

  toggleApiKeyBtn.setAttribute(
    "aria-label",
    "Show API key"
  );

  settingsModal.classList.remove(
    "hidden"
  );
}


function closeSettings() {
  settingsModal.classList.add("hidden");
}

async function logout() {
  await settleActiveSendBeforeNavigation();


  try {
    await fetch(
      "/api/auth/logout",
      {
        method: "POST"
      }
    );

  } catch (error) {
    console.error(
      "Logout request failed:",
      error
    );
  }


  /*
    Remove old browser-side leftovers.

    The real Telegram session now lives
    only in the HttpOnly cookie.
  */

  localStorage.removeItem(
    "globalblamp_session_token"
  );

  localStorage.removeItem(
    "globalblamp_api_key"
  );

  localStorage.removeItem(
    "globalblamp_telegram_user"
  );

  localStorage.removeItem(
    "globalblamp_unlicensed_login_at"
  );


hasActiveApi = false;

apiKeyInput.value = "";


clearMessageDraft();

messageInput.value = "";

resizeTextarea();

updateSendButtonState();


resetToNewChat();

  closeSettings();
  closeHistory();

  showLogin();

  setLoginMessage("");
}
async function saveSettings() {
  await settleActiveSendBeforeNavigation();


  const apiKey =
    apiKeyInput.value.trim();

  const model =
    modelSelect.value;
  
/*
  If no API is connected yet,
  the user must provide one.

  If an API is already connected,
  leaving this field empty means
  "keep my current API".
*/

if (!apiKey && !hasActiveApi) {
  showSettingsStatus(
    "Please enter your API key.",
    "error"
  );

  return;
}

if (
  apiKey &&
  !apiKey.startsWith("gk-")
) {
  showSettingsStatus(
    "Your API key should start with gk-",
    "error"
  );

  return;
}

/*
  If an API is already connected and the
  user entered another key, require an
  explicit confirmation before replacement.
*/

if (hasActiveApi && apiKey) {

  const confirmed =
    await askConfirmation({
      title:
        "Replace API key?",

      message:
        "Your currently connected API will be replaced with this new API key.",

      confirmText:
        "Replace",

      danger: true
    });


  if (!confirmed) {
    return;
  }
}

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.textContent = "Checking...";

try {
  let accountChanged = false;


  /*
    Only contact link-api when the user
    actually entered a key.

    An empty field while hasActiveApi is
    true means: keep the current API.
  */

  if (apiKey) {
    const response = await fetch(
      "/api/account/link-api",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
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


    /*
      The Worker is the source of truth
      for whether the API really changed.
    */

    accountChanged =
      data?.already_linked !== true;

    hasActiveApi = true;
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

currentModel = model;

modelSelect.value =
  currentModel;

headerModelSelect.value =
  currentModel;

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

showToast(
  "API connected.",
  "success"
);

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

showToast(
  "Settings saved.",
  "success"
);

closeSettings();

} catch (error) {

  showSettingsStatus(
    error.message ||
      "Could not save settings.",
    "error"
  );

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


function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function renderMarkdown(text) {
  const escaped =
    escapeHtml(text);


  /*
    Protect fenced code blocks first.
  */

  const codeBlocks = [];


  let html = escaped.replace(
    /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g,
    (match, language, code) => {
      const index =
        codeBlocks.length;


      const safeLanguage =
        escapeHtml(
          language || "code"
        );


      const safeCode =
        code.replace(
          /\n$/,
          ""
        );


      codeBlocks.push(`
        <div class="code-block">

          <div class="code-header">

            <span class="code-language">
              ${safeLanguage}
            </span>

            <button
              class="copy-code-button"
              type="button"
            >
              Copy
            </button>

          </div>

          <pre><code>${safeCode}</code></pre>

        </div>
      `);


      return `@@CODEBLOCK_${index}@@`;
    }
  );


  const blocks =
    html
      .split(/\n{2,}/)
      .map(
        (block) => block.trim()
      )
      .filter(Boolean);


  html = blocks.map(
    (block) => {

      /*
        Standalone code block.
      */

      if (
        /^@@CODEBLOCK_\d+@@$/.test(
          block
        )
      ) {
        return block;
      }


      /*
        Headings.
      */

      if (
        block.startsWith("### ")
      ) {
        return `
          <h3>
            ${formatInlineMarkdown(
              block.slice(4)
            )}
          </h3>
        `;
      }


      if (
        block.startsWith("## ")
      ) {
        return `
          <h2>
            ${formatInlineMarkdown(
              block.slice(3)
            )}
          </h2>
        `;
      }


      if (
        block.startsWith("# ")
      ) {
        return `
          <h1>
            ${formatInlineMarkdown(
              block.slice(2)
            )}
          </h1>
        `;
      }


      /*
        Blockquote.
      */

      if (
        block.startsWith("> ")
      ) {
        const quote =
          block
            .split("\n")
            .map(
              (line) =>
                line.replace(
                  /^>\s?/,
                  ""
                )
            )
            .join("<br>");


        return `
          <blockquote>
            ${formatInlineMarkdown(
              quote
            )}
          </blockquote>
        `;
      }


      /*
        Bulleted list.
      */

      const lines =
        block.split("\n");


      if (
        lines.every(
          (line) =>
            /^[-*]\s+/.test(line)
        )
      ) {
        const items =
          lines
            .map(
              (line) => `
                <li>
                  ${formatInlineMarkdown(
                    line.replace(
                      /^[-*]\s+/,
                      ""
                    )
                  )}
                </li>
              `
            )
            .join("");


        return `
          <ul class="markdown-list">
            ${items}
          </ul>
        `;
      }


      /*
        Numbered list.
      */

      if (
        lines.every(
          (line) =>
            /^\d+\.\s+/.test(line)
        )
      ) {
        const items =
          lines
            .map(
              (line) => `
                <li>
                  ${formatInlineMarkdown(
                    line.replace(
                      /^\d+\.\s+/,
                      ""
                    )
                  )}
                </li>
              `
            )
            .join("");


        return `
          <ol class="markdown-list">
            ${items}
          </ol>
        `;
      }


      /*
        Normal paragraph.
      */

      return `
        <p>
          ${formatInlineMarkdown(
            block.replace(
              /\n/g,
              "<br>"
            )
          )}
        </p>
      `;
    }
  ).join("");


  /*
    Restore fenced code blocks.
  */

  html = html.replace(
    /@@CODEBLOCK_(\d+)@@/g,
    (match, index) =>
      codeBlocks[
        Number(index)
      ] || ""
  );


  return html;
}


function formatInlineMarkdown(text) {
  let html =
    String(text);


  html = html.replace(
    /`([^`\n]+)`/g,
    "<code class=\"inline-code\">$1</code>"
  );


  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>"
  );


  html = html.replace(
    /\*([^*\n]+)\*/g,
    "<em>$1</em>"
  );


  return html;
}


function setupCopyButtons(container) {
  const buttons =
    container.querySelectorAll(
      ".copy-code-button"
    );


  buttons.forEach((button) => {
    button.addEventListener(
      "click",
      async () => {
        const code =
          button
            .closest(".code-block")
            ?.querySelector("code")
            ?.textContent || "";


        try {
          await navigator.clipboard.writeText(
            code
          );

          button.textContent = "Copied";

          setTimeout(
            () => {
              button.textContent = "Copy";
            },
            1200
          );

        } catch {
          button.textContent = "Failed";

          setTimeout(
            () => {
              button.textContent = "Copy";
            },
            1200
          );
        }
      }
    );
  });
}


function renderMessageContent(
  bubble,
  content,
  role,
  isError = false
) {
bubble.dataset.rawContent =
  String(content);


if (isError || role === "user") {
  bubble.textContent = content;
  return;
}


  bubble.innerHTML =
    renderMarkdown(content);


  setupCopyButtons(bubble);
}

function addAssistantRetryAction(
  assistantBubble,
  retryContext
) {
  const messageWrapper =
    assistantBubble.closest(
      ".message.assistant"
    );


  const actions =
    messageWrapper?.querySelector(
      ".message-actions"
    );


  if (!actions) {
    return;
  }


  actions
    .querySelector(
      ".retry-assistant-button"
    )
    ?.remove();


  const retryBtn =
    document.createElement(
      "button"
    );


  retryBtn.type = "button";

  retryBtn.className =
    "message-action-button retry-assistant-button";

  retryBtn.textContent =
    "Retry";


  retryBtn.addEventListener(
    "click",
    async () => {
      const lastMessage =
        messages[
          messages.length - 1
        ];


      const stillRetryable =
        currentChatId ===
          retryContext.chatId &&
        messages.length ===
          retryContext.messageCount &&
        lastMessage?.role ===
          "user" &&
        lastMessage?.content ===
          retryContext.userText &&
        !sendInFlight;


      if (!stillRetryable) {
        retryBtn.remove();

        showToast(
          "This response can no longer be retried.",
          "error"
        );

        return;
      }


      retryBtn.remove();


      await sendMessage({
        retryLastUser: true,
        retryBubble:
          assistantBubble,
        retryContext
      });
    }
  );


  actions.appendChild(
    retryBtn
  );
}



function addMessage(role, content, isError = false) {
  removeWelcomeMessage();

  const messageWrapper =
    document.createElement("div");

  messageWrapper.className =
    `message ${role}`;


  const roleLabel =
    document.createElement("div");

  roleLabel.className =
    "message-role";

  roleLabel.textContent =
    role === "user"
      ? "You"
      : currentModel;


  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";


  if (isError) {
    bubble.classList.add(
      "error-message"
    );
  }


  renderMessageContent(
    bubble,
    content,
    role,
    isError
  );


  messageWrapper.appendChild(
    roleLabel
  );

messageWrapper.appendChild(
  bubble
);


if (
  role === "assistant" &&
  !isError
) {
  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "message-actions";


  const copyBtn =
    document.createElement(
      "button"
    );

  copyBtn.type = "button";

  copyBtn.className =
    "message-action-button";

  copyBtn.textContent =
    "Copy";


  copyBtn.addEventListener(
    "click",
    async () => {
      try {
        await navigator.clipboard.writeText(
          bubble.dataset.rawContent ||
            content
        );

        copyBtn.textContent =
          "Copied";

        setTimeout(
          () => {
            copyBtn.textContent =
              "Copy";
          },
          1200
        );

      } catch {
        copyBtn.textContent =
          "Failed";
      }
    }
  );

  actions.appendChild(
    copyBtn
  );

  messageWrapper.appendChild(
    actions
  );
}


chatArea.appendChild(
  messageWrapper
);


  chatArea.scrollTop =
    chatArea.scrollHeight;


  return bubble;
}

async function loadChats() {
const response = await fetch(
  "/api/history/chats",
  {
    method: "GET"
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

cachedChats = chats;

filterChatList();

return chats;
}

function filterChatList() {
  const query =
    chatSearchInput
      ?.value
      .trim()
      .toLowerCase() || "";


  if (!query) {
    renderChatList(
      cachedChats
    );

    return;
  }


  const filteredChats =
    cachedChats.filter(
      (chat) => {
        const title =
          String(
            chat.title || ""
          ).toLowerCase();


        const model =
          String(
            chat.model || ""
          ).toLowerCase();


        return (
          title.includes(query) ||
          model.includes(query)
        );
      }
    );


  if (!filteredChats.length) {
    chatList.innerHTML = "";

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "history-empty";

    empty.textContent =
      "No matching chats.";

    chatList.appendChild(
      empty
    );

    return;
  }


  renderChatList(
    filteredChats
  );
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

const confirmed =
  await askConfirmation({
    title:
      "Delete conversation?",

    message:
      `Delete "${chat.title || "New Chat"}"? This cannot be undone.`,

    confirmText:
      "Delete",

    danger: true
  });


if (!confirmed) {
  return;
}


deleteBtn.disabled = true;


try {
  if (
    currentChatId === chat.id
  ) {
    await settleActiveSendBeforeNavigation();
  }


  await deleteCloudChat(
    chat.id
  );

if (currentChatId === chat.id) {
  resetToNewChat();
}

      await loadChats();

    } catch (error) {
      console.error(
        "Could not delete chat:",
        error
      );

showToast(
  error.message ||
    "Could not delete chat.",
  "error"
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
  await settleActiveSendBeforeNavigation();

  await openSavedChat(chat);

    } catch (error) {
      console.error(
        "Could not open chat:",
        error
      );

showToast(
  error.message ||
    "Could not open chat.",
  "error"
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
    `/api/history/messages?chat_id=${encodeURIComponent(chatId)}`,
    {
      method: "GET"
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

modelSelect.value =
  currentModel;

headerModelSelect.value =
  currentModel;

  messages = savedMessages.map(
    (message) => ({
      role: message.role,
      content: message.content
    })
  );


  chatArea.innerHTML = "";

if (!messages.length) {

  chatArea.innerHTML = `
    <div class="welcome-message">

      <h2>
        ${escapeHtml(
          chat.title || "New Chat"
        )}
      </h2>

      <p>
        Start a conversation with GlobalBLAMP AI.
      </p>

    </div>
  `;


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

async function renameCloudChat(
  chatId,
  title
) {
  const response = await fetch(
    "/api/history/rename-chat",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        chat_id: chatId,
        title
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
        "Could not rename chat"
    );
  }


  return data?.chat || {
    id: chatId,
    title
  };
}

async function deleteCloudChat(chatId) {
  const response = await fetch(
    `/api/history/delete-chat?chat_id=${encodeURIComponent(chatId)}`,
    {
      method: "DELETE"
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
    "/api/history/chats",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
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
    "/api/history/messages",
    {
      method: "POST",

headers: {
  "Content-Type": "application/json"
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

function updateSendButtonState() {
  if (isGenerating) {
    sendBtn.disabled = false;
    return;
  }


  sendBtn.disabled =
    sendInFlight ||
    !messageInput.value.trim();
}



function setLoading(isLoading) {
  isGenerating = isLoading;


  messageInput.disabled =
    isLoading;


  if (isLoading) {
    sendBtn.textContent = "■";

    sendBtn.classList.add(
      "stop-mode"
    );

    sendBtn.setAttribute(
      "aria-label",
      "Stop generating"
    );

  } else {
    sendBtn.innerHTML =
      '<span class="send-arrow"></span>';

    sendBtn.classList.remove(
      "stop-mode"
    );

    sendBtn.setAttribute(
      "aria-label",
      "Send message"
    );
  }


  updateSendButtonState();
}


function stopGenerating() {
  if (
    !isGenerating ||
    !activeChatController
  ) {
    return;
  }


  activeChatController.abort();
}

async function settleActiveSendBeforeNavigation() {
  if (isGenerating) {
    stopGenerating();
  }


  while (sendInFlight) {
    await new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          25
        );
      }
    );
  }
}

async function sendMessage(
  options = {}
) {
  const retryLastUser =
    options.retryLastUser === true;


  const retryBubble =
    options.retryBubble || null;


  const existingRetryContext =
    options.retryContext || null;


  if (sendInFlight) {
    return;
  }


  let userText =
    retryLastUser
      ? String(
          existingRetryContext
            ?.userText || ""
        )
      : messageInput.value.trim();


  if (!userText) {
    return;
  }


  if (retryLastUser) {
    const lastMessage =
      messages[
        messages.length - 1
      ];


    const stillRetryable =
      currentChatId ===
        existingRetryContext
          ?.chatId &&
      messages.length ===
        existingRetryContext
          ?.messageCount &&
      lastMessage?.role ===
        "user" &&
      lastMessage?.content ===
        userText;


    if (!stillRetryable) {
      showToast(
        "This response can no longer be retried.",
        "error"
      );

      return;
    }
  }


  sendInFlight = true;


  if (!retryLastUser) {
    messageInput.value = "";

    messageInput.style.height =
      "auto";

    resizeTextarea();
  }


  updateSendButtonState();


  try {
    if (
      !retryLastUser &&
      !currentChatId
    ) {
      await createCloudChat(
        userText
      );
    }

  } catch (error) {
    sendInFlight = false;


    if (!retryLastUser) {
      messageInput.value =
        userText;

      resizeTextarea();
    }


    updateSendButtonState();


    showToast(
      error.message ||
        "Could not create chat.",
      "error"
    );


    return;
  }


if (!retryLastUser) {
  addMessage(
    "user",
    userText
  );

  clearMessageDraft();
}


if (!retryLastUser) {
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
}


const retryContext =
  retryLastUser
    ? existingRetryContext
    : {
        chatId:
          currentChatId,

        messageCount:
          messages.length,

        userText
      };


setLoading(true);


let assistantBubble;


if (
  retryLastUser &&
  retryBubble
) {
  assistantBubble =
    retryBubble;


  assistantBubble.classList.remove(
    "error-message"
  );


  renderMessageContent(
    assistantBubble,
    "Thinking...",
    "assistant"
  );

} else {
  assistantBubble =
    addMessage(
      "assistant",
      "Thinking..."
    );
}


try {
  activeChatController =
    new AbortController();


  const response = await fetch(
    "/api/chat",
    {
      method: "POST",

headers: {
  "Content-Type": "application/json"
},

      body: JSON.stringify({
        model: currentModel,
        messages: messages
      }),

      signal:
        activeChatController.signal
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


  assistantBubble.innerHTML = "";


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

renderMessageContent(
  assistantBubble,
  assistantText,
  "assistant"
);


      if (isNearChatBottom()) {
        scrollToLatest("auto");
      } else {
        updateScrollToLatestButton();
      }
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

renderMessageContent(
  assistantBubble,
  assistantText,
  "assistant"
);
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

  if (
    error?.name ===
    "AbortError"
  ) {
    if (
      !assistantBubble.textContent.trim()
    ) {
      assistantBubble.textContent =
        "Generation stopped.";
    }

} else {
  renderMessageContent(
    assistantBubble,
    `Error: ${error.message}`,
    "assistant",
    true
  );


  assistantBubble.classList.add(
    "error-message"
  );


  addAssistantRetryAction(
    assistantBubble,
    retryContext
  );


  console.error(error);
}

} finally {

  activeChatController = null;

setLoading(false);

sendInFlight = false;

updateSendButtonState();

messageInput.focus();


  if (isNearChatBottom()) {
    scrollToLatest("auto");
  } else {
    updateScrollToLatestButton();
  }
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

function isNearChatBottom() {
  const distanceFromBottom =
    chatArea.scrollHeight -
    chatArea.scrollTop -
    chatArea.clientHeight;


  return distanceFromBottom < 120;
}


function updateScrollToLatestButton() {
  if (
    !scrollToLatestBtn
  ) {
    return;
  }


  const shouldShow =
    !isNearChatBottom();


  scrollToLatestBtn.classList.toggle(
    "hidden",
    !shouldShow
  );
}


function scrollToLatest(
  behavior = "smooth"
) {
  chatArea.scrollTo({
    top: chatArea.scrollHeight,
    behavior
  });


  scrollToLatestBtn.classList.add(
    "hidden"
  );
}

chatSearchInput.addEventListener(
  "input",
  filterChatList
);

historyBtn.addEventListener(
  "click",
  async () => {
    toggleHistory();

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
  async () => {
    await settleActiveSendBeforeNavigation();


    resetToNewChat();


    chatSearchInput.value =
      "";

    filterChatList();


    closeHistory();

    messageInput.focus();
  }
);
headerModelSelect.addEventListener(
  "change",
  async () => {
    const selectedModel =
      headerModelSelect.value;


    await settleActiveSendBeforeNavigation();


    setSelectedModel(
      selectedModel
    );


    messageInput.focus();
  }
);

function closeChatMenu() {
  chatMenu.classList.add(
    "hidden"
  );

  chatMenuBtn.setAttribute(
    "aria-expanded",
    "false"
  );
}


function toggleChatMenu() {
  const isOpen =
    !chatMenu.classList.contains(
      "hidden"
    );


  if (isOpen) {
    closeChatMenu();

    return;
  }


  chatMenu.classList.remove(
    "hidden"
  );

  chatMenuBtn.setAttribute(
    "aria-expanded",
    "true"
  );
}


function openRenameChatModal() {
  closeChatMenu();


  if (!currentChatId) {
    showToast(
      "Start a conversation first.",
      "error"
    );

    return;
  }


  renameChatInput.value =
    currentChatTitle.textContent.trim();


  renameChatModal.classList.remove(
    "hidden"
  );


  renameChatInput.focus();
  renameChatInput.select();
}


function closeRenameChatModal() {
  renameChatModal.classList.add(
    "hidden"
  );

  renameChatInput.value = "";
}

async function deleteCurrentChat() {
  closeChatMenu();


  if (!currentChatId) {
    showToast(
      "There is no conversation to delete.",
      "error"
    );

    return;
  }


  const chatId =
    currentChatId;

  const chatTitle =
    currentChatTitle.textContent.trim() ||
    "New Chat";


  const confirmed =
    await askConfirmation({
      title:
        "Delete conversation?",

      message:
        `Delete "${chatTitle}"? This cannot be undone.`,

      confirmText:
        "Delete",

      danger: true
    });


  if (!confirmed) {
    return;
  }


  try {
    await settleActiveSendBeforeNavigation();


    await deleteCloudChat(
      chatId
    );


    resetToNewChat();


    await loadChats();


    showToast(
      "Conversation deleted.",
      "success"
    );

  } catch (error) {
    console.error(
      "Could not delete current chat:",
      error
    );


    showToast(
      error.message ||
        "Could not delete chat.",
      "error"
    );
  }
}

function applyTheme(theme) {
  const useLight =
    theme === "light";


  document.body.classList.toggle(
    "light-theme",
    useLight
  );


  themeToggleBtn.textContent =
    useLight
      ? "☾"
      : "☀";


  themeToggleBtn.setAttribute(
    "aria-label",
    useLight
      ? "Switch to dark theme"
      : "Switch to light theme"
  );
}


function loadTheme() {
  const savedTheme =
    localStorage.getItem(
      "globalblamp_theme"
    );


  applyTheme(
    savedTheme === "light"
      ? "light"
      : "dark"
  );
}

chatMenuBtn.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();

    toggleChatMenu();
  }
);


renameChatBtn.addEventListener(
  "click",
  openRenameChatModal
);


deleteCurrentChatBtn.addEventListener(
  "click",
  deleteCurrentChat
);


cancelRenameChatBtn.addEventListener(
  "click",
  closeRenameChatModal
);


closeRenameChatBtn.addEventListener(
  "click",
  closeRenameChatModal
);

saveRenameChatBtn.addEventListener(
  "click",
  async () => {
    if (!currentChatId) {
      closeRenameChatModal();

      showToast(
        "There is no conversation to rename.",
        "error"
      );

      return;
    }


    const title =
      renameChatInput.value
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);


    if (!title) {
      showToast(
        "Enter a chat name.",
        "error"
      );

      renameChatInput.focus();

      return;
    }


    const chatId =
      currentChatId;


    saveRenameChatBtn.disabled =
      true;

    saveRenameChatBtn.textContent =
      "Saving...";


    try {
      await settleActiveSendBeforeNavigation();


      const renamedChat =
        await renameCloudChat(
          chatId,
          title
        );


      const finalTitle =
        renamedChat?.title ||
        title;


      setCurrentChatTitle(
        finalTitle
      );


      cachedChats =
        cachedChats.map(
          (chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  title:
                    finalTitle
                }
              : chat
        );


      filterChatList();


      closeRenameChatModal();


      showToast(
        "Chat renamed.",
        "success"
      );


      try {
        await loadChats();

      } catch (error) {
        console.error(
          "Could not refresh chats after rename:",
          error
        );
      }

    } catch (error) {
      console.error(
        "Could not rename chat:",
        error
      );


      showToast(
        error.message ||
          "Could not rename chat.",
        "error"
      );

    } finally {
      saveRenameChatBtn.disabled =
        false;

      saveRenameChatBtn.textContent =
        "Save";
    }
  }
);

renameChatModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      renameChatModal
    ) {
      closeRenameChatModal();
    }
  }
);


document.addEventListener(
  "click",
  (event) => {
    if (
      !event.target.closest(
        ".chat-menu-wrap"
      )
    ) {
      closeChatMenu();
    }
  }
);

sidebarProfileBtn.addEventListener(
  "click",
  openProfileModal
);


closeProfileBtn.addEventListener(
  "click",
  closeProfileModal
);


cancelProfileBtn.addEventListener(
  "click",
  closeProfileModal
);


profileModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      profileModal
    ) {
      closeProfileModal();
    }
  }
);

changeProfilePhotoBtn.addEventListener(
  "click",
  () => {
    profilePhotoInput.click();
  }
);


profilePhotoInput.addEventListener(
  "change",
  async () => {
    const file =
      profilePhotoInput.files?.[0];


    if (!file) {
      return;
    }


    const allowedTypes =
      [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      showToast(
        "Use a JPG, PNG, or WebP image.",
        "error"
      );

      profilePhotoInput.value = "";

      return;
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {
      showToast(
        "Profile photo must be under 5 MB.",
        "error"
      );

      profilePhotoInput.value = "";

      return;
    }


    try {
      pendingProfilePhoto =
        await resizeProfilePhoto(
          file
        );


      renderProfileEditorPhoto(
        pendingProfilePhoto
      );


    } catch (error) {
      console.error(
        "Could not prepare profile photo:",
        error
      );


      showToast(
        error.message ||
          "Could not use this image.",
        "error"
      );
    }


    profilePhotoInput.value = "";
  }
);


removeProfilePhotoBtn.addEventListener(
  "click",
  () => {
    pendingProfilePhoto = "";


    renderProfileEditorPhoto(
      ""
    );
  }
);

saveProfileBtn.addEventListener(
  "click",
  () => {
    const displayName =
      profileDisplayNameInput.value
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50);


    if (!displayName) {
      showToast(
        "Enter a display name.",
        "error"
      );

      profileDisplayNameInput.focus();

      return;
    }


    localStorage.setItem(
      PROFILE_NAME_STORAGE_KEY,
      displayName
    );


    if (pendingProfilePhoto) {
      localStorage.setItem(
        PROFILE_PHOTO_STORAGE_KEY,
        pendingProfilePhoto
      );

    } else {
      localStorage.removeItem(
        PROFILE_PHOTO_STORAGE_KEY
      );
    }


    renderProfile();

    closeProfileModal();


    showToast(
      "Profile updated.",
      "success"
    );
  }
);

themeToggleBtn.addEventListener(
  "click",
  () => {
    const isLight =
      document.body.classList.contains(
        "light-theme"
      );


    const nextTheme =
      isLight
        ? "dark"
        : "light";


    localStorage.setItem(
      "globalblamp_theme",
      nextTheme
    );


    applyTheme(nextTheme);
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

toggleApiKeyBtn.addEventListener(
  "click",
  () => {

    const showing =
      apiKeyInput.type ===
      "text";


    apiKeyInput.type =
      showing
        ? "password"
        : "text";


    toggleApiKeyBtn.textContent =
      showing
        ? "Show"
        : "Hide";


    toggleApiKeyBtn.setAttribute(
      "aria-label",
      showing
        ? "Show API key"
        : "Hide API key"
    );
  }
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

confirmModal.addEventListener(
  "click",
  (event) => {

    if (
      event.target ===
      confirmModal
    ) {
      confirmCancelBtn.click();
    }

  }
);

sendBtn.addEventListener(
  "click",
  () => {
    if (isGenerating) {
      stopGenerating();
      return;
    }


    sendMessage();
  }
);


messageInput.addEventListener(
  "input",
  () => {
    resizeTextarea();

    updateSendButtonState();

    saveMessageDraft();
  }
);

chatArea.addEventListener(
  "scroll",
  updateScrollToLatestButton
);


scrollToLatestBtn.addEventListener(
  "click",
  () => {
    scrollToLatest();
  }
);

messageInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();


      if (isGenerating) {
        return;
      }


      sendMessage();
    }

  }
);

document.addEventListener(
  "keydown",
  (event) => {

    /*
      Ctrl/Cmd + K
      focuses conversation search.
    */

    if (
      (event.ctrlKey ||
        event.metaKey) &&
      event.key.toLowerCase() ===
        "k"
    ) {
      event.preventDefault();


      openHistory();


      chatSearchInput.focus();

      chatSearchInput.select();

      return;
    }


    /*
      Escape closes open UI.
    */

if (
  event.key === "Escape"
) {

  if (
    !confirmModal.classList.contains(
      "hidden"
    )
  ) {
    confirmCancelBtn.click();

    return;
  }


closeHistory();

closeSettings();

closeProfileModal();

messageInput.focus();
}
  }
);

async function startApp() {
  setupTelegramLogin();

  setupHeaderModelPicker();

  loadTheme();

  loadSettings();

  restoreMessageDraft();
  renderProfile();

  /*
    Remove leftovers from older versions.

    The real Telegram session is now stored
    only in the HttpOnly cookie.
  */

  localStorage.removeItem(
    "globalblamp_session_token"
  );

  localStorage.removeItem(
    "globalblamp_api_key"
  );


  /*
    Ask our same-origin Vercel endpoint
    whether the HttpOnly Telegram session
    is still valid.

    JavaScript never reads the session
    token itself.
  */

  try {
    const response = await fetch(
      "/api/auth/session",
      {
        method: "GET"
      }
    );


    /*
      No valid Telegram session exists.
    */

    if (response.status === 401) {
      localStorage.removeItem(
        "globalblamp_telegram_user"
      );

      localStorage.removeItem(
        "globalblamp_unlicensed_login_at"
      );


      hasActiveApi = false;

      apiKeyInput.value = "";

      showLogin();

      return;
    }


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
        "Could not restore Telegram session"
      );
    }


    /*
      Refresh the non-secret cached
      Telegram profile.
    */

if (data.user) {
  localStorage.setItem(
    "globalblamp_telegram_user",
    JSON.stringify(data.user)
  );
}


renderProfile();


    hasActiveApi =
      data.api_access?.active === true;


    /*
      Telegram session is valid and
      an approved API is connected.
    */

    if (hasActiveApi) {
      localStorage.removeItem(
        "globalblamp_unlicensed_login_at"
      );


      showChat();


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
          "Could not load chats:",
          error
        );

        resetToNewChat();
      }


      return;
    }


    /*
      Telegram session itself is valid,
      but this user currently has no
      active API license.

      Keep them signed in and open
      Settings so they can connect one.
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
      A temporary Vercel/Worker/network
      problem must NOT erase the cookie.

      Show login with an error so the user
      can retry or refresh later.
    */

    hasActiveApi = false;

    showLogin();

    setLoginMessage(
      "Could not check your session. Please refresh and try again.",
      "error"
    );

    return;
  }
}

function setupTelegramLogin() {
  if (
    !window.Telegram ||
    !window.Telegram.Login
  ) {
    console.error(
      "Telegram Login library did not load."
    );

    setLoginMessage(
      "Telegram login is unavailable.",
      "error"
    );

    return;
  }


  telegramLoginBtn.addEventListener(
    "click",
    async () => {
      telegramLoginBtn.disabled = true;

      setLoginMessage(
        "Preparing Telegram login..."
      );


      try {
        const response = await fetch(
          "/api/auth/telegram-nonce",
          {
            method: "POST"
          }
        );


        let nonceData = null;


        try {
          nonceData =
            await response.json();

        } catch {
          nonceData = null;
        }


        if (
          !response.ok ||
          !nonceData?.nonce
        ) {
          throw new Error(
            nonceData?.error ||
            "Could not prepare Telegram login"
          );
        }


        Telegram.Login.init(
          {
            client_id: 8741110567,
            scope: ["profile"],
            lang: "en",
            nonce: nonceData.nonce
          },

          handleTelegramOidcResult
        );


        Telegram.Login.open();

      } catch (error) {
        console.error(
          "Telegram nonce setup failed:",
          error
        );


        setLoginMessage(
          error.message ||
            "Could not prepare Telegram login.",
          "error"
        );

      } finally {
        telegramLoginBtn.disabled = false;
      }
    }
  );
}


startApp();
