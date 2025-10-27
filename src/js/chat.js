console.log("chat.js geladen");

import { supabase } from "./supabaseClient.js";

/**
 * Öffnet einen Chat mit einem Verkäufer
 * @param {string} sellerId - Die ID des Verkäufers
 * @param {string} teilId - Die ID des Teils (optional)
 * @returns {Promise<void>}
 */
export async function openChat(sellerId, teilId = null) {
  console.log("📧 openChat aufgerufen:", { sellerId, teilId });

  try {
    // 1. Aktuellen User prüfen
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      alert("Bitte melde dich an, um den Chat zu nutzen");
      window.location.href = "/src/pages/login.html";
      return;
    }

    // 2. Prüfen ob User mit sich selbst chatten will
    if (user.id === sellerId) {
      alert("Du kannst nicht mit dir selbst chatten");
      return;
    }

    console.log("✅ User authentifiziert:", user.id);

    // 3. Existierenden Chat suchen
    const { data: existingChats, error: searchError } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${sellerId}),and(user1_id.eq.${sellerId},user2_id.eq.${user.id})`)
      .limit(1);

    if (searchError) {
      console.error("❌ Fehler beim Suchen des Chats:", searchError);
      throw searchError;
    }

    let chatId;

    if (existingChats && existingChats.length > 0) {
      // Chat existiert bereits
      chatId = existingChats[0].id;
      console.log("✅ Existierender Chat gefunden:", chatId);
    } else {
      // Neuen Chat erstellen
      console.log("📝 Erstelle neuen Chat...");
      
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          user1_id: user.id,
          user2_id: sellerId,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error("❌ Fehler beim Erstellen des Chats:", createError);
        throw createError;
      }

      chatId = newChat.id;
      console.log("✅ Neuer Chat erstellt:", chatId);

      // Optional: Erste Nachricht mit Teil-Info senden
      if (teilId) {
        try {
          const { data: partData } = await supabase
            .from('parts')
            .select('title')
            .eq('id', teilId)
            .single();

          if (partData) {
            await supabase
              .from('messages')
              .insert([{
                chat_id: chatId,
                sender_id: user.id,
                message: `Hallo! Ich interessiere mich für: ${partData.title}`,
                created_at: new Date().toISOString()
              }]);
          }
        } catch (err) {
          console.warn("⚠️ Konnte Teil-Info nicht laden:", err);
        }
      }
    }

    // 4. Zur Chat-Seite weiterleiten
    console.log("🚀 Leite zur Chat-Seite weiter...");
    window.location.href = `/src/pages/chat.html?chat=${chatId}`;

  } catch (error) {
    console.error("❌ Fehler in openChat:", error);
    alert("Chat konnte nicht geöffnet werden. Bitte versuche es später erneut.");
    throw error;
  }
}

/**
 * Lädt alle Chats für den aktuellen User
 * @returns {Promise<Array>}
 */
export async function loadUserChats() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        id,
        user1_id,
        user2_id,
        last_message_at,
        created_at
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return chats || [];
  } catch (error) {
    console.error("Fehler beim Laden der Chats:", error);
    return [];
  }
}

/**
 * Prüft ob ein Chat zwischen zwei Usern existiert
 * @param {string} userId1 - Erste User-ID
 * @param {string} userId2 - Zweite User-ID
 * @returns {Promise<string|null>} Chat-ID oder null
 */
export async function checkChatExists(userId1, userId2) {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.id;
  } catch (error) {
    console.error("Fehler beim Prüfen des Chats:", error);
    return null;
  }
}

/**
 * Sendet eine Nachricht in einen Chat
 * @param {string} chatId - Die Chat-ID
 * @param {string} message - Die Nachricht
 * @returns {Promise<boolean>}
 */
export async function sendMessage(chatId, message) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Nicht authentifiziert");
    }

    const { error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: user.id,
        message: message.trim(),
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    // Update last_message_at
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    return true;
  } catch (error) {
    console.error("Fehler beim Senden der Nachricht:", error);
    return false;
  }
}

/**
 * Lädt Nachrichten eines Chats
 * @param {string} chatId - Die Chat-ID
 * @param {number} limit - Maximale Anzahl der Nachrichten
 * @returns {Promise<Array>}
 */
export async function loadMessages(chatId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Fehler beim Laden der Nachrichten:", error);
    return [];
  }
}

/**
 * Abonniert Echtzeit-Updates für einen Chat
 * @param {string} chatId - Die Chat-ID
 * @param {Function} callback - Callback-Funktion für neue Nachrichten
 * @returns {RealtimeChannel}
 */
export function subscribeToChat(chatId, callback) {
  return supabase
    .channel(`chat-${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    }, (payload) => {
      callback(payload.new);
    })
    .subscribe();
}

