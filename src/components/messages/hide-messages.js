export function hideMessage() {
  const container = document.getElementById("message-container");
  if (container) {
    if (container.dataset.timeoutId) {
      clearTimeout(parseInt(container.dataset.timeoutId));
    }
    container.style.display = "none";
  }
}