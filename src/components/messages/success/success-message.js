import { printLog } from "../../../scripts/output/log/log.js";
import { getOrCreateMessageContainer } from "../message-container.js";

printLog("[Success Message] Initializing Success Message Component");



export function showSuccessMessage(message, duration = 3000) {


  container.classList.remove("hide");
  container.classList.remove("error", "warning");
  container.classList.add("success");
  
  container.innerText = message;
  container.style.display = "block";
  
  printLog("[Success Message] Showing:", message);
  

  const timeoutId = setTimeout(() => {
    container.classList.add("hide");
    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("hide");
    }, 300); 
  }, duration);
  

}


