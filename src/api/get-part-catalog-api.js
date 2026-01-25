import { printLog } from "../scripts/output/log/log.js";
import { throwNewError } from "../scripts/output/error/error.js";
import { supabase } from "../services/supabase.js";

printLog("[Part Catalog API] Initializing Part Catalog API");

export async function getPartCatalog() {
  printLog("[Part Catalog API] Fetching part catalog data...");
  const { data, error } = await supabase
    .from("part_catalog")
    .select("title, description, price");
  return { data, error };
}
if (error) {
  throwNewError(
    `[Part Catalog API] Error fetching part catalog: ${error.message}`,
  );
}
