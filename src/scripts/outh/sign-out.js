import { printLog } from "../output/log/log.js";
import { throwNewError } from "../output/error/error.js";
import { supabase } from "../../services/supabase.js";

printLog("[Sign Out] Initializing Sign Out Page");

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throwNewError("[Sign Out] Error logging out user:", error);
    return false;
  }
  if (success) {
    window.location.href = "../login/login.html";
  }

  printLog("[Sign Out] User logged out successfully");
  return true;
}

