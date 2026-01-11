
import { printLog } from "../../scripts/output/log/log.js";
import { throwNewError } from "../../scripts/output/error/error.js";
import { supabase } from '../../services/supabase.js';

printLog('[Category] category.js geladen');

// slug aus URL holen
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

if (!slug) {
  throwNewError('[Category] Kein slug in URL');
}

// Kategorie laden
async function loadCategory() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (error) {
    throwNewError('[Category] Fehler beim Laden der Kategorie', error);
    return;
  }

  document.getElementById('category-title').textContent = data.name;

  loadSubcategories(data.id);
}

async function loadSubcategories(parentId) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('parent_id', parentId)
    .order('name');

  if (error) {
    throwNewError('[Category] Fehler bei Unterkategorien', error);
    return;
  }

  const container = document.getElementById('subcategories');
  container.innerHTML = '';

  data.forEach(sub => {
    const el = document.createElement('div');
    el.textContent = sub.name;
    el.style.cursor = 'pointer';

    el.onclick = () => {
      window.location.href = `/category.html?slug=${sub.slug}`;
    };

    container.appendChild(el);
  });
}

loadCategory();