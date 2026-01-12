import { printLog } from "../../scripts/output/log/log.js";
import { supabase } from "../../services/supabase.js";
import { applyTheme } from "../../scripts/darkmode/darkmode.js";
import { renderCategories } from "../categories/render-categories.js";

printLog("[Index Page] Initializing Index Page");

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
});
async function loadMainCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, icon_url")
    .is("parent_id", null)
    .order("name");

  if (error) {
    console.error("Fehler beim Laden der Kategorien", error);
    return;
  }

  renderCategories(data);
}

loadMainCategories();
