import { printLog } from "../../scripts/output/log/log.js";
import { PartCard } from './part-card.js';

printLog("[Part Tree] Initializing Part Tree Component");

/**
 * parts: ALLE Parts (array)
 * parentPartId: null = oberste Ebene
 */
export function PartTree(parts, parentPartId = null) {
  const container = document.createElement('div');
  container.className = 'part-tree';

  const children = parts.filter(p =>
    parentPartId === null
      ? p.parent_part_id === null
      : p.parent_part_id === parentPartId
  );

  children.forEach(part => {
    const wrapper = document.createElement('div');
    wrapper.className = 'part-node';

    const card = PartCard(part);
    wrapper.appendChild(card);

    // 🔁 Rekursion: Unterteile laden
    const subTree = PartTree(parts, part.id);
    if (subTree.childElementCount > 0) {
      wrapper.appendChild(subTree);
    }

    container.appendChild(wrapper);
  });

  return container;
}