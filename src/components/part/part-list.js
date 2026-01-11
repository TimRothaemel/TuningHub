import { printLog } from "../../scripts/output/log.js";
import { PartCard } from './part-card.js';

printLog("[Part List] Initializing Part List Component");

export function PartList(parts, onPartClick) {
  const container = document.createElement('div');
  container.className = 'part-list';

  if (!parts || parts.length === 0) {
    container.innerHTML = `<p class="empty">Keine Teile vorhanden</p>`;
    return container;
  }

  parts.forEach(part => {
    const card = PartCard(part, onPartClick);
    container.appendChild(card);
  });

  return container;
}