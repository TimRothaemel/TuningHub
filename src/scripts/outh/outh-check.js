import { printLog } from "../output/log/log.js";
import { throwNewError } from "../output/error/error.js";
import { supabase } from "../../services/supabase.js";

printLog("[Outh Check] Initializing Outh Check");

export async function checkUserLoggesIn() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throwNewError("[Outh Check] Error getting session:", error);
    return false;
  }

  if (session) {
    printLog("[Outh Check] User is logged in");
    return true;
  } else {
    printLog("[Outh Check] No user logged in");
    window.location.href = "/src/pages/login/login.html";
    return false;
  }
}
