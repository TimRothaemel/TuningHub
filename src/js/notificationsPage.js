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
    this.init();
  }

  async init() {
    await this.loadNotifications();
    this.setupEventListeners();
    this.renderNotifications();
  }

  async loadNotifications() {
    const loadingState = document.getElementById('loadingState');
    loadingState.style.display = 'block';

    try {
      this.notifications = await getNotifications(false, 100);
      console.log('Geladene Benachrichtigungen:', this.notifications);
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
      this.showError('Fehler beim Laden der Benachrichtigungen');
    } finally {
      loadingState.style.display = 'none';
    }
  }

  setupEventListeners() {
    // Alle als gelesen markieren
    document.getElementById('markAllReadBtn').addEventListener('click', async () => {
      const success = await markAllAsRead();
      if (success) {
        await this.loadNotifications();
        this.renderNotifications();
        this.showSuccess('Alle Benachrichtigungen als gelesen markiert');
      } else {
        this.showError('Fehler beim Markieren der Benachrichtigungen');
      }
    });

    // Filter anzeigen/verstecken
    document.getElementById('filterBtn').addEventListener('click', () => {
      const filterOptions = document.getElementById('filterOptions');
      filterOptions.style.display = filterOptions.style.display === 'none' ? 'block' : 'none';
    });

    // Filter-Tags
    document.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.setFilter(filter);
      });
    });
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    document.querySelectorAll('.filter-tag').forEach(tag => {
      tag.classList.toggle('active', tag.dataset.filter === filter);
    });
    
    this.renderNotifications();
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
    const filteredNotifications = this.getFilteredNotifications();

    if (filteredNotifications.length === 0) {
      container.innerHTML = this.getEmptyState();
      return;
    }

    container.innerHTML = filteredNotifications.map(notification => 
      this.createNotificationHTML(notification)
    ).join('');
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

    return `
      <div class="notification-item ${readClass} ${actionClass}" data-id="${notification.id}">
        <div class="notification-content">
          <div class="notification-header">
            <h3 class="notification-title">${notification.title}</h3>
            <span class="notification-date">${date}</span>
          </div>
          <p class="notification-message">${notification.message || ''}</p>
          
          ${notification.requires_action && !notification.action_completed ? `
            <div class="notification-actions">
              <button class="btn-primary" onclick="notificationsPage.showConsentModal('${notification.id}', '${notification.action_type}')">
                Dokument lesen & zustimmen
              </button>
            </div>
          ` : ''}
          
          ${notification.action_url && !notification.requires_action ? `
            <div class="notification-actions">
              <a href="${notification.action_url}" class="btn-secondary" onclick="notificationsPage.markAsRead('${notification.id}')">
                Ansehen
              </a>
            </div>
          ` : ''}
        </div>
        <div class="notification-actions-right">
          ${!notification.read ? `
            <button class="btn-icon" onclick="notificationsPage.markAsRead('${notification.id}')" title="Als gelesen markieren">
              Als gelesen
            </button>
          ` : ''}
          <button class="btn-icon" onclick="notificationsPage.deleteNotification('${notification.id}')" title="Löschen">
            Löschen
          </button>
        </div>
      </div>
    `;
  }

  getEmptyState() {
    return `
      <div class="empty-state">
        <h3>Keine Benachrichtigungen</h3>
        <p>Du hast derzeit keine Benachrichtigungen.</p>
      </div>
    `;
  }

  async markAsRead(notificationId) {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      await this.loadNotifications();
      this.renderNotifications();
    } else {
      this.showError('Fehler beim Markieren der Benachrichtigung');
    }
  }

  async deleteNotification(notificationId) {
    const success = await deleteNotification(notificationId);
    if (success) {
      await this.loadNotifications();
      this.renderNotifications();
      this.showSuccess('Benachrichtigung gelöscht');
    } else {
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
          type: 'privacy_policy'
        };
        break;
      case 'agb':
        documentInfo = {
          title: 'Allgemeine Geschäftsbedingungen (AGB)',
          url: '/src/pages/agbRaw.html',
          type: 'agb'
        };
        break;
      case 'imprint':
        documentInfo = {
          title: 'Impressum',
          url: '/src/pages/impressumRaw.html',
          type: 'imprint'
        };
        break;
      default:
        documentInfo = {
          title: 'Dokument',
          url: '/src/pages/datenschutzRaw.html',
          type: 'privacy_policy'
        };
    }

    // Erstelle Modal
    const modal = document.createElement('div');
    modal.className = 'consent-modal';
    modal.innerHTML = `
      <div class="consent-modal-content">
        <button class="consent-modal-close" onclick="this.closest('.consent-modal').remove()">Schließen</button>
        <h3 class="consent-modal-title">${documentInfo.title} lesen</h3>
        <p class="consent-modal-text">
          Bitte lesen Sie die aktualisierte ${documentInfo.title} sorgfältig durch. 
          Scrollen Sie im folgenden Fenster, um den gesamten Inhalt zu lesen.
        </p>
        
        <div class="document-preview">
          <iframe src="${documentInfo.url}" class="document-iframe"></iframe>
          <div class="scroll-indicator">
            <span>Scrollen Sie, um den gesamten Inhalt zu lesen</span>
          </div>
        </div>
        
        <div class="consent-checkbox">
          <label>
            <input type="checkbox" id="consentCheckbox">
            <span class="checkmark"></span>
            Ich bestätige, dass ich die ${documentInfo.title} vollständig gelesen und verstanden habe
          </label>
        </div>
        
        <div class="consent-modal-buttons">
          <button class="consent-btn consent-btn-cancel" onclick="this.closest('.consent-modal').remove()">
            Später
          </button>
          <button class="consent-btn consent-btn-confirm" id="confirmConsent" disabled>
            Zustimmen
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event Listener für Checkbox
    const checkbox = document.getElementById('consentCheckbox');
    const confirmBtn = document.getElementById('confirmConsent');

    checkbox.addEventListener('change', () => {
      confirmBtn.disabled = !checkbox.checked;
    });

    // Event Listener für Zustimmungsbutton
    confirmBtn.addEventListener('click', async () => {
      const success = await completeNotificationAction(notificationId, documentInfo.type, '1.0');
      
      if (success) {
        this.showSuccess('Vielen Dank für Ihre Zustimmung!');
        modal.remove();
        await this.loadNotifications();
        this.renderNotifications();
      } else {
        this.showError('Fehler beim Speichern der Zustimmung. Bitte versuchen Sie es erneut.');
      }
    });

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
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      z-index: 10000;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 3000);
  }
}

// Globale Instanz für Event Handler
window.notificationsPage = new NotificationsPage();