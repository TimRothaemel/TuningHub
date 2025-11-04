import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllAsRead, 
  deleteNotification,
  completeNotificationAction
} from './notifications.js';

class NotificationsPage {
  constructor() {
    this.notifications = [];
    this.currentFilter = 'all';
    this.isInitialized = false;
    
    // Warte auf DOM Ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      setTimeout(() => this.init(), 100);
    }
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      await this.loadNotifications();
      this.setupEventListeners();
      this.renderNotifications();
      this.isInitialized = true;
      console.log('NotificationsPage erfolgreich initialisiert');
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
      this.showError('Fehler beim Laden der Benachrichtigungen');
    }
  }

  async loadNotifications() {
    const loadingState = document.getElementById('loadingState');
    
    // Überprüfe ob das Element existiert
    if (loadingState) {
      loadingState.style.display = 'block';
    }

    try {
      this.notifications = await getNotifications(false, 100);
      console.log('Geladene Benachrichtigungen:', this.notifications);
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
      this.showError('Fehler beim Laden der Benachrichtigungen');
    } finally {
      // Überprüfe erneut ob das Element existiert
      if (loadingState) {
        loadingState.style.display = 'none';
      }
    }
  }

  setupEventListeners() {
    // Alle als gelesen markieren
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async () => {
        const success = await markAllAsRead();
        if (success) {
          await this.loadNotifications();
          this.renderNotifications();
          this.showSuccess('Alle Benachrichtigungen als gelesen markiert');
        } else {
          this.showError('Fehler beim Markieren der Benachrichtigungen');
        }
      });
    }

    // Filter anzeigen/verstecken
    const filterBtn = document.getElementById('filterBtn');
    const filterOptions = document.getElementById('filterOptions');
    
    if (filterBtn && filterOptions) {
      filterBtn.addEventListener('click', () => {
        const isVisible = filterOptions.style.display === 'block';
        filterOptions.style.display = isVisible ? 'none' : 'block';
      });

      // Schließe Filter-Optionen wenn außerhalb geklickt wird
      document.addEventListener('click', (e) => {
        if (!filterBtn.contains(e.target) && !filterOptions.contains(e.target)) {
          filterOptions.style.display = 'none';
        }
      });
    }

    // Filter-Tags
    document.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.setFilter(filter);
        
        // Verstecke Filter-Optionen nach Auswahl
        if (filterOptions) {
          filterOptions.style.display = 'none';
        }
      });
    });

    // Globaler Klick-Listener für Modals
    document.addEventListener('click', (e) => {
      // Schließe Modal wenn außerhalb geklickt wird
      if (e.target.classList.contains('consent-modal')) {
        e.target.remove();
      }
      
      // Schließe Modal mit Close-Button
      if (e.target.closest('.consent-modal-close')) {
        e.target.closest('.consent-modal').remove();
      }
    });
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    // Update aktiven Filter-Button
    document.querySelectorAll('.filter-tag').forEach(tag => {
      tag.classList.toggle('active', tag.dataset.filter === filter);
    });
    
    this.renderNotifications();
    
    // Update angezeigten Filter-Text
    const filterText = document.getElementById('filterText');
    if (filterText) {
      const filterNames = {
        'all': 'Alle',
        'unread': 'Ungelesen',
        'privacy_policy': 'Datenschutz',
        'agb': 'AGB',
        'imprint': 'Impressum'
      };
      filterText.textContent = filterNames[filter] || 'Alle';
    }
  }

  getFilteredNotifications() {
    if (this.currentFilter === 'all') {
      return this.notifications;
    }

    if (this.currentFilter === 'unread') {
      return this.notifications.filter(n => !n.read);
    }

    return this.notifications.filter(n => n.type === this.currentFilter);
  }

  renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) {
      console.error('Notifications container nicht gefunden');
      return;
    }

    const filteredNotifications = this.getFilteredNotifications();

    if (filteredNotifications.length === 0) {
      container.innerHTML = this.getEmptyState();
      return;
    }

    container.innerHTML = filteredNotifications.map(notification => 
      this.createNotificationHTML(notification)
    ).join('');

    // Update Counter
    this.updateNotificationCounters();
  }

  createNotificationHTML(notification) {
    const date = new Date(notification.created_at).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const readClass = notification.read ? 'read' : 'unread';
    const actionClass = notification.requires_action ? 'requires-action' : '';
    const priorityClass = notification.priority ? `priority-${notification.priority}` : '';

    // Escape HTML in Text-Inhalten zur Sicherheit
    const escapeHTML = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    return `
      <div class="notification-item ${readClass} ${actionClass} ${priorityClass}" data-id="${notification.id}">
        <div class="notification-content">
          <div class="notification-header">
            <h3 class="notification-title">${escapeHTML(notification.title)}</h3>
            <span class="notification-date">${date}</span>
          </div>
          <p class="notification-message">${escapeHTML(notification.message || '')}</p>
          
          ${notification.requires_action && !notification.action_completed ? `
            <div class="notification-actions">
              <button class="btn-primary" onclick="window.notificationsPage.showConsentModal('${notification.id}', '${notification.action_type}')">
                Dokument lesen & zustimmen
              </button>
            </div>
          ` : ''}
          
          ${notification.action_url && !notification.requires_action ? `
            <div class="notification-actions">
              <a href="${notification.action_url}" class="btn-secondary" onclick="window.notificationsPage.markAsRead('${notification.id}')">
                Ansehen
              </a>
            </div>
          ` : ''}
        </div>
        <div class="notification-actions-right">
          ${!notification.read ? `
            <button class="btn-icon" onclick="window.notificationsPage.markAsRead('${notification.id}')" title="Als gelesen markieren">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
              </svg>
              Als gelesen
            </button>
          ` : ''}
          <button class="btn-icon btn-delete" onclick="window.notificationsPage.deleteNotification('${notification.id}')" title="Löschen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
            </svg>
            Löschen
          </button>
        </div>
      </div>
    `;
  }

  getEmptyState() {
    const emptyMessages = {
      'all': 'Du hast derzeit keine Benachrichtigungen.',
      'unread': 'Du hast keine ungelesenen Benachrichtigungen.',
      'privacy_policy': 'Keine Datenschutz-Benachrichtigungen.',
      'agb': 'Keine AGB-Benachrichtigungen.',
      'imprint': 'Keine Impressum-Benachrichtigungen.'
    };

    const message = emptyMessages[this.currentFilter] || emptyMessages['all'];

    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
          </svg>
        </div>
        <h3>Keine Benachrichtigungen</h3>
        <p>${message}</p>
      </div>
    `;
  }

  updateNotificationCounters() {
    const totalCount = this.notifications.length;
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    // Update Badges falls vorhanden
    const totalBadge = document.getElementById('totalCount');
    const unreadBadge = document.getElementById('unreadCount');
    
    if (totalBadge) {
      totalBadge.textContent = totalCount;
      totalBadge.style.display = totalCount > 0 ? 'inline' : 'none';
    }
    
    if (unreadBadge) {
      unreadBadge.textContent = unreadCount;
      unreadBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
  }

  async markAsRead(notificationId) {
    try {
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        // Optimiere: Aktualisiere lokal statt neu zu laden
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
        }
        this.renderNotifications();
        this.showSuccess('Benachrichtigung als gelesen markiert');
      } else {
        this.showError('Fehler beim Markieren der Benachrichtigung');
      }
    } catch (error) {
      console.error('Fehler in markAsRead:', error);
      this.showError('Fehler beim Markieren der Benachrichtigung');
    }
  }

  async deleteNotification(notificationId) {
    // Bestätigungs-Dialog
    if (!confirm('Möchten Sie diese Benachrichtigung wirklich löschen?')) {
      return;
    }

    try {
      const success = await deleteNotification(notificationId);
      if (success) {
        // Optimiere: Entferne lokal statt neu zu laden
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.renderNotifications();
        this.showSuccess('Benachrichtigung gelöscht');
      } else {
        this.showError('Fehler beim Löschen der Benachrichtigung');
      }
    } catch (error) {
      console.error('Fehler in deleteNotification:', error);
      this.showError('Fehler beim Löschen der Benachrichtigung');
    }
  }

  showConsentModal(notificationId, actionType) {
    // Bestimme Dokument-Informationen basierend auf Aktionstyp
    let documentInfo = {};
    
    switch (actionType) {
      case 'privacy_policy':
        documentInfo = {
          title: 'Datenschutzerklärung',
          url: '/src/pages/datenschutzRaw.html',
          type: 'privacy_policy',
          version: '1.0'
        };
        break;
      case 'agb':
        documentInfo = {
          title: 'Allgemeine Geschäftsbedingungen (AGB)',
          url: '/src/pages/agbRaw.html',
          type: 'agb',
          version: '1.0'
        };
        break;
      case 'imprint':
        documentInfo = {
          title: 'Impressum',
          url: '/src/pages/impressumRaw.html',
          type: 'imprint',
          version: '1.0'
        };
        break;
      default:
        documentInfo = {
          title: 'Dokument',
          url: '/src/pages/datenschutzRaw.html',
          type: 'privacy_policy',
          version: '1.0'
        };
    }

    // Erstelle Modal
    const modal = document.createElement('div');
    modal.className = 'consent-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
      <div class="consent-modal-content" style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease;
      ">
        <div class="consent-modal-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        ">
          <h3 class="consent-modal-title" style="margin: 0; font-size: 1.5rem; color: #1f2937;">
            ${documentInfo.title} lesen
          </h3>
          <button class="consent-modal-close" style="
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 4px;
            color: #6b7280;
          ">&times;</button>
        </div>
        
        <p class="consent-modal-text" style="
          color: #6b7280;
          margin-bottom: 20px;
          line-height: 1.5;
        ">
          Bitte lesen Sie die aktualisierte ${documentInfo.title} sorgfältig durch. 
          Scrollen Sie im folgenden Fenster, um den gesamten Inhalt zu lesen.
        </p>
        
        <div class="document-preview" style="
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
          position: relative;
        ">
          <iframe 
            src="${documentInfo.url}" 
            class="document-iframe"
            style="
              width: 100%;
              height: 400px;
              border: none;
            "
            onload="this.style.height = this.contentWindow.document.body.scrollHeight + 'px'"
          ></iframe>
          <div class="scroll-indicator" style="
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.875rem;
            animation: bounce 2s infinite;
          ">
            <span>Scrollen Sie, um den gesamten Inhalt zu lesen</span>
          </div>
        </div>
        
               <div class="consent-checkbox" style="margin-bottom: 20px;">
          <label style="
            display: flex;
            align-items: start;
            cursor: pointer;
            font-weight: 500;
            color: #374151;
            user-select: none;
          ">
            <input 
              type="checkbox" 
              id="consentCheckbox"
              style="
                margin-right: 12px;
                margin-top: 2px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                flex-shrink: 0;
                display: block !important;
                accent-color: #3b82f6;
              "
            >
            <span style="font-size: 1rem; line-height: 1.5;">
              Ich bestätige, dass ich die <strong>${documentInfo.title}</strong> vollständig gelesen und verstanden habe
            </span>
          </label>
        </div>
        
        <div class="consent-modal-buttons" style="
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        ">
          <button class="consent-btn consent-btn-cancel" style="
            padding: 12px 24px;
            border: 1px solid #d1d5db;
            background: white;
            color: #374151;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            transition: all 0.2s;
          ">Später</button>
          <button class="consent-btn consent-btn-confirm" id="confirmConsent" disabled style="
            padding: 12px 24px;
            border: none;
            background: #3b82f6;
            color: white;
            border-radius: 8px;
            cursor: not-allowed;
            font-weight: 500;
            font-size: 1rem;
            opacity: 0.6;
            transition: all 0.2s;
          ">Zustimmen</button>
        </div>
      </div>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40% { transform: translateX(-50%) translateY(-5px); }
          60% { transform: translateX(-50%) translateY(-3px); }
        }
        
        .consent-btn-confirm:not(:disabled) {
          opacity: 1 !important;
          cursor: pointer !important;
        }
        
        .consent-btn-confirm:not(:disabled):hover {
          background: #2563eb !important;
          transform: translateY(-1px);
        }
        
        .consent-btn-cancel:hover {
          background: #f9fafb !important;
          border-color: #9ca3af !important;
        }

        /* Checkbox Styling Verbesserungen */
        #consentCheckbox:checked {
          accent-color: #3b82f6;
        }

        .consent-checkbox label:hover {
          color: #1f2937;
        }
      </style>
    `;

    document.body.appendChild(modal);

    // Event Listener für Checkbox
    const checkbox = document.getElementById('consentCheckbox');
    const confirmBtn = document.getElementById('confirmConsent');

    if (checkbox && confirmBtn) {
      checkbox.addEventListener('change', () => {
        confirmBtn.disabled = !checkbox.checked;
        confirmBtn.style.opacity = checkbox.checked ? '1' : '0.6';
        confirmBtn.style.cursor = checkbox.checked ? 'pointer' : 'not-allowed';
      });

      // Event Listener für Zustimmungsbutton
      confirmBtn.addEventListener('click', async () => {
        if (!checkbox.checked) return;
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Wird verarbeitet...';
        
        try {
          const success = await completeNotificationAction(
            notificationId, 
            documentInfo.type, 
            documentInfo.version
          );
          
          if (success) {
            this.showSuccess('Vielen Dank für Ihre Zustimmung!');
            modal.remove();
            
            // Aktualisiere die Benachrichtigung lokal
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
              notification.requires_action = false;
              notification.action_completed = true;
              notification.read = true;
            }
            
            this.renderNotifications();
          } else {
            throw new Error('API call failed');
          }
        } catch (error) {
          console.error('Fehler beim Speichern der Zustimmung:', error);
          this.showError('Fehler beim Speichern der Zustimmung. Bitte versuchen Sie es erneut.');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Zustimmen';
          confirmBtn.style.opacity = '1';
        }
      });
    }

    // Event Listener für Cancel-Button
    const cancelBtn = modal.querySelector('.consent-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.remove();
      });
    }

    // Markiere Benachrichtigung als gelesen
    this.markAsRead(notificationId);
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    // Entferne vorhandene Nachrichten
    const existingMessages = document.querySelectorAll('.notification-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `notification-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      z-index: 10001;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideInRight 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;
    
    // Füge Animationen hinzu
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        messageDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          if (document.body.contains(messageDiv)) {
            document.body.removeChild(messageDiv);
          }
        }, 300);
      }
    }, 3000);
  }

  // Public Method zum Aktualisieren der Benachrichtigungen
  async refresh() {
    await this.loadNotifications();
    this.renderNotifications();
  }

  // Public Method zum Abrufen des aktuellen Status
  getStatus() {
    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.read).length,
      filter: this.currentFilter
    };
  }
}

// Globale Instanz für Event Handler
window.notificationsPage = new NotificationsPage();

// Export für Module
export default NotificationsPage;