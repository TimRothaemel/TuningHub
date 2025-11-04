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
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ User nicht authentifiziert");
      throw new Error('Nicht authentifiziert');
    }

    console.log("👤 User ID:", user.id);

    // 1. Speichere Consent in profiles Tabelle
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Setze das richtige Consent-Feld basierend auf dem Typ
    switch (consentType) {
      case 'privacy_policy':
        updateData.privacy_consent = true;
        updateData.privacy_consent_date = new Date().toISOString();
        console.log("Setze privacy_consent");
        break;
      case 'agb':
      case 'terms':
        updateData.agb_consent = true;
        updateData.agb_consent_date = new Date().toISOString();
        console.log("📋 Setze agb_consent");
        break;
      default:
        console.warn('⚠️ Unbekannter Consent-Typ:', consentType);
    }

    console.log("💾 Update Data:", updateData);

    const { data: profileData, error: consentError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select();

    if (consentError) {
      console.error("❌ Fehler beim Speichern des Consents:", consentError);
      throw consentError;
    }

    console.log("✅ Consent gespeichert:", profileData);

    // 2. Aktualisiere Benachrichtigung
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .update({
        read: true,
        action_completed: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select();

    if (notifError) {
      console.error("❌ Fehler beim Aktualisieren der Benachrichtigung:", notifError);
      throw notifError;
    }

    console.log("✅ Benachrichtigung aktualisiert:", notifData);
    console.log("🎉 Alles erfolgreich abgeschlossen!");
    
    return true;
  } catch (error) {
    console.error("❌ Fehler in completeNotificationAction:", error);
    return false;
  }
}

/**
 * Sendet System-Benachrichtigung an alle User
 */
export async function sendSystemNotificationToAll(notificationData) {
  try {
    console.log("Sende System-Benachrichtigung an alle User:", notificationData);
    
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
    title: 'AGBs aktualisiert',
    message: 'Unsere Allgemeinen Geschäftsbedingungen wurden aktualisiert. Bitte lies sie durch und stimme zu.',
    requiresAction: true,
    actionType: 'agb'
  });
}

export async function notifyImprintUpdate(version = '1.0') {
  return await sendSystemNotificationToAll({
    type: 'imprint',
    title: 'Impressum aktualisiert',
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