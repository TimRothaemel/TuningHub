import { printLog } from "../../scripts/output/log/log.js";
printLog("[Render Categories] Rendering categories");

export function renderCategories(categories) {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';

    card.innerHTML = `
      <div class="category-icon">${cat.icon ?? ''}</div>
      <div class="category-name">${cat.name}</div>
    `;

    card.addEventListener('click', () => {
      // später Routing
      window.location.href = `/src/pages/categories/category.html?slug=${cat.slug}`;
    });

    grid.appendChild(card);
  });
}