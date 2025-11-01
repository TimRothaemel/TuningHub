console.log("notifications.js geladen");

import { supabase } from "./supabaseClient.js";

/**
 * Lädt alle Benachrichtigungen für den aktuellen User
 * @param {boolean} unreadOnly - Nur ungelesene Benachrichtigungen
 * @param {number} limit - Maximale Anzahl
 * @returns {Promise<Array>}
 */
export async function getNotifications(unreadOnly = false, limit = 50) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return [];

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Fehler beim Laden der Benachrichtigungen:", error);
    return [];
  }
}

/**
 * Erstellt eine neue Benachrichtigung über Database Function
 * @param {string} userId - Empfänger User-ID
 * @param {Object} notificationData - Benachrichtigungsdaten
 * @returns {Promise<Object|null>}
 */
export async function createNotification(userId, notificationData) {
  try {
    console.log("🔨 Erstelle Benachrichtigung:", { userId, notificationData });
    
    // Nutze die Database Function statt direktem INSERT
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: notificationData.type,
      p_title: notificationData.title,
      p_message: notificationData.message || null,
      p_related_id: notificationData.relatedId || null,
      p_related_type: notificationData.relatedType || null,
      p_action_url: notificationData.actionUrl || null
    });

    if (error) {
      console.error("❌ Fehler beim Erstellen der Benachrichtigung:", error);
      throw error;
    }
    
    console.log("✅ Benachrichtigung erstellt, ID:", data);
    return { id: data };
  } catch (error) {
    console.error("❌ Fehler beim Erstellen der Benachrichtigung:", error);
    return null;
  }
}

/**
 * Markiert eine Benachrichtigung als gelesen
 * @param {string} notificationId - Benachrichtigungs-ID
 * @returns {Promise<boolean>}
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Fehler beim Markieren als gelesen:", error);
    return false;
  }
}

/**
 * Markiert alle Benachrichtigungen als gelesen
 * @returns {Promise<boolean>}
 */
export async function markAllAsRead() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return false;

    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Fehler beim Markieren aller als gelesen:", error);
    return false;
  }
}

/**
 * Löscht eine Benachrichtigung
 * @param {string} notificationId - Benachrichtigungs-ID
 * @returns {Promise<boolean>}
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Fehler beim Löschen der Benachrichtigung:", error);
    return false;
  }
}

/**
 * Zählt ungelesene Benachrichtigungen
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Fehler beim Zählen ungelesener Benachrichtigungen:", error);
    return 0;
  }
}

/**
 * Abonniert Echtzeit-Updates für Benachrichtigungen
 * @param {Function} callback - Callback für neue Benachrichtigungen
 * @returns {Promise<RealtimeChannel|null>}
 */
export async function subscribeToNotifications(callback) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return null;

    return supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();
  } catch (error) {
    console.error("Fehler beim Abonnieren der Benachrichtigungen:", error);
    return null;
  }
}

/**
 * Beendet eine Benachrichtigungs-Subscription
 * @param {RealtimeChannel} subscription - Die Subscription
 */
export async function unsubscribeFromNotifications(subscription) {
  if (subscription) {
    await supabase.removeChannel(subscription);
  }
}

/**
 * Erstellt Benachrichtigung für neue Chat-Nachricht
 * @param {string} recipientId - Empfänger User-ID
 * @param {string} senderId - Sender User-ID
 * @param {string} chatId - Chat-ID
 * @param {string} messagePreview - Vorschau der Nachricht
 * @returns {Promise<Object|null>}
 */
export async function notifyNewChatMessage(recipientId, senderId, chatId, messagePreview) {
  try {
    // Hole Sender-Info
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.username || 'Jemand';
    
    return await createNotification(recipientId, {
      type: 'chat_message',
      title: `Neue Nachricht von ${senderName}`,
      message: messagePreview.substring(0, 100),
      relatedId: chatId,
      relatedType: 'chat',
      actionUrl: `/src/pages/chat.html?chat=${chatId}`
    });
  } catch (error) {
    console.error("Fehler beim Erstellen der Chat-Benachrichtigung:", error);
    return null;
  }
}

/**
 * Sendet System-Benachrichtigung an alle User oder bestimmte User
 * @param {string|null} userId - Spezifischer User oder null für alle
 * @param {Object} notificationData - Benachrichtigungsdaten
 * @returns {Promise<boolean>}
 */
