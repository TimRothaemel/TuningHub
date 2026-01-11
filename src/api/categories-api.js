import { printLog } from "../scripts/output/log.js";
import { supabase } from "../services/supabase.js";
import { printLog } from "../scripts/output/log/log.js";

printLog("[Categories API] Initializing Categories API");

export async function getCategories() {
  return await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
}