/**
 * Beendet eine Chat-Subscription
 * @param {RealtimeChannel} subscription - Die Subscription
 */
export async function unsubscribeFromChat(subscription) {
  if (subscription) {
    await supabase.removeChannel(subscription);
  }
}

/**
 * Markiert Nachrichten als gelesen
 * @param {string} chatId - Die Chat-ID
 * @returns {Promise<boolean>}
 */
export async function markAsRead(chatId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return false;

    // Hier könntest du eine "read_at" Spalte in messages updaten
    // oder einen separaten "read_receipts" Table verwenden
    console.log("Markiere Nachrichten als gelesen:", chatId);
    
    return true;
  } catch (error) {
    console.error("Fehler beim Markieren als gelesen:", error);
    return false;
  }
}

/**
 * Löscht einen Chat
 * @param {string} chatId - Die Chat-ID
 * @returns {Promise<boolean>}
 */
export async function deleteChat(chatId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error("Nicht authentifiziert");
    }

    // Prüfen ob User Teil des Chats ist
    const { data: chat, error: fetchError } = await supabase
      .from('chats')
      .select('user1_id, user2_id')
      .eq('id', chatId)
      .single();

    if (fetchError || !chat) {
      throw new Error("Chat nicht gefunden");
    }

    if (chat.user1_id !== user.id && chat.user2_id !== user.id) {
      throw new Error("Keine Berechtigung");
    }

    // Lösche zuerst alle Nachrichten
    await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId);

    // Lösche dann den Chat
    const { error: deleteError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error("Fehler beim Löschen des Chats:", error);
    return false;
  }
}

/**
 * Lädt User-Informationen für Chat-Anzeige
 * @param {string} userId - Die User-ID
 * @returns {Promise<Object>}
 */
export async function getChatPartnerInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, phone, email, account_type')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return {
        id: userId,
        username: `User_${userId.substring(0, 8)}`,
        accountType: 'private'
      };
    }

    return {
      id: data.id,
      username: data.username || `User_${userId.substring(0, 8)}`,
      phone: data.phone,
      email: data.email,
      accountType: data.account_type || 'private'
    };
  } catch (error) {
    console.error("Fehler beim Laden der User-Info:", error);
    return {
      id: userId,
      username: `User_${userId.substring(0, 8)}`,
      accountType: 'private'
    };
  }
}

/**
 * Zählt ungelesene Nachrichten für den aktuellen User
 * @returns {Promise<number>}
 */
export async function getUnreadCount() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return 0;

    // Hier müsstest du einen "read_receipts" Table haben
    // oder "read_at" Timestamps in messages
    // Vereinfachte Version: Zähle alle Nachrichten der letzten 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (!chats) return 0;

    let unreadCount = 0;

    for (const chat of chats) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', user.id)
        .gte('created_at', oneDayAgo);

      unreadCount += count || 0;
    }

    return unreadCount;
  } catch (error) {
    console.error("Fehler beim Zählen ungelesener Nachrichten:", error);
    return 0;
  }
}

/**
 * Sucht nach Nachrichten in allen Chats
 * @param {string} query - Suchbegriff
 * @returns {Promise<Array>}
 */
export async function searchMessages(query) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return [];

    // Hole alle Chat-IDs des Users
    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (!chats) return [];

    const chatIds = chats.map(c => c.id);

    // Suche in Nachrichten
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, chat_id')
      .in('chat_id', chatIds)
      .ilike('message', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return messages || [];
  } catch (error) {
    console.error("Fehler bei der Nachrichtensuche:", error);
    return [];
  }
}

// Export als Standard-Objekt für einfacheren Import
export default {
  openChat,
  loadUserChats,
  checkChatExists,
  sendMessage,
  loadMessages,
  subscribeToChat,
  unsubscribeFromChat,
  markAsRead,
  deleteChat,
  getChatPartnerInfo,
  getUnreadCount,
  searchMessages
};

console.log("✅ chat.js Modul vollständig geladen")