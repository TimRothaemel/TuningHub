console.log("notificationsPage.js geladen");

import { supabase } from "./supabaseClient.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  unsubscribeFromNotifications
} from "./notifications.js";

let currentFilter = 'all';
let subscription = null;

// Icons für verschiedene Benachrichtigungstypen
const NOTIFICATION_ICONS = {
  chat_message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>`,
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>`,
  part_sold: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>`,
  favorite_update: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>`
};

/**
 * Initialisiert die Seite
 */
async function init() {
  console.log("📱 Initialisiere Benachrichtigungsseite...");
  
  // Event Listeners
  document.getElementById('markAllReadBtn')?.addEventListener('click', handleMarkAllRead);
  document.getElementById('filterBtn')?.addEventListener('click', toggleFilter);
  
  // Filter-Tags
  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.addEventListener('click', (e) => handleFilterChange(e.target.dataset.filter));
  });

  // Lade Benachrichtigungen
  await loadNotifications();

  // Echtzeit-Updates abonnieren
  subscription = await subscribeToNotifications((newNotification) => {
    console.log("📬 Neue Benachrichtigung empfangen:", newNotification);
    prependNotification(newNotification);
    showNotificationToast(newNotification);
  });

  console.log("✅ Benachrichtigungsseite initialisiert");
}

/**
 * Lädt und zeigt Benachrichtigungen
 */
async function loadNotifications() {
  const container = document.getElementById('notificationsList');
  const loadingState = document.getElementById('loadingState');
  
  try {
    loadingState.style.display = 'flex';
    
    const unreadOnly = currentFilter === 'unread';
    const notifications = await getNotifications(unreadOnly);
    
    loadingState.style.display = 'none';

    // Filtere nach Typ wenn nicht "all" oder "unread"
    let filteredNotifications = notifications;
    if (currentFilter !== 'all' && currentFilter !== 'unread') {
      filteredNotifications = notifications.filter(n => n.type === currentFilter);
    }

    if (filteredNotifications.length === 0) {
      showEmptyState(container);
      return;
    }

    // Rendere Benachrichtigungen
    container.innerHTML = filteredNotifications
      .map(notification => renderNotification(notification))
      .join('');

    // Event Listeners hinzufügen
    attachNotificationListeners();

  } catch (error) {
    console.error("❌ Fehler beim Laden der Benachrichtigungen:", error);
    showErrorState(container);
  }
}

/**
 * Rendert eine einzelne Benachrichtigung
 */
function renderNotification(notification) {
  const timeAgo = getTimeAgo(notification.created_at);
  const icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.system;
  const unreadClass = notification.read ? '' : 'unread';

  return `
    <div class="notification-item ${unreadClass}" 
         data-id="${notification.id}" 
         data-type="${notification.type}"
         data-url="${notification.action_url || ''}">
      <div class="notification-icon">
        ${icon}
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        ${notification.message ? `<div class="notification-message">${notification.message}</div>` : ''}
        <div class="notification-time">${timeAgo}</div>
      </div>
      <div class="notification-actions">
        ${!notification.read ? `
          <button class="notification-btn mark-read" data-action="mark-read">
            ✓
          </button>
        ` : ''}
        <button class="notification-btn delete" data-action="delete">
          🗑️
        </button>
      </div>
    </div>
  `;
}

/**
 * Fügt Event Listeners zu Benachrichtigungen hinzu
 */
function attachNotificationListeners() {
  document.querySelectorAll('.notification-item').forEach(item => {
    // Klick auf Benachrichtigung
    item.addEventListener('click', (e) => {
      if (e.target.closest('.notification-actions')) return;
      handleNotificationClick(item);
    });

    // Als gelesen markieren
    const markReadBtn = item.querySelector('[data-action="mark-read"]');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMarkAsRead(item.dataset.id);
      });
    }

    // Löschen
    const deleteBtn = item.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(item.dataset.id);
      });
    }
  });
}

/**
 * Behandelt Klick auf Benachrichtigung
 */
async function handleNotificationClick(item) {
  const id = item.dataset.id;
  const url = item.dataset.url;

  // Markiere als gelesen
  if (item.classList.contains('unread')) {
    await markNotificationAsRead(id);
    item.classList.remove('unread');
    
    // Entferne "Als gelesen markieren" Button
    const markReadBtn = item.querySelector('[data-action="mark-read"]');
    if (markReadBtn) {
      markReadBtn.remove();
    }
  }

  // Leite zur Ziel-URL weiter
  if (url && url !== 'null') {
    window.location.href = url;
  }
}

