export function getOrCreateMessageContainer() {
  let container = document.getElementById("message-container");
  
  if (!container) {
    container = document.createElement("div");
    container.id = "message-container";
    container.style.display = "none";
    document.body.appendChild(container);
    
    // CSS laden
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/src/components/messages/success/success-message.css";
    document.head.appendChild(link);
  }
  
  return container;
}