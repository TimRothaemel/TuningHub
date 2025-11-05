console.log("chatPage.js wird geladen...");

import { supabase } from "./supabaseClient.js";
import {
  loadUserChats,
  loadMessages,
  sendMessage,
  subscribeToChat,
  unsubscribeFromChat,
  getChatPartnerInfo,
} from "./chat.js";

let currentChatId = null;
let currentSubscription = null;
let currentUser = null;
let chatPartnerInfo = null;

/**
 * Initialisiert die Chat-Seite
 */
async function initChatPage() {
  console.log("🚀 Initialisiere Chat-Seite...");

  try {
    // User authentifizieren
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Nicht authentifiziert");
      window.location.href = "/src/pages/login.html";
      return;
    }

    currentUser = user;
    console.log("✅ User authentifiziert:", user.id);

    // URL-Parameter prüfen
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get("chat");

    // Chats laden
    await loadChats();

    // Wenn chat-Parameter vorhanden, diesen Chat öffnen
    if (chatId) {
      await openChatById(chatId);
    }

    // Event Listeners
    setupEventListeners();

    console.log("✅ Chat-Seite initialisiert");
  } catch (error) {
    console.error("❌ Fehler beim Initialisieren:", error);
    showError("Chat konnte nicht geladen werden");
  }
}

/**
 * Lädt alle Chats des Users
 */
async function loadChats() {
  const chatsContainer = document.getElementById("chatsContainer");

  try {
    // Loading-State
    chatsContainer.innerHTML = `
      <div class="loading">
        <p>Lade Chats...</p>
      </div>
    `;

    const chats = await loadUserChats();

    if (!chats || chats.length === 0) {
      chatsContainer.innerHTML = `
        <div class="no-chats">
          <p>Noch keine Chats vorhanden</p>
        </div>
      `;
      return;
    }

    // Chats mit User-Infos anreichern
    const chatsWithInfo = await Promise.all(
      chats.map(async (chat) => {
        const partnerId =
          chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
        const partnerInfo = await getChatPartnerInfo(partnerId);

        // Letzte Nachricht laden
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("message, created_at")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...chat,
          partnerInfo,
          lastMessage,
        };
      })
    );

    // Chats rendern
    chatsContainer.innerHTML = chatsWithInfo
      .map((chat) => createChatItemHTML(chat))
      .join("");

    // Event Listeners für Chat-Items
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.addEventListener("click", () => {
        const chatId = item.dataset.chatId;
        openChatById(chatId);
      });
    });
  } catch (error) {
    console.error("❌ Fehler beim Laden der Chats:", error);
    chatsContainer.innerHTML = `
      <div class="error">
        <p>Fehler beim Laden der Chats</p>
      </div>
    `;
  }
}

/**
 * Erstellt HTML für ein Chat-Item
 */
function createChatItemHTML(chat) {
  const { partnerInfo, lastMessage } = chat;
  const initial = partnerInfo.username.charAt(0).toUpperCase();
  const timeStr = lastMessage
    ? formatTime(new Date(lastMessage.created_at))
    : "";
  const preview = lastMessage
    ? truncate(lastMessage.message, 50)
    : "Noch keine Nachrichten";

  return `
    <div class="chat-item" data-chat-id="${chat.id}">
      <div class="chat-item-avatar">${initial}</div>
      <div class="chat-item-content">
        <div class="chat-item-header">
          <span class="chat-item-name">${partnerInfo.username}</span>
          <span class="chat-item-time">${timeStr}</span>
        </div>
        <div class="chat-item-preview">${preview}</div>
      </div>
    </div>
  `;
}

/**
 * Öffnet einen Chat
 */
async function openChatById(chatId) {
  console.log("📂 Öffne Chat:", chatId);

  try {
    // Alte Subscription beenden
    if (currentSubscription) {
      await unsubscribeFromChat(currentSubscription);
      currentSubscription = null;
    }

    currentChatId = chatId;

    // Chat-Daten laden
    const { data: chat, error } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();

    if (error || !chat) {
      throw new Error("Chat nicht gefunden");
    }

    // Partner-Info laden
    const partnerId =
      chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
    chatPartnerInfo = await getChatPartnerInfo(partnerId);

    // UI vorbereiten
    showChatWindow();
    renderChatHeader(chatPartnerInfo);

    // Nachrichten laden
    await loadChatMessages(chatId);

    // Realtime-Updates abonnieren
    currentSubscription = subscribeToChat(chatId, (newMessage) => {
      console.log("📨 Neue Nachricht empfangen:", newMessage);
      appendMessage(newMessage);
      scrollToBottom();
    });

    // Scroll zum Ende
    scrollToBottom();

    // Active-State in Liste setzen
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.chatId === chatId) {
        item.classList.add("active");
      }
    });

    console.log("✅ Chat geöffnet");
  } catch (error) {
    console.error("❌ Fehler beim Öffnen des Chats:", error);
    showError("Chat konnte nicht geöffnet werden");
  }
}

