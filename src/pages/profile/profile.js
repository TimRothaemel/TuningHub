import { printLog } from "../../scripts/output/log/log.js";
import { throwNewError } from "../../scripts/output/error/error.js";
import { checkUserLoggesIn } from "../../scripts/outh/outh-check.js";
import { logoutUser } from "../../scripts/outh/sign-out.js";
import { showSuccessMessage } from "../../components/messages/success/success-message.js";

printLog("[Profile Page] Initializing Profile Page");

document.addEventListener('DOMContentLoaded', checkUserLoggesIn);


  const signOutButton = document.getElementById("sign-out-btn");
  if (signOutButton) {
    signOutButton.addEventListener("click", async () => {
      logoutUser();
    });
  } else {
    throwNewError("Sign out button not found");
  }

