// Supabase initialisieren
      const trackingUrl = "https://lhxcnrogjjskgaclqxtm.supabase.co";
      const trackingKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeGNucm9nampza2dhY2xxeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjU0MzUsImV4cCI6MjA2ODEwMTQzNX0.vOr_Esi9IIesFixkkvYQjYEqghrKCMeqbrPKW27zqww";

      const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
      const supabaseKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";

      let currentUser = null; // später aus Auth übernehmen
      let currentChatId = null;

      // Tabellen (Beispiel):
      // chats: id | name | is_group (boolean)
      // chat_members: chat_id | user_id
      // messages: id | chat_id | sender_id | content | created_at

      async function loadChats() {
        let { data } = await supabase.from("chats").select("*");
        const chatList = document.getElementById("chats");
        chatList.innerHTML = "";
        data.forEach((chat) => {
          const li = document.createElement("li");
          li.textContent = chat.is_group ? `👥 ${chat.name}` : chat.name;
          li.onclick = () => openChat(chat.id);
          chatList.appendChild(li);
        });
      }

      async function openChat(chatId) {
        currentChatId = chatId;
        let { data } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true });

        renderMessages(data);

        // Echtzeit-Updates
        supabase
          .channel("chat-" + chatId)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              renderMessages([payload.new], true);
            }
          )
          .subscribe();
      }

      function renderMessages(messages, append = false) {
        const container = document.getElementById("messages");
        if (!append) container.innerHTML = "";
        messages.forEach((msg) => {
          const div = document.createElement("div");
          div.classList.add("message");
          div.textContent = `${msg.sender_id}: ${msg.content}`;
          container.appendChild(div);
        });
      }

      async function sendMessage() {
        const content = document.getElementById("messageInput").value;
        if (!content || !currentChatId) return;
        await supabase.from("messages").insert([
          {
            chat_id: currentChatId,
            sender_id: currentUser || "Gast",
            content: content,
          },
        ]);
        document.getElementById("messageInput").value = "";
      }

      // Start
      loadChats();
 
 