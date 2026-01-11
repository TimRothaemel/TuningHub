import { printLog } from "../../scripts/output/log/log.js";

printLog("[Part Card] Initializing Part Card Component");

export function PartCard(part, onClick) {
  const el = document.createElement('div');
  el.className = 'part-card';

  el.innerHTML = `
    <h3>${part.title}</h3>
    ${part.price ? `<p class="price">${part.price} €</p>` : ''}
  `;

  el.addEventListener('click', () => {
    if (onClick) onClick(part);
  });

  return el;
}