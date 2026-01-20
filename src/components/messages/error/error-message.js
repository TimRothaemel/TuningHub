import { printLog } from "../../scripts/output/log/log.js";
import { getOrCreateMessageContainer } from "../message-container.js";

printLog("[Error Message] Initializing Error Message Component");

export function showErrorMessage(message, duration = 3000) {
  const container = getOrCreateMessageContainer();
  
  container.classList.remove("hide");
  container.classList.remove("success", "warning");
  container.classList.add("error");
  
  container.innerText = message;
  container.style.display = "block";
  
  printLog("[Error Message] Showing:", message);
  
  const timeoutId = setTimeout(() => {
    container.classList.add("hide");
    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("hide");
    }, 300);
  }, duration);
  
  container.dataset.timeoutId = timeoutId;
}