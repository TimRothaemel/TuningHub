console.log("notifications.js geladen");

import { supabase } from "./supabaseClient.js";

/**
 * Lädt alle Benachrichtigungen für den aktuellen User
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
 * Markiert eine Benachrichtigung als gelesen
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
 * Verarbeitet die Zustimmung für eine Benachrichtigung
 */
export async function completeNotificationAction(notificationId, consentType, version = '1.0') {
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
    
    console.log("✅ Aktion abgeschlossen und Zustimmung gespeichert");
    return data;
  } catch (error) {
    console.error("❌ Fehler:", error);
    return false;
  }
}

/**
 * Sendet System-Benachrichtigung an alle User
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

// Admin-Funktionen für System-Benachrichtigungen
export async function notifyPrivacyPolicyUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'privacy_policy',
    title: 'Datenschutzerklärung aktualisiert',
    message: 'Unsere Datenschutzerklärung wurde aktualisiert. Bitte lies sie durch und stimme zu.',
    requiresAction: true,
    actionType: 'privacy_policy'
  });
}

export async function notifyTermsUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'terms',
    title: '📋 AGBs aktualisiert',
    message: 'Unsere Allgemeinen Geschäftsbedingungen wurden aktualisiert. Bitte lies sie durch und stimme zu.',
    requiresAction: true,
    actionType: 'agb'
  });
}

export async function notifyImprintUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'imprint',
    title: '📄 Impressum aktualisiert',
    message: 'Unser Impressum wurde aktualisiert.',
    requiresAction: false
  });
}

export default {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  completeNotificationAction,
  notifyPrivacyPolicyUpdate,
  notifyImprintUpdate,
  notifyTermsUpdate
};