/**
 * Zeigt das Chat-Fenster an
 */
function showChatWindow() {
  const chatWindow = document.getElementById("chatWindow");
  const chatList = document.getElementById("chatList");
  const noChat = document.getElementById("noChat");

  if (noChat) noChat.style.display = "none";
  chatWindow.classList.add("active");

  // Mobile: Nur Liste ausblenden
  if (window.innerWidth <= 767) {
    chatList.classList.add("hidden-mobile");
  }
}

/**
 * Rendert den Chat-Header
 */
function renderChatHeader(partnerInfo) {
  const chatWindow = document.getElementById("chatWindow");
  const existingHeader = chatWindow.querySelector(".chat-header");

  const headerHTML = `
    <div class="chat-header">
      <button class="back-button" id="backButton" aria-label="Zurück">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="chat-header-info">
        <div class="avatar-placeholder">${partnerInfo.username.charAt(0).toUpperCase()}</div>
        <div>
          <h3>${partnerInfo.username}</h3>
          <span class="account-type">${
            partnerInfo.accountType === "business" ? "Gewerblich" : "Privat"
          }</span>
        </div>
      </div>
    </div>
  `;

  if (existingHeader) {
    existingHeader.remove();
  }

  chatWindow.insertAdjacentHTML("afterbegin", headerHTML);

  // Back-Button Event
  document.getElementById("backButton")?.addEventListener("click", closeChat);
}

/**
 * Lädt und zeigt Nachrichten an
 */
async function loadChatMessages(chatId) {
  const chatWindow = document.getElementById("chatWindow");
  let messagesContainer = chatWindow.querySelector(".chat-messages");

  // Container erstellen falls nicht vorhanden
  if (!messagesContainer) {
    const existingContainer = chatWindow.querySelector(".chat-messages");
    if (existingContainer) existingContainer.remove();

    messagesContainer = document.createElement("div");
    messagesContainer.className = "chat-messages";
    messagesContainer.id = "messagesContainer";
    chatWindow.appendChild(messagesContainer);
  }

  try {
    messagesContainer.innerHTML = '<div class="loading-message">Lade Nachrichten...</div>';

    const messages = await loadMessages(chatId);

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<div class="no-messages">Noch keine Nachrichten</div>';
      renderInputArea();
      return;
    }

    messagesContainer.innerHTML = messages.map((msg) => createMessageHTML(msg)).join("");
    renderInputArea();
  } catch (error) {
    console.error("❌ Fehler beim Laden der Nachrichten:", error);
    messagesContainer.innerHTML = '<div class="error">Fehler beim Laden</div>';
  }
}

/**
 * Erstellt HTML für eine Nachricht
 */
function createMessageHTML(message) {
  const isSent = message.sender_id === currentUser.id;
  const timeStr = formatTime(new Date(message.created_at));

  return `
    <div class="message ${isSent ? "sent" : "received"}" data-message-id="${message.id}">
      <div class="message-bubble">
        <div class="message-text">${escapeHtml(message.message)}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    </div>
  `;
}

/**
 * Fügt eine neue Nachricht hinzu (für Realtime)
 */
function appendMessage(message) {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  // Prüfen ob Nachricht schon existiert
  const exists = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
  if (exists) return;

  // "Keine Nachrichten" entfernen falls vorhanden
  const noMessages = messagesContainer.querySelector(".no-messages");
  if (noMessages) noMessages.remove();

  messagesContainer.insertAdjacentHTML("beforeend", createMessageHTML(message));
}

/**
 * Rendert den Input-Bereich
 */
function renderInputArea() {
  const chatWindow = document.getElementById("chatWindow");
  let inputArea = chatWindow.querySelector(".chat-input-wrapper");

  if (inputArea) inputArea.remove();

  const inputHTML = `
    <div class="chat-input-wrapper">
      <textarea 
        id="messageInput" 
        class="chat-input" 
        placeholder="Nachricht schreiben..."
        rows="1"
      ></textarea>
      <button class="send-button" id="sendButton" aria-label="Senden">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  `;

  chatWindow.insertAdjacentHTML("beforeend", inputHTML);

  // Event Listeners
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendButton");

  // Auto-resize textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // Enter zum Senden (ohne Shift)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  sendBtn.addEventListener("click", handleSendMessage);
}

/**
 * Sendet eine Nachricht - OPTIMIERT
 */
async function handleSendMessage() {
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendButton");
  const message = input.value.trim();

  if (!message || !currentChatId) return;

  console.log("📤 Sende Nachricht...");

  // ✅ SOFORT: Input leeren und Button deaktivieren
  const messageText = message;
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  // ✅ SOFORT: Optimistische UI-Update (Nachricht sofort anzeigen)
  const tempMessage = {
    id: `temp-${Date.now()}`,
    chat_id: currentChatId,
    sender_id: currentUser.id,
    message: messageText,
    created_at: new Date().toISOString(),
  };

  appendMessage(tempMessage);
  scrollToBottom();

  try {
    // Im Hintergrund senden
    const success = await sendMessage(currentChatId, messageText);

    if (!success) {
      throw new Error("Senden fehlgeschlagen");
    }

    console.log("✅ Nachricht gesendet");
  } catch (error) {
    console.error("❌ Fehler beim Senden:", error);
    
    // Bei Fehler: Temporäre Nachricht entfernen
    const tempMsg = document.querySelector(`[data-message-id="${tempMessage.id}"]`);
    if (tempMsg) tempMsg.remove();
    
    // Nachricht wieder in Input setzen
    input.value = messageText;
    
    alert("Nachricht konnte nicht gesendet werden");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

/**
 * Scrollt zum Ende des Chats
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById("messagesContainer");
  if (messagesContainer) {
    // Smooth scroll mit Fallback
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }
}

/**
 * Schließt den aktuellen Chat (Mobile)
 */
function closeChat() {
  const chatWindow = document.getElementById("chatWindow");
  const chatList = document.getElementById("chatList");
  const noChat = document.getElementById("noChat");

  chatWindow.classList.remove("active");
  chatList.classList.remove("hidden-mobile");

  if (noChat) noChat.style.display = "flex";

  // Mobile: Footer und Header wieder anzeigen
  if (window.innerWidth <= 767) {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
    
    const header = document.querySelector("header");
    if (header) header.style.display = "block";
    
    // Body wieder freigeben
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.height = "";
  }

  // Subscription beenden
  if (currentSubscription) {
    unsubscribeFromChat(currentSubscription);
    currentSubscription = null;
  }

  currentChatId = null;

  // URL bereinigen
  window.history.pushState({}, "", "/src/pages/chat.html");
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Responsive: Bei Resize prüfen ob Mobile-View
  window.addEventListener("resize", () => {
    if (window.innerWidth > 767) {
      document.getElementById("chatList").classList.remove("hidden-mobile");
      
      const footer = document.querySelector("footer");
      if (footer) footer.style.display = "flex";
      
      const header = document.querySelector("header");
      if (header) header.style.display = "block";
      
      // Body freigeben
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    }
  });

  // Offline/Online Status
  window.addEventListener("online", () => {
    console.log("🌐 Online");
    showNetworkStatus("online");
  });

  window.addEventListener("offline", () => {
    console.log("📵 Offline");
    showNetworkStatus("offline");
  });
}

/**
 * Zeigt Network Status
 */
function showNetworkStatus(status) {
  let statusDiv = document.querySelector(".network-status");

  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.className = "network-status";
    document.body.appendChild(statusDiv);
  }

  statusDiv.className = `network-status ${status} show`;
  statusDiv.textContent =
    status === "online" ? "Wieder online" : "Keine Verbindung";

  setTimeout(() => {
    statusDiv.classList.remove("show");
  }, 3000);
}

/**
 * Zeigt Fehlermeldung
 */
function showError(message) {
  alert(message); // Kann später durch bessere UI ersetzt werden
}

/**
 * Hilfsfunktionen
 */
function formatTime(date) {
  const now = new Date();
  const diff = now - date;

  // Heute
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Diese Woche
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("de-DE", { weekday: "short" });
  }

  // Älter
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function truncate(str, length) {
  return str.length > length ? str.substring(0, length) + "..." : str;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialisierung
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatPage);
} else {
  initChatPage();
}

// Cleanup beim Verlassen
window.addEventListener("beforeunload", () => {
  if (currentSubscription) {
    unsubscribeFromChat(currentSubscription);
  }
});

console.log("✅ chatPage.js geladen");