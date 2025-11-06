console.log("chatPage.js (mit Gruppen) wird geladen...");

import { supabase } from "./supabaseClient.js";
import {
  loadUserChats,
  loadMessages,
  sendMessage,
  subscribeToChat,
  unsubscribeFromChat,
  getChatPartnerInfo,
} from "./chat.js";
import {
  loadUserGroups,
  loadGroupMessages,
  sendGroupMessage,
  subscribeToGroup,
  getGroupMemberCount
} from "./chatGroups.js";

let currentChatId = null;
let currentGroupId = null;
let currentSubscription = null;
let currentUser = null;
let chatPartnerInfo = null;
let isGroupChat = false;

/**
 * Initialisiert die Chat-Seite
 */
async function initChatPage() {
  console.log("🚀 Initialisiere Chat-Seite mit Gruppen...");

  try {
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
    const groupId = urlParams.get("group");

    // Chats und Gruppen laden
    await loadAllChats();

    // Wenn Parameter vorhanden, Chat/Gruppe öffnen
    if (groupId) {
      await openGroupById(groupId);
    } else if (chatId) {
      await openChatById(chatId);
    }

    setupEventListeners();

    console.log("✅ Chat-Seite initialisiert");
  } catch (error) {
    console.error("❌ Fehler beim Initialisieren:", error);
    showError("Chat konnte nicht geladen werden");
  }
}

/**
 * Lädt alle Chats UND Gruppen
 */
