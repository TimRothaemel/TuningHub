import { printLog } from "../output/log/log.js";
import { throwNewError } from "../output/error/error.js";
import { showSuccessMessage } from "../../components/messages/success/success-message.js";
import { supabase } from "../../services/supabase.js";

printLog("[Sign In] Initializing Sign In Page");

export async function loginUser(email, password) {
  // Debug: Log what we're actually sending
  printLog("[Sign In] Attempting login with email:", email);
  
  // Validate inputs
  if (!email || !password) {
    throwNewError("[Sign In] Email and password are required");
    return null;
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  
  if (error) {    
    // Log more detailed error information
    throwNewError("[Sign In] Error logging in user:", error.message || error);
    console.error("Full error object:", error);
    return null;
    
  }
  
  printLog("[Sign In] User logged in successfully:", data.user);
  showSuccessMessage("Erfolgreich eingeloggt!");
  return data.session;
}