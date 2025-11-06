console.log("chatGroups.js wird geladen...");

import { supabase } from "./supabaseClient.js";
import { notifyNewChatMessage } from "./notifications.js";

/**
 * Lädt die globale Community-Gruppe
 * @returns {Promise<Object|null>}
 */
export async function getGlobalGroup() {
  try {
    const { data, error } = await supabase
      .from('chat_groups')
      .select('*')
      .eq('is_global', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Fehler beim Laden der globalen Gruppe:", error);
    return null;
  }
}

/**
 * Lädt alle Gruppen des Users
 * @returns {Promise<Array>}
 */
export async function loadUserGroups() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return [];

    const { data: groups, error } = await supabase
      .from('chat_groups')
      .select(`
        id,
        name,
        description,
        is_global,
        last_message_at,
        created_at
      `)
      .in('id', 
        supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
      )
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return groups || [];
  } catch (error) {
    console.error("Fehler beim Laden der Gruppen:", error);
    return [];
  }
}

/**
 * Sendet eine Gruppennachricht
 * @param {string} groupId - Die Gruppen-ID
 * @param {string} message - Die Nachricht
 * @returns {Promise<boolean>}
 */
export async function sendGroupMessage(groupId, message) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Nicht authentifiziert");
    }

    console.log("📤 Sende Gruppennachricht:", { groupId, message: message.substring(0, 50) });

    // Nachricht senden
    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert([{
        group_id: groupId,
        sender_id: user.id,
        message: message.trim(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update last_message_at der Gruppe
    await supabase
      .from('chat_groups')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', groupId);

    console.log("✅ Gruppennachricht gesendet");

    // Benachrichtigungen für alle Gruppenmitglieder (außer Sender)
    try {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .neq('user_id', user.id);

      if (members && members.length > 0) {
        // Erstelle Benachrichtigungen für alle anderen Mitglieder
        const notifications = members.map(member => ({
          user_id: member.user_id,
          type: 'group_message',
          title: 'Neue Gruppennachricht',
          message: message.substring(0, 100),
          related_id: groupId,
          created_at: new Date().toISOString()
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifyError) {
      console.error("⚠️ Fehler bei Benachrichtigungen:", notifyError);
    }

    return true;
  } catch (error) {
    console.error("❌ Fehler beim Senden der Gruppennachricht:", error);
    return false;
  }
}

/**
 * Lädt Gruppennachrichten
 * @param {string} groupId - Die Gruppen-ID
 * @param {number} limit - Maximale Anzahl
 * @returns {Promise<Array>}
 */
export async function loadGroupMessages(groupId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          username:profiles(username)
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Fehler beim Laden der Gruppennachrichten:", error);
    return [];
  }
}

/**
 * Abonniert Echtzeit-Updates für eine Gruppe
 * @param {string} groupId - Die Gruppen-ID
 * @param {Function} callback - Callback für neue Nachrichten
 * @returns {RealtimeChannel}
 */
export function subscribeToGroup(groupId, callback) {
  return supabase
    .channel(`group-${groupId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `group_id=eq.${groupId}`
    }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
}

/**
 * Lädt Gruppenmitglieder
 * @param {string} groupId - Die Gruppen-ID
 * @returns {Promise<Array>}
 */
export async function getGroupMembers(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        joined_at,
        user:user_id (
          id,
          profile:profiles(username, account_type)
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Fehler beim Laden der Gruppenmitglieder:", error);
    return [];
  }
}

/**
 * Zählt Gruppenmitglieder
 * @param {string} groupId - Die Gruppen-ID
 * @returns {Promise<number>}
 */
export async function getGroupMemberCount(groupId) {
  try {
    const { count, error } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Fehler beim Zählen der Gruppenmitglieder:", error);
    return 0;
  }
}

/**
 * Tritt einer Gruppe bei (für nicht-globale Gruppen)
 * @param {string} groupId - Die Gruppen-ID
 * @returns {Promise<boolean>}
 */
export async function joinGroup(groupId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Nicht authentifiziert");
    }

    const { error } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: user.id,
        joined_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Fehler beim Beitreten der Gruppe:", error);
    return false;
  }
}

/**
 * Verlässt eine Gruppe (nur für nicht-globale Gruppen)
 * @param {string} groupId - Die Gruppen-ID
 * @returns {Promise<boolean>}
 */
export async function leaveGroup(groupId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Nicht authentifiziert");
    }

    // Prüfe ob Gruppe global ist
    const { data: group } = await supabase
      .from('chat_groups')
      .select('is_global')
      .eq('id', groupId)
      .single();

    if (group && group.is_global) {
      throw new Error("Globale Gruppen können nicht verlassen werden");
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Fehler beim Verlassen der Gruppe:", error);
    return false;
  }
}

export default {
  getGlobalGroup,
  loadUserGroups,
  sendGroupMessage,
  loadGroupMessages,
  subscribeToGroup,
  getGroupMembers,
  getGroupMemberCount,
  joinGroup,
  leaveGroup
};

console.log("✅ chatGroups.js geladen");