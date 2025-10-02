console.log("chat.js geladen");

import { supabase } from "./supabaseClient.js";

/**
 * Öffnet einen Chat mit einem Verkäufer
 * @param {string} verkäuferId - User ID des Verkäufers
 * @param {string} teilId - ID des Parts (optional)
 * @returns {Promise<void>}
 */
export async function openChat(verkäuferId, teilId) {
  try {
    // Prüfe ob User eingeloggt ist
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      alert("Bitte melde dich an, um den Chat zu nutzen");
      window.location.href = "/html/login.html";
      return;
    }

    // Verhindere Chat mit sich selbst
    if (user.id === verkäuferId) {
      alert("Du kannst keinen Chat mit dir selbst starten");
      return;
    }

    // Sortiere User IDs alphabetisch für konsistente chat_id
    const [user1, user2] = [user.id, verkäuferId].sort();

    // Prüfe ob Chat bereits existiert
    const { data: existingChats, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .maybeSingle(); // Verwende maybeSingle statt single (gibt null zurück statt Fehler)

    if (chatError) {
      console.error("Fehler beim Suchen des Chats:", chatError);
      
      // Falls Tabelle nicht existiert
      if (chatError.code === 'PGRST116' || chatError.message.includes('does not exist')) {
        alert("Chat-Funktion ist noch nicht eingerichtet. Bitte kontaktiere den Support.");
        return;
      }
      
      throw chatError;
    }

    let chatId;

    if (existingChats) {
      // Chat existiert bereits
      chatId = existingChats.id;
      console.log("Bestehender Chat gefunden:", chatId);
    } else {
      // Erstelle neuen Chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([
          {
            user1_id: user1,
            user2_id: user2,
            teil_id: teilId || null,
            created_at: new Date().toISOString(),
            last_message_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error("Fehler beim Erstellen des Chats:", createError);
        alert("Chat konnte nicht erstellt werden: " + createError.message);
        return;
      }

      chatId = newChat.id;
      console.log("Neuer Chat erstellt:", chatId);

      // Sende initiale Nachricht
      const { error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: chatId,
            sender_id: user.id,
            message: teilId 
              ? `Hallo, ich interessiere mich für dein Teil.`
              : `Hallo!`,
            created_at: new Date().toISOString()
          }
        ]);

      if (messageError) {
        console.warn("Initiale Nachricht konnte nicht gesendet werden:", messageError);
      }
    }

    // Weiterleitung zur Chat-Seite
    window.location.href = `/html/chat.html?chat=${chatId}`;
    
  } catch (error) {
    console.error("Fehler beim Öffnen des Chats:", error);
    alert("Ein unerwarteter Fehler ist aufgetreten: " + error.message);
  }
}

/**
 * Lädt alle Chats des aktuellen Users
 * @returns {Promise<Array>}
 */
export async function loadUserChats() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Nicht eingeloggt");
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select(`
        *,
        user1:user1_id(id, raw_user_meta_data),
        user2:user2_id(id, raw_user_meta_data),
        teil:teil_id(id, title, image_url),
        last_message:messages(message, created_at)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      throw error;
    }

    return chats || [];
    
  } catch (error) {
    console.error("Fehler beim Laden der Chats:", error);
    return [];
  }
}

/**
 * Lädt Nachrichten eines Chats
 * @param {string} chatId - Chat ID
 * @returns {Promise<Array>}
 */
export async function loadChatMessages(chatId) {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return messages || [];
    
  } catch (error) {
    console.error("Fehler beim Laden der Nachrichten:", error);
    return [];
  }
}

/**
 * Sendet eine Nachricht
 * @param {string} chatId - Chat ID
 * @param {string} message - Nachrichtentext
 * @returns {Promise<boolean>}
 */
export async function sendMessage(chatId, message) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Nicht eingeloggt");
    }

    if (!message || message.trim().length === 0) {
      throw new Error("Nachricht darf nicht leer sein");
    }

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: user.id,
          message: message.trim(),
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      throw error;
    }

    // Update last_message_at im Chat
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
 * Abonniert Echtzeit-Updates für einen Chat
 * @param {string} chatId - Chat ID
 * @param {Function} callback - Callback-Funktion für neue Nachrichten
 * @returns {Object} Subscription object
 */
export function subscribeToChat(chatId, callback) {
  const channel = supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        console.log('Neue Nachricht empfangen:', payload.new);
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Entfernt Echtzeit-Subscription
 * @param {Object} channel - Subscription channel
 */
export function unsubscribeFromChat(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// Exportiere für globalen Zugriff
window.ChatModule = {
  openChat,
  loadUserChats,
  loadChatMessages,
  sendMessage,
  subscribeToChat,
  unsubscribeFromChat
};