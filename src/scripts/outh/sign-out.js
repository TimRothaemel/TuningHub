import { printLog } from "../output/log/log.js";
import { throwNewError } from "../output/error/error.js";
import { showErrorMessage, showSuccessMessage } from "../../components/messages/success/success-message.js";
import { supabase } from "../../services/supabase.js";

printLog("[Sign Out] Initializing Sign Out Page");

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throwNewError("[Sign Out] Error logging out user:", error);
    showErrorMessage("Abmeldung fehlgeschlagen. Bitte versuche es erneut.");
    return false;
  }

  printLog("[Sign Out] User logged out successfully");
  showSuccessMessage("Erfolgreich abgemeldet!");
  window.location.href = "/src/pages/login/login.html";
  return true;
}

