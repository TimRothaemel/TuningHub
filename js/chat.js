  // Supabase Initialisierung
        const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";
        const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

        let currentUser = null;
        let currentChatId = null;
        let messageSubscription = null;

        // URL Parameter auslesen
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdFromUrl = urlParams.get('chat');

        // User laden und Chat initialisieren
        async function init() {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) {
                alert("Bitte melde dich an, um den Chat zu nutzen");
                window.location.href = "/html/login.html";
                return;
            }

            currentUser = user;
            await loadChats();

            if (chatIdFromUrl) {
                await openChat(chatIdFromUrl);
            }
        }

        // Chats laden
        async function loadChats() {
            const container = document.getElementById('chatsContainer');
            container.innerHTML = '<div class="loading-message">Lade Chats...</div>';

            try {
                const { data: chats, error } = await supabase
                    .from('chats')
                    .select(`
                        id,
                        user1_id,
                        user2_id,
                        last_message_at,
                        created_at
                    `)
                    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
                    .order('last_message_at', { ascending: false });

                if (error) throw error;

                if (!chats || chats.length === 0) {
                    container.innerHTML = `
                        <div class="empty-chat-list">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <p>Noch keine Chats vorhanden</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = '';

                for (const chat of chats) {
                    const otherUserId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id;
                    
                    // Letzte Nachricht laden
                    const { data: lastMessage } = await supabase
                        .from('messages')
                        .select('message, created_at')
                        .eq('chat_id', chat.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    if (chat.id === currentChatId) {
                        chatItem.classList.add('active');
                    }
                    chatItem.onclick = () => openChat(chat.id);

                    const timeAgo = lastMessage ? formatTimeAgo(lastMessage.created_at) : formatTimeAgo(chat.created_at);
                    const preview = lastMessage ? lastMessage.message.substring(0, 50) : 'Neuer Chat';

                    chatItem.innerHTML = `
                        <div class="chat-item-name">Chat mit User ${otherUserId.substring(0, 8)}</div>
                        <div class="chat-item-preview">${preview}${preview.length >= 50 ? '...' : ''}</div>
                        <div class="chat-item-time">${timeAgo}</div>
                    `;

                    container.appendChild(chatItem);
                }

            } catch (error) {
                console.error('Fehler beim Laden der Chats:', error);
                container.innerHTML = '<div class="error">Fehler beim Laden der Chats</div>';
            }
        }

        // Chat öffnen
        async function openChat(chatId) {
            currentChatId = chatId;

            // Alte Subscription entfernen
            if (messageSubscription) {
                await supabase.removeChannel(messageSubscription);
            }

            // Chat-Fenster aufbauen
            const chatWindow = document.getElementById('chatWindow');
            chatWindow.innerHTML = `
                <div class="chat-header">
                    <h3>Chat</h3>
                    <p>Online</p>
                </div>
                <div class="messages-container" id="messagesContainer"></div>
                <div class="input-area">
                    <input type="text" id="messageInput" placeholder="Nachricht eingeben..." />
                    <button onclick="window.sendMessage()">Senden</button>
                </div>
            `;

            // Nachrichten laden
            await loadMessages(chatId);

            // Realtime-Subscription einrichten
            messageSubscription = supabase
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
                        addMessageToUI(payload.new);
                    }
                )
                .subscribe();

            // Enter-Taste für Senden
            document.getElementById('messageInput').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    window.sendMessage();
                }
            });

            // Aktiven Chat in Liste markieren
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll('.chat-item').forEach(item => {
                if (item.onclick.toString().includes(chatId)) {
                    item.classList.add('active');
                }
            });
        }

        // Nachrichten laden
        async function loadMessages(chatId) {
            const container = document.getElementById('messagesContainer');
            container.innerHTML = '<div class="loading-message">Lade Nachrichten...</div>';

            try {
                const { data: messages, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', chatId)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                container.innerHTML = '';

                if (!messages || messages.length === 0) {
                    container.innerHTML = '<div class="loading-message">Noch keine Nachrichten. Schreibe die erste!</div>';
                    return;
                }

                messages.forEach(msg => addMessageToUI(msg));
                scrollToBottom();

            } catch (error) {
                console.error('Fehler beim Laden der Nachrichten:', error);
                container.innerHTML = '<div class="error">Fehler beim Laden der Nachrichten</div>';
            }
        }

        // Nachricht zur UI hinzufügen
        function addMessageToUI(message) {
            const container = document.getElementById('messagesContainer');
            
            // Prüfen ob Nachricht bereits existiert
            if (document.querySelector(`[data-message-id="${message.id}"]`)) {
                return;
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
            messageDiv.setAttribute('data-message-id', message.id);

            const time = new Date(message.created_at).toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div>${message.message}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;

            container.appendChild(messageDiv);
            scrollToBottom();
        }

        // Nachricht senden
        window.sendMessage = async function() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();

            if (!message || !currentChatId) return;

            try {
                const { error } = await supabase
                    .from('messages')
                    .insert([{
                        chat_id: currentChatId,
                        sender_id: currentUser.id,
                        message: message,
                        created_at: new Date().toISOString()
                    }]);

                if (error) throw error;

                // Update last_message_at
                await supabase
                    .from('chats')
                    .update({ last_message_at: new Date().toISOString() })
                    .eq('id', currentChatId);

                input.value = '';
                
            } catch (error) {
                console.error('Fehler beim Senden:', error);
                alert('Nachricht konnte nicht gesendet werden');
            }
        }

        // Hilfsfunktionen
        function scrollToBottom() {
            const container = document.getElementById('messagesContainer');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }

        function formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Gerade eben';
            if (minutes < 60) return `vor ${minutes} Min.`;
            if (hours < 24) return `vor ${hours} Std.`;
            if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
            return date.toLocaleDateString('de-DE');
        }

        // Initialisierung
        init();
  