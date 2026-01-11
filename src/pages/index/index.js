import { supabase } from '../../services/supabase.js';

async function loadMainCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, icon_url')
    .is('parent_id', null)
    .order('name');

  if (error) {
    console.error('Fehler beim Laden der Kategorien', error);
    return;
  }

  renderCategories(data);
}

function renderCategories(categories) {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';

    card.innerHTML = `
      <div class="category-icon">${cat.icon ?? '🛠️'}</div>
      <div class="category-name">${cat.name}</div>
    `;

    card.addEventListener('click', () => {
      // später Routing
      window.location.href = `/src/pages/categories/category.html?slug=${cat.slug}`;
    });

    grid.appendChild(card);
  });
}

loadMainCategories();