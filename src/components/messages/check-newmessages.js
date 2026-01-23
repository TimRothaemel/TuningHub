import { showSuccessMessage } from "./success/success-message.js";

export function checkNewMessages() {
    let messages = showSuccessMessage
    console.log("checkt new messages", messages);

    if (messages !== null) {
        showSuccessMessage(messages)

    }            
}