import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.esm.min.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase-Verbindung
const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";
const supabase = createClient(supabaseUrl, supabaseKey);

// Fuse.js Instanz
let fuse;
let allParts = [];

// Teile aus Supabase laden
async function loadParts() {
  try {
    const { data, error } = await supabase
      .from('parts')
      .select('id, title, description, image_url, price, condition, contact_number, type');

    if (error) throw error;

    allParts = data.map(part => ({
      id: part.id,
      name: part.title,
      description: part.description,
      image_url: part.image_url,
      price: part.price,
      condition: part.condition,
      contact_number: part.contact_number,
      type: part.type || 'angebot'
    }));

    // Fuse.js für Fuzzy-Suche initialisieren
    fuse = new Fuse(allParts, {
      keys: ['name', 'description'],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true
    });

    console.log(`🔹 ${allParts.length} Teile geladen`);
  } catch (error) {
    console.error("Fehler beim Laden der Teile:", error);
    // Fallback-Daten bei Fehler
    allParts = [
      {
        id: "1",
        name: "CNC Bremshebel S51",
        description: "Hochwertiger CNC Bremshebel",
        price: 89.99,
        condition: "Neu",
        type: "angebot"
      },
      {
        id: "2",
        name: "S51 Tank",
        description: "Original Tank für Simson S51",
        price: 120.00,
        condition: "Gebraucht",
        type: "angebot"
      }
    ];
    
    fuse = new Fuse(allParts, {
      keys: ['name', 'description'],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
    
    console.warn("⚠️ Verwendung von Fallback-Daten");
  }
}

// Suchergebnisse rendern
function renderResults(results) {
  const container = document.getElementById('results-container');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<div class="empty">🔍 Keine Ergebnisse gefunden</div>`;
    return;
  }

  container.innerHTML = results.map(part => `
    <div class="card ${part.type === 'teilesuche' ? 'search-card' : ''}" data-id="${part.id}">
      ${part.type === 'teilesuche' ? 
        '<span class="search-badge">🔍 SUCHE</span>' : ''}
      
      <img src="${part.image_url || 'https://via.placeholder.com/300x200/e9ecef/666?text=Kein+Bild'}" 
           alt="${part.name}" 
           onerror="this.src='https://via.placeholder.com/300x200/f8f9fa/adb5bd?text=Bild+nicht+verfügbar'"
           loading="lazy" />
      
      <div class="card-content">
        <h3>${part.name}</h3>
        <p>${part.description || 'Keine Beschreibung verfügbar'}</p>
        <div class="card-footer">
          <span class="price">${part.price?.toLocaleString('de-DE', {style: 'currency', currency: 'EUR'}) || 'Preis auf Anfrage'}</span>
          <span class="condition">${part.condition}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Event-Listener für Karten hinzufügen
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const partId = card.dataset.id;
      const part = allParts.find(p => p.id === partId);
      openDetailView(part);
    });
  });
}

// Detailansicht öffnen
function openDetailView(part) {
  console.log("Detailansicht für:", part);
  // Hier würde die Logik für die Detailansicht implementiert werden
  // Beispiel: window.location.href = `detail.html?id=${part.id}`;
  alert(`Detailansicht für: ${part.name}\nID: ${part.id}`);
}

// Suchfunktion
function performSearch(query) {
  if (!fuse) return;

  let results = [];
  
  if (query.trim() === '') {
    // Leere Suche zeigt alle Teile
    results = allParts;
  } else {
    // Fuse.js-Suche durchführen
    const fuseResults = fuse.search(query);
    results = fuseResults.map(result => result.item);
  }

  renderResults(results);
}

// Initialisierung
document.addEventListener("DOMContentLoaded", async () => {
  // Elemente aus dem DOM holen
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'results-container';
  resultsContainer.className = 'grid-container';
  
  // Container in den Hauptinhalt einfügen
  const main = document.querySelector('main');
  if (main) {
    main.appendChild(resultsContainer);
  } else {
    document.body.appendChild(resultsContainer);
  }

  // Teile laden
  await loadParts();
  
  // Initial alle Teile anzeigen
  renderResults(allParts);

  // Event-Listener für Suchfeld
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch(e.target.value);
      }
    });
  }
});

// Fehlerbehandlung
window.addEventListener('error', (e) => {
  console.error('Globaler Fehler:', e.error);
  const container = document.getElementById('results-container');
  if (container) {
    container.innerHTML = `<div class="error">⚠️ Ein Fehler ist aufgetreten: ${e.message}</div>`;
  }
});