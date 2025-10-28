console.log("chatPage.js geladen");

import { supabase } from "./supabaseClient.js";
import {
  loadUserChats,
  loadMessages,
  sendMessage,
  subscribeToChat,
  unsubscribeFromChat,
  getChatPartnerInfo
} from "./chat.js";

let currentChatId = null;
let currentSubscription = null;
let currentUser = null;
let currentGroup = 'all'; // Neue Variable für aktuelle Gruppe

// Chat-Gruppen-Konfiguration
const CHAT_GROUPS = {
  all: { name: 'Alle', icon: '💬' },
  buy: { name: 'Ankauf', icon: '🛒' },
  sell: { name: 'Verkauf', icon: '💰' },
  support: { name: 'Fragen & Support', icon: '❓' }
};

/**
 * Initialisiert die Chat-Seite
 */
async function initChatPage() {
  console.log("🚀 Initialisiere Chat-Seite...");

  // User authentifizierung prüfen
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    alert("Bitte melde dich an, um den Chat zu nutzen");
    window.location.href = "/src/pages/login.html";
    return;
  }

  currentUser = user;
  console.log("✅ User authentifiziert:", user.id);

  // Lade alle Chats
  await loadChats();

  // Prüfe ob eine Chat-ID in der URL ist
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get('chat');
  
  if (chatId) {
    await openChatWindow(chatId);
  }
}

/**
 * Lädt alle Chats des Users
 */
async function loadChats() {
  console.log("📋 Lade Chats...");
  
  const chatsContainer = document.getElementById('chatsContainer');
  
  if (!chatsContainer) {
    console.error("❌ chatsContainer nicht gefunden");
    return;
  }

  chatsContainer.innerHTML = '<div class="loading">Lade Chats...</div>';

  try {
    const chats = await loadUserChats();
    
    console.log("📊 Geladene Chats:", chats);
    
    if (!chats || chats.length === 0) {
      chatsContainer.innerHTML = '<div class="no-chats">Noch keine Chats vorhanden</div>';
      return;
    }

    chatsContainer.innerHTML = '';

    for (const chat of chats) {
      const chatItem = await createChatItem(chat);
      chatsContainer.appendChild(chatItem);
    }
    
    console.log("✅ Chats erfolgreich geladen");

  } catch (error) {
    console.error("❌ Fehler beim Laden der Chats:", error);
    chatsContainer.innerHTML = '<div class="error">Fehler beim Laden der Chats</div>';
  }
}

/**
 * Erstellt ein Chat-Listen-Element
 */
async function createChatItem(chat) {
  console.log("🔨 Erstelle Chat-Item:", chat);
  
  const div = document.createElement('div');
  div.className = 'chat-item';
  div.dataset.chatId = chat.id;

  // Partner-ID ermitteln
  const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
  
  console.log("👤 Lade Partner-Info für:", partnerId);
  
  // Partner-Info laden
  const partnerInfo = await getChatPartnerInfo(partnerId);
  
  console.log("✅ Partner-Info geladen:", partnerInfo);

  // Zeitformatierung
  const lastMessageDate = new Date(chat.last_message_at);
  const timeAgo = formatTimeAgo(lastMessageDate);

  div.innerHTML = `
    <div class="chat-item-avatar">
      <div class="avatar-placeholder">${partnerInfo.username.charAt(0).toUpperCase()}</div>
    </div>
    <div class="chat-item-content">
      <div class="chat-item-header">
        <span class="chat-item-name">${partnerInfo.username}</span>
        <span class="chat-item-time">${timeAgo}</span>
      </div>
      <div class="chat-item-preview">Letzte Nachricht...</div>
    </div>
  `;

  div.addEventListener('click', () => {
    console.log("🖱️ Chat angeklickt:", chat.id);
    openChatWindow(chat.id);
  });

  return div;
}

/**
 * Öffnet ein Chat-Fenster
 */
async function openChatWindow(chatId) {
  console.log("📖 Öffne Chat:", chatId);

  // Alte Subscription beenden
  if (currentSubscription) {
    await unsubscribeFromChat(currentSubscription);
    currentSubscription = null;
  }

  currentChatId = chatId;

  // Chat-Details laden
  const { data: chat, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (error || !chat) {
    console.error("❌ Fehler beim Laden des Chats:", error);
    alert("Chat konnte nicht geladen werden");
    return;
  }

  // Partner-Info laden
  const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
  const partnerInfo = await getChatPartnerInfo(partnerId);

  // Chat-Fenster aufbauen
  const chatWindow = document.getElementById('chatWindow');
  const chatList = document.querySelector('.chat-list');
  const noChat = document.getElementById('noChat');
  
  if (noChat) noChat.style.display = 'none';
  
  // Mobile: Chat-Liste ausblenden, Chat-Fenster anzeigen
  if (window.innerWidth <= 767) {
    if (chatList) chatList.classList.add('hidden-mobile');
    if (chatWindow) chatWindow.classList.add('active');
  }

  chatWindow.innerHTML = `
    <div class="chat-header">
      <button class="back-button" aria-label="Zurück">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="chat-header-info">
        <div class="avatar-placeholder">${partnerInfo.username.charAt(0).toUpperCase()}</div>
        <div>
          <h4>${partnerInfo.username}</h4>
          <span class="account-type">${partnerInfo.accountType === 'dealer' ? '🏢 Händler' : '👤 Privat'}</span>
        </div>
      </div>
    </div>
    
    <div class="chat-messages" id="chatMessages"></div>
    
    <div class="chat-input-wrapper">
      <input 
        type="text" 
        id="messageInput" 
        class="chat-input" 
        placeholder="Nachricht schreiben..."
        maxlength="1000"
      >
      <button id="sendMessageBtn" class="send-message-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  `;

  // Event-Listener
  const closeBtn = document.getElementById('closeChatBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Mobile: Zurück zur Chat-Liste
      if (window.innerWidth <= 767) {
        chatWindow.classList.remove('active');
        const chatList = document.querySelector('.chat-list');
        if (chatList) chatList.classList.remove('hidden-mobile');
      } else {
        window.location.href = '/src/pages/chat.html';
      }
    });
  }

  // Back-Button für Mobile
  const backBtn = document.querySelector('.back-button');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      chatWindow.classList.remove('active');
      const chatList = document.querySelector('.chat-list');
      if (chatList) chatList.classList.remove('hidden-mobile');
    });
  }

  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn');

  sendBtn?.addEventListener('click', handleSendMessage);
  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Nachrichten laden
  await loadChatMessages(chatId);

  // Realtime-Updates abonnieren
  currentSubscription = subscribeToChat(chatId, (newMessage) => {
    appendMessage(newMessage);
  });

  // Aktiven Chat markieren
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.chatId === chatId) {
      item.classList.add('active');
    }
  });
}

/**
 * Lädt Nachrichten eines Chats
 */
async function loadChatMessages(chatId) {
  const messagesContainer = document.getElementById('chatMessages');
  
  if (!messagesContainer) return;

  messagesContainer.innerHTML = '<div class="loading">Lade Nachrichten...</div>';

  try {
    const messages = await loadMessages(chatId);
    
    messagesContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = '<div class="no-messages">Noch keine Nachrichten. Schreibe die erste!</div>';
      return;
    }

    messages.forEach(msg => appendMessage(msg, false));
    
    // Zum Ende scrollen
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (error) {
    console.error("❌ Fehler beim Laden der Nachrichten:", error);
    messagesContainer.innerHTML = '<div class="error">Fehler beim Laden der Nachrichten</div>';
  }
}

/**
 * Fügt eine Nachricht zum Chat hinzu
 */
function appendMessage(message, scrollToBottom = true) {
  const messagesContainer = document.getElementById('chatMessages');
  
  if (!messagesContainer) return;

  // "Keine Nachrichten" Text entfernen falls vorhanden
  const noMessages = messagesContainer.querySelector('.no-messages');
  if (noMessages) noMessages.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
  
  const time = new Date(message.created_at).toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  messageDiv.innerHTML = `
    <div class="message-content">${escapeHtml(message.message)}</div>
    <div class="message-time">${time}</div>
  `;

  messagesContainer.appendChild(messageDiv);

  if (scrollToBottom) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Sendet eine Nachricht
 */
async function handleSendMessage() {
  const messageInput = document.getElementById('messageInput');
  
  if (!messageInput || !currentChatId) return;

  const message = messageInput.value.trim();
  
  if (!message) return;

  const sendBtn = document.getElementById('sendMessageBtn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const success = await sendMessage(currentChatId, message);
    
    if (success) {
      messageInput.value = '';
    } else {
      alert("Nachricht konnte nicht gesendet werden");
    }
  } catch (error) {
    console.error("❌ Fehler beim Senden:", error);
    alert("Fehler beim Senden der Nachricht");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    messageInput.focus();
  }
}

/**
 * Formatiert Zeitangaben (z.B. "vor 5 Min.")
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Gerade eben';
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`;
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)} Std.`;
  if (seconds < 604800) return `vor ${Math.floor(seconds / 86400)} Tagen`;
  
  return date.toLocaleDateString('de-DE');
}

/**
 * Escaped HTML für sichere Anzeige
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', initChatPage);

console.log("✅ chatPage.js Modul vollständig geladen");