export async function sendSystemNotification(userId, notificationData) {
  try {
    if (userId) {
      // An einen spezifischen User
      await createNotification(userId, {
        type: 'system',
        ...notificationData
      });
    } else {
      // An alle User (Admin-Funktion)
      const { data: users } = await supabase
        .from('profiles')
        .select('id');

      if (users) {
        const notifications = users.map(user => ({
          user_id: user.id,
          type: 'system',
          title: notificationData.title,
          message: notificationData.message,
          action_url: notificationData.actionUrl || null,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }
    }
    return true;
  } catch (error) {
    console.error("Fehler beim Senden der System-Benachrichtigung:", error);
    return false;
  }
}

/**
 * Benachrichtigt User über verkauftes Teil
 * @param {string} userId - User-ID
 * @param {string} partTitle - Titel des Teils
 * @param {string} partId - Teil-ID
 * @returns {Promise<Object|null>}
 */
export async function notifyPartSold(userId, partTitle, partId) {
  return await createNotification(userId, {
    type: 'part_sold',
    title: 'Teil verkauft!',
    message: `Dein Teil "${partTitle}" wurde verkauft`,
    relatedId: partId,
    relatedType: 'part',
    actionUrl: `/src/pages/parts-detail.html?id=${partId}`
  });
}

/**
 * Benachrichtigt User über neue AGBs
 * @param {string|null} userId - User-ID oder null für alle
 * @returns {Promise<boolean>}
 */
export async function notifyAGBUpdate(userId = null) {
  return await sendSystemNotification(userId, {
    title: 'AGBs aktualisiert',
    message: 'Unsere Allgemeinen Geschäftsbedingungen wurden aktualisiert. Bitte lies sie durch.',
    actionUrl: '/src/pages/agb.html'
  });
}

/**
 * Benachrichtigt User über favorisiertes Teil (Preisänderung, Verfügbarkeit)
 * @param {string} userId - User-ID
 * @param {string} partTitle - Titel des Teils
 * @param {string} partId - Teil-ID
 * @param {string} reason - Grund ('price_drop', 'back_in_stock')
 * @returns {Promise<Object|null>}
 */
export async function notifyFavoritePart(userId, partTitle, partId, reason = 'update') {
  const messages = {
    price_drop: `Der Preis für "${partTitle}" wurde reduziert!`,
    back_in_stock: `"${partTitle}" ist wieder verfügbar!`,
    update: `Es gibt Updates zu "${partTitle}"`
  };

  return await createNotification(userId, {
    type: 'favorite_update',
    title: 'Update zu favorisiertem Teil',
    message: messages[reason] || messages.update,
    relatedId: partId,
    relatedType: 'part',
    actionUrl: `/src/pages/parts-detail.html?id=${partId}`
  });
}
/**
 * Sendet System-Benachrichtigung an alle User (Admin-Funktion)
 * @param {Object} notificationData - Benachrichtigungsdaten
 * @returns {Promise<number>} Anzahl der erstellten Benachrichtigungen
 */
export async function sendSystemNotificationToAll(notificationData) {
  try {
    console.log("📢 Sende System-Benachrichtigung an alle User:", notificationData);
    
    const { data, error } = await supabase.rpc('create_system_notification_for_all', {
      p_type: notificationData.type || 'system',
      p_title: notificationData.title,
      p_message: notificationData.message,
      p_action_url: notificationData.actionUrl || null,
      p_requires_action: notificationData.requiresAction || false,
      p_action_type: notificationData.actionType || null
    });

    if (error) {
      console.error("❌ Fehler beim Senden der System-Benachrichtigung:", error);
      throw error;
    }
    
    console.log(`✅ ${data} Benachrichtigungen erstellt`);
    return data;
  } catch (error) {
    console.error("❌ Fehler:", error);
    return 0;
  }
}

/**
 * Markiert eine Benachrichtigung mit Aktion als abgeschlossen und erstellt Zustimmung
 * @param {string} notificationId - Benachrichtigungs-ID
 * @param {string} consentType - Art der Zustimmung ('privacy_policy', 'imprint', 'terms')
 * @param {string} version - Version des Dokuments
 * @returns {Promise<boolean>}
 */
export async function completeNotificationAction(notificationId, consentType, version) {
  try {
    console.log("✅ Schließe Benachrichtigungs-Aktion ab:", { notificationId, consentType, version });
    
    const { data, error } = await supabase.rpc('complete_notification_action', {
      p_notification_id: notificationId,
      p_consent_type: consentType,
      p_consent_version: version
    });

    if (error) {
      console.error("❌ Fehler beim Abschließen der Aktion:", error);
      throw error;
    }
    
    console.log("✅ Aktion abgeschlossen und Benachrichtigung gelöscht");
    return data;
  } catch (error) {
    console.error("❌ Fehler:", error);
    return false;
  }
}

/**
 * Prüft ob User bereits zugestimmt hat
 * @param {string} consentType - Art der Zustimmung
 * @param {string} version - Version
 * @returns {Promise<boolean>}
 */
export async function hasUserConsented(consentType, version) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return false;

    const { data, error } = await supabase
      .from('user_consents')
      .select('id')
      .eq('user_id', user.id)
      .eq('consent_type', consentType)
      .eq('version', version)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Benachrichtigt alle User über neue Datenschutzerklärung
 * @param {string} version - Version der Datenschutzerklärung
 * @returns {Promise<number>}
 */
export async function notifyPrivacyPolicyUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'privacy_policy',
    title: 'Neue Datenschutzerklärung',
    message: 'Unsere Datenschutzerklärung wurde aktualisiert. Bitte lies sie durch und stimme zu.',
    actionUrl: `/src/pages/datenschutz.html?version=${version}&notification=true`,
    requiresAction: true,
    actionType: 'privacy_policy'
  });
}

/**
 * Benachrichtigt alle User über neues Impressum
 * @param {string} version - Version des Impressums
 * @returns {Promise<number>}
 */
export async function notifyImprintUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'imprint',
    title: 'Neues Impressum',
    message: 'Unser Impressum wurde aktualisiert. Bitte lies es durch und stimme zu.',
    actionUrl: `/src/pages/impressum.html?version=${version}&notification=true`,
    requiresAction: true,
    actionType: 'imprint'
  });
}

/**
 * Benachrichtigt alle User über neue AGBs
 * @param {string} version - Version der AGBs
 * @returns {Promise<number>}
 */
export async function notifyTermsUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'terms',
    title: 'Neue Allgemeine Geschäftsbedingungen',
    message: 'Unsere AGBs wurden aktualisiert. Bitte lies sie durch und stimme zu.',
    actionUrl: `/src/pages/agb.html?version=${version}&notification=true`,
    requiresAction: true,
    actionType: 'terms'
  });
}

// Export als Standard-Objekt für einfacheren Import
export default {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  notifyNewChatMessage,
  sendSystemNotification,
  notifyPartSold,
  notifyAGBUpdate,
  notifyFavoritePart,
  notifyPrivacyPolicyUpdate,
  notifyImprintUpdate,
  notifyTermsUpdate
};

console.log("✅ notifications.js Modul vollständig geladen");