/**
 * Markiert Benachrichtigung als gelesen
 */
async function handleMarkAsRead(notificationId) {
  try {
    await markNotificationAsRead(notificationId);
    
    const item = document.querySelector(`[data-id="${notificationId}"]`);
    if (item) {
      item.classList.remove('unread');
      const markReadBtn = item.querySelector('[data-action="mark-read"]');
      if (markReadBtn) {
        markReadBtn.remove();
      }
    }
  } catch (error) {
    console.error("Fehler beim Markieren als gelesen:", error);
  }
}

/**
 * Löscht Benachrichtigung
 */
async function handleDelete(notificationId) {
  if (!confirm('Benachrichtigung wirklich löschen?')) return;

  try {
    await deleteNotification(notificationId);
    
    const item = document.querySelector(`[data-id="${notificationId}"]`);
    if (item) {
      item.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => item.remove(), 300);
    }

    // Prüfe ob Liste leer ist
    setTimeout(() => {
      const remaining = document.querySelectorAll('.notification-item').length;
      if (remaining === 0) {
        const container = document.getElementById('notificationsList');
        showEmptyState(container);
      }
    }, 350);
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    alert('Fehler beim Löschen der Benachrichtigung');
  }
}

/**
 * Markiert alle als gelesen
 */
async function handleMarkAllRead() {
  if (!confirm('Alle Benachrichtigungen als gelesen markieren?')) return;

  try {
    await markAllAsRead();
    
    // Aktualisiere UI
    document.querySelectorAll('.notification-item.unread').forEach(item => {
      item.classList.remove('unread');
      const markReadBtn = item.querySelector('[data-action="mark-read"]');
      if (markReadBtn) {
        markReadBtn.remove();
      }
    });
  } catch (error) {
    console.error("Fehler beim Markieren aller als gelesen:", error);
    alert('Fehler beim Markieren der Benachrichtigungen');
  }
}

/**
 * Toggle Filter-Anzeige
 */
function toggleFilter() {
  const filterOptions = document.getElementById('filterOptions');
  if (filterOptions.style.display === 'none') {
    filterOptions.style.display = 'flex';
  } else {
    filterOptions.style.display = 'none';
  }
}

/**
 * Behandelt Filter-Änderung
 */
function handleFilterChange(filter) {
  currentFilter = filter;
  
  // Update UI
  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.classList.toggle('active', tag.dataset.filter === filter);
  });

  // Lade gefilterte Benachrichtigungen
  loadNotifications();
}

/**
 * Fügt neue Benachrichtigung am Anfang hinzu
 */
function prependNotification(notification) {
  const container = document.getElementById('notificationsList');
  
  // Entferne Empty State falls vorhanden
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Erstelle Element
  const div = document.createElement('div');
  div.innerHTML = renderNotification(notification);
  const notificationElement = div.firstElementChild;
  
  // Füge am Anfang ein
  container.insertBefore(notificationElement, container.firstChild);
  
  // Animation
  notificationElement.style.animation = 'slideIn 0.3s ease-out';
  
  // Füge Event Listeners hinzu
  attachNotificationListeners();
}

/**
 * Zeigt Toast für neue Benachrichtigung
 */
function showNotificationToast(notification) {
  // Hier könntest du eine Toast-Notification anzeigen
  console.log("🔔 Neue Benachrichtigung:", notification.title);
}

/**
 * Zeigt Empty State
 */
function showEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <h3>Keine Benachrichtigungen</h3>
      <p>Du bist auf dem neuesten Stand!</p>
    </div>
  `;
}

/**
 * Zeigt Error State
 */
function showErrorState(container) {
  container.innerHTML = `
    <div class="error-state">
      <h3>Fehler beim Laden</h3>
      <p>Benachrichtigungen konnten nicht geladen werden.</p>
      <button onclick="location.reload()" class="action-btn secondary" style="margin-top: 16px;">
        Erneut versuchen
      </button>
    </div>
  `;
}

/**
 * Berechnet "vor X Minuten/Stunden/Tagen"
 */
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  
  return date.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// Cleanup bei Seitenverlassen
window.addEventListener('beforeunload', async () => {
  if (subscription) {
    await unsubscribeFromNotifications(subscription);
  }
});

// Initialisiere wenn DOM geladen
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// CSS für Animationen hinzufügen
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`;
document.head.appendChild(style);

console.log("✅ notificationsPage.js Modul vollständig geladen");