async function loadAllChats() {
  const chatsContainer = document.getElementById("chatsContainer");

  try {
    chatsContainer.innerHTML = `
      <div class="loading">
        <p>Lade Chats...</p>
      </div>
    `;

    // Parallel laden
    const [directChats, groups] = await Promise.all([
      loadUserChats(),
      loadUserGroups()
    ]);

    if ((!directChats || directChats.length === 0) && (!groups || groups.length === 0)) {
      chatsContainer.innerHTML = `
        <div class="no-chats">
          <p>Noch keine Chats vorhanden</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Gruppen zuerst anzeigen (mit Badge)
    if (groups && groups.length > 0) {
      html += '<div class="chat-section-header">Gruppen</div>';
      
      for (const group of groups) {
        const memberCount = await getGroupMemberCount(group.id);
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("message, created_at, sender:sender_id(username:profiles(username))")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        html += createGroupItemHTML({ ...group, memberCount, lastMessage });
      }
    }

    // Dann Direktchats
    if (directChats && directChats.length > 0) {
      html += '<div class="chat-section-header">Direktnachrichten</div>';
      
      const chatsWithInfo = await Promise.all(
        directChats.map(async (chat) => {
          const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
          const partnerInfo = await getChatPartnerInfo(partnerId);

          const { data: lastMessage } = await supabase
            .from("messages")
            .select("message, created_at")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return { ...chat, partnerInfo, lastMessage };
        })
      );

      html += chatsWithInfo.map(chat => createChatItemHTML(chat)).join("");
    }

    chatsContainer.innerHTML = html;

    // Event Listeners
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.addEventListener("click", () => {
        const chatId = item.dataset.chatId;
        openChatById(chatId);
      });
    });

    document.querySelectorAll(".group-item").forEach((item) => {
      item.addEventListener("click", () => {
        const groupId = item.dataset.groupId;
        openGroupById(groupId);
      });
    });

  } catch (error) {
    console.error("❌ Fehler beim Laden:", error);
    chatsContainer.innerHTML = `
      <div class="error">
        <p>Fehler beim Laden der Chats</p>
      </div>
    `;
  }
}

/**
 * Erstellt HTML für ein Gruppen-Item
 */
function createGroupItemHTML(group) {
  const timeStr = group.lastMessage
    ? formatTime(new Date(group.lastMessage.created_at))
    : "";
  
  const preview = group.lastMessage
    ? `${group.lastMessage.sender?.username || 'Jemand'}: ${truncate(group.lastMessage.message, 40)}`
    : "Noch keine Nachrichten";

  return `
    <div class="group-item" data-group-id="${group.id}">
      <div class="group-item-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      </div>
      <div class="group-item-content">
        <div class="group-item-header">
          <span class="group-item-name">
            ${group.name}
            ${group.is_global ? '<span class="global-badge">🌐</span>' : ''}
          </span>
          <span class="group-item-time">${timeStr}</span>
        </div>
        <div class="group-item-preview">
          <span class="member-count">${group.memberCount} Mitglieder</span>
          ${group.lastMessage ? ` • ${preview}` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Erstellt HTML für ein Chat-Item
 */
function createChatItemHTML(chat) {
  const { partnerInfo, lastMessage } = chat;
  const initial = partnerInfo.username.charAt(0).toUpperCase();
  const timeStr = lastMessage ? formatTime(new Date(lastMessage.created_at)) : "";
  const preview = lastMessage ? truncate(lastMessage.message, 50) : "Noch keine Nachrichten";

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
 * Öffnet eine Gruppe
 */
async function openGroupById(groupId) {
  console.log("📂 Öffne Gruppe:", groupId);

  try {
    // Alte Subscription beenden
    if (currentSubscription) {
      await unsubscribeFromChat(currentSubscription);
      currentSubscription = null;
    }

    currentGroupId = groupId;
    currentChatId = null;
    isGroupChat = true;

    // Gruppen-Daten laden
    const { data: group, error } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (error || !group) {
      throw new Error("Gruppe nicht gefunden");
    }

    const memberCount = await getGroupMemberCount(groupId);

    // UI vorbereiten
    showChatWindow();
    renderGroupHeader(group, memberCount);

    // Nachrichten laden
    await loadGroupMessagesUI(groupId);

    // Realtime-Updates abonnieren
    currentSubscription = subscribeToGroup(groupId, (newMessage) => {
      console.log("📨 Neue Gruppennachricht empfangen:", newMessage);
      appendGroupMessage(newMessage);
      scrollToBottom();
    });

    scrollToBottom();

    // Active-State setzen
    document.querySelectorAll(".chat-item, .group-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.groupId === groupId) {
        item.classList.add("active");
      }
    });

    console.log("✅ Gruppe geöffnet");
  } catch (error) {
    console.error("❌ Fehler beim Öffnen der Gruppe:", error);
    showError("Gruppe konnte nicht geöffnet werden");
  }
}

/**
 * Öffnet einen Direktchat
 */
async function openChatById(chatId) {
  console.log("📂 Öffne Chat:", chatId);

  try {
    if (currentSubscription) {
      await unsubscribeFromChat(currentSubscription);
      currentSubscription = null;
    }

    currentChatId = chatId;
    currentGroupId = null;
    isGroupChat = false;

    const { data: chat, error } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();

    if (error || !chat) {
      throw new Error("Chat nicht gefunden");
    }

    const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
    chatPartnerInfo = await getChatPartnerInfo(partnerId);

    showChatWindow();
    renderChatHeader(chatPartnerInfo);
    await loadChatMessages(chatId);

    currentSubscription = subscribeToChat(chatId, (newMessage) => {
      console.log("📨 Neue Nachricht empfangen:", newMessage);
      appendMessage(newMessage);
      scrollToBottom();
    });

    scrollToBottom();

    document.querySelectorAll(".chat-item, .group-item").forEach((item) => {
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
 * Zeigt Chat-Fenster
 */
function showChatWindow() {
  const chatWindow = document.getElementById("chatWindow");
  const chatList = document.getElementById("chatList");
  const noChat = document.getElementById("noChat");

  if (noChat) noChat.style.display = "none";
  chatWindow.classList.add("active");

  if (window.innerWidth <= 767) {
    chatList.classList.add("hidden-mobile");
  }
}

/**
 * Rendert Gruppen-Header
 */
function renderGroupHeader(group, memberCount) {
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
        <div class="avatar-placeholder group-avatar">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div>
          <h3>${group.name} ${group.is_global ? '🌐' : ''}</h3>
          <span class="account-type">${memberCount} Mitglieder</span>
        </div>
      </div>
    </div>
  `;

  if (existingHeader) existingHeader.remove();
  chatWindow.insertAdjacentHTML("afterbegin", headerHTML);
  document.getElementById("backButton")?.addEventListener("click", closeChat);
}

/**
 * Rendert Chat-Header (Direktchat)
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

  if (existingHeader) existingHeader.remove();
  chatWindow.insertAdjacentHTML("afterbegin", headerHTML);
  document.getElementById("backButton")?.addEventListener("click", closeChat);
}

/**
 * Lädt Gruppennachrichten
 */
async function loadGroupMessagesUI(groupId) {
  const chatWindow = document.getElementById("chatWindow");
  let messagesContainer = chatWindow.querySelector(".chat-messages");

  if (!messagesContainer) {
    messagesContainer = document.createElement("div");
    messagesContainer.className = "chat-messages";
    messagesContainer.id = "messagesContainer";
    chatWindow.appendChild(messagesContainer);
  }

  try {
    messagesContainer.innerHTML = '<div class="loading-message">Lade Nachrichten...</div>';

    const messages = await loadGroupMessages(groupId);

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<div class="no-messages">Noch keine Nachrichten</div>';
      renderInputArea();
      return;
    }

    messagesContainer.innerHTML = messages.map((msg) => createGroupMessageHTML(msg)).join("");
    renderInputArea();
  } catch (error) {
    console.error("❌ Fehler beim Laden:", error);
    messagesContainer.innerHTML = '<div class="error">Fehler beim Laden</div>';
  }
}

/**
 * Lädt Direktchat-Nachrichten
 */
async function loadChatMessages(chatId) {
  const chatWindow = document.getElementById("chatWindow");
  let messagesContainer = chatWindow.querySelector(".chat-messages");

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
    console.error("❌ Fehler:", error);
    messagesContainer.innerHTML = '<div class="error">Fehler beim Laden</div>';
  }
}

/**
 * Erstellt HTML für Gruppennachricht
 */
function createGroupMessageHTML(message) {
  const isSent = message.sender_id === currentUser.id;
  const timeStr = formatTime(new Date(message.created_at));
  const senderName = isSent ? "Du" : (message.sender?.username || 'Jemand');

  return `
    <div class="message ${isSent ? "sent" : "received"}" data-message-id="${message.id}">
      ${!isSent ? `<div class="message-sender">${senderName}</div>` : ''}
      <div class="message-bubble">
        <div class="message-text">${escapeHtml(message.message)}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    </div>
  `;
}

/**
 * Erstellt HTML für Direktnachricht
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
 * Fügt Gruppennachricht hinzu
 */
async function appendGroupMessage(message) {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  const exists = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
  if (exists) return;

  const noMessages = messagesContainer.querySelector(".no-messages");
  if (noMessages) noMessages.remove();

  // Username laden falls nicht vorhanden
  if (!message.sender) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', message.sender_id)
      .single();
    
    message.sender = { username: data?.username || 'Unbekannt' };
  }

  messagesContainer.insertAdjacentHTML("beforeend", createGroupMessageHTML(message));
}

/**
 * Fügt Direktnachricht hinzu
 */
function appendMessage(message) {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  const exists = messagesContainer.querySelector(`[data-message-id="${message.id}"]`);
  if (exists) return;

  const noMessages = messagesContainer.querySelector(".no-messages");
  if (noMessages) noMessages.remove();

  messagesContainer.insertAdjacentHTML("beforeend", createMessageHTML(message));
}

/**
 * Rendert Input-Bereich
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

  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendButton");

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  sendBtn.addEventListener("click", handleSendMessage);
}

/**
 * Sendet Nachricht (Gruppe oder Direktchat)
 */
async function handleSendMessage() {
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendButton");
  const message = input.value.trim();

  if (!message) return;
  if (!currentChatId && !currentGroupId) return;

  console.log("📤 Sende Nachricht...");

  const messageText = message;
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  // Optimistische UI
  const tempMessage = {
    id: `temp-${Date.now()}`,
    sender_id: currentUser.id,
    message: messageText,
    created_at: new Date().toISOString(),
  };

  if (isGroupChat) {
    tempMessage.group_id = currentGroupId;
    await appendGroupMessage(tempMessage);
  } else {
    tempMessage.chat_id = currentChatId;
    appendMessage(tempMessage);
  }

  scrollToBottom();

  try {
    let success;
    if (isGroupChat) {
      success = await sendGroupMessage(currentGroupId, messageText);
    } else {
      success = await sendMessage(currentChatId, messageText);
    }

    if (!success) throw new Error("Senden fehlgeschlagen");

    console.log("✅ Nachricht gesendet");
  } catch (error) {
    console.error("❌ Fehler beim Senden:", error);
    
    const tempMsg = document.querySelector(`[data-message-id="${tempMessage.id}"]`);
    if (tempMsg) tempMsg.remove();
    
    input.value = messageText;
    alert("Nachricht konnte nicht gesendet werden");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

/**
 * Scrollt zum Ende
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById("messagesContainer");
  if (messagesContainer) {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }
}

/**
 * Schließt Chat
 */
function closeChat() {
  const chatWindow = document.getElementById("chatWindow");
  const chatList = document.getElementById("chatList");
  const noChat = document.getElementById("noChat");

  chatWindow.classList.remove("active");
  chatList.classList.remove("hidden-mobile");

  if (noChat) noChat.style.display = "flex";

  if (window.innerWidth <= 767) {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
    
    const header = document.querySelector("header");
    if (header) header.style.display = "block";
    
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.height = "";
  }

  if (currentSubscription) {
    unsubscribeFromChat(currentSubscription);
    currentSubscription = null;
  }

  currentChatId = null;
  currentGroupId = null;
  isGroupChat = false;

  window.history.pushState({}, "", "/src/pages/chat.html");
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  window.addEventListener("resize", () => {
    if (window.innerWidth > 767) {
      document.getElementById("chatList").classList.remove("hidden-mobile");
      
      const footer = document.querySelector("footer");
      if (footer) footer.style.display = "flex";
      
      const header = document.querySelector("header");
      if (header) header.style.display = "block";
      
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    }
  });
}

function showError(message) {
  alert(message);
}

/**
 * Hilfsfunktionen
 */
function formatTime(date) {
  const now = new Date();
  const diff = now - date;

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString("de-DE", { weekday: "short" });
  }

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

window.addEventListener("beforeunload", () => {
  if (currentSubscription) {
    unsubscribeFromChat(currentSubscription);
  }
});

console.log("✅ chatPage.js (mit Gruppen) geladen");