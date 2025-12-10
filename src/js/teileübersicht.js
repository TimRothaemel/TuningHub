console.log("teileübersicht.js geladen");

// Globale Variablen für Supabase
let supabase = null;
let trackingSupabase = null;

// Warte auf Supabase
async function waitForSupabase() {
    return new Promise((resolve) => {
        if (window.supabase && typeof window.supabase.from === 'function') {
            console.log('[teileübersicht] ✅ Supabase bereits verfügbar');
            resolve({
                supabase: window.supabase,
                trackingSupabase: window.trackingSupabase
            });
            return;
        }

        console.log('[teileübersicht] ⏳ Warte auf supabaseReady Event...');
        
        window.addEventListener('supabaseReady', (event) => {
            console.log('[teileübersicht] ✅ supabaseReady Event empfangen');
            resolve(event.detail);
        }, { once: true });
        
        setTimeout(() => {
            if (window.supabase) {
                console.log('[teileübersicht] ⚠️ Timeout, aber window.supabase gefunden');
                resolve({
                    supabase: window.supabase,
                    trackingSupabase: window.trackingSupabase
                });
            }
        }, 10000);
    });
}

// Lazy Loading State
let allPartsData = [];
let loadedPartsCount = 0;
const PARTS_PER_LOAD = 20;
let isLoading = false;
let isSearchActive = false;
let searchResults = [];
let pageFullyLoaded = false;

// Utility functions
export function log(message, data = '') {
  console.log(`[TuningHub-Overview] ${message}`, data);
}

export function showError(message) {
  const container = document.getElementById("angebot-container");
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>⚠️ ${message}</p>
        <button onclick="window.TuningHubParts.loadParts()" class="retry-btn">Erneut versuchen</button>
      </div>
    `;
  }
}

export function showLoading() {
  const container = document.getElementById("angebot-container");
  if (container) {
    container.innerHTML = `
      <div class="loading-message">
        <p>⏳ Lade Angebote...</p>
      </div>
    `;
  }
}

export function showEmpty() {
  const container = document.getElementById("angebot-container");
  if (container) {
    container.innerHTML = `
      <div class="empty-message">
        <p>📦 Keine Angebote gefunden</p>
        <a href="/src/pages/teilehinzufügen.html" class="add-parts-btn">Erstes Teil hinzufügen</a>
      </div>
    `;
  }
}

export function showNoSearchResults(query) {
  const container = document.getElementById("angebot-container");
  if (container) {
    container.innerHTML = `
      <div class="empty-message">
        <p>🔍 Keine Ergebnisse für "${query}"</p>
        <button onclick="window.TuningHubParts.clearSearchResults()" class="retry-btn">Suche zurücksetzen</button>
      </div>
    `;
  }
}

export function createCard(teil) {
  const { name, preis, beschreibung, bild, typ, id } = extractData(teil);

  const card = document.createElement("div");
  card.className = typ === "teilesuche" ? "card search-card" : "card";
  
  card.setAttribute("data-id", id);
  card.id = `teil-${id}`;

  const hasExternalLink = teil.link && teil.link.trim().length > 0;
  
  if (hasExternalLink) {
    card.classList.add("external-link-card");
  }

  const imageUrl = bild || "/public/img/search.png";
  const fallbackUrl = "/public/img/search.png";

  let preisText = preis;
  if (typeof preis === "number") {
    preisText = `${preis.toLocaleString("de-DE")}€`;
  } else if (typeof preis === "string" && !isNaN(parseFloat(preis))) {
    preisText = `${parseFloat(preis).toLocaleString("de-DE")}€`;
  }

  const kurzbeschreibung = truncateDescription(beschreibung, 120);

  card.innerHTML = `
    <img src="${imageUrl}" 
         alt="${name}" 
         onerror="this.src='${fallbackUrl}'" 
         loading="lazy" />
    <div class="card-content">
        <h2>${name}</h2>
        ${kurzbeschreibung ? `<p class="card-description">${kurzbeschreibung}</p>` : ""}
        <div class="card-footer">
            <p><strong>${preisText}</strong></p>
        </div>
    </div>
  `;

  card.addEventListener("click", function (e) {
    e.preventDefault();
    
    if (hasExternalLink) {
      window.open(teil.link, '_blank');
      log(`Externen Link geöffnet: ${teil.link}`);
    } else {
      openDetailView(teil);
    }
  });

  return card;
}

export function extractData(teil) {
  const name = teil.title || "Unbekanntes Teil";
  const preis = teil.price || "Preis auf Anfrage";
  const beschreibung = teil.description;
  const bild = teil.image_url;
  const kategorie = teil.type;
  const zustand = teil.condition;
  const datum = teil.created_at;
  const id = teil.id;
  const typ = teil.type;
  const link = teil.link;
  const verkäuferId = teil.user_id || teil.seller_id;

  let telefon = null;
  let verkäufer = "Privater Verkäufer";
  let sellerContactMethods = ['phone'];
  let sellerSocialMedia = null;

  if (teil.seller) {
    telefon = teil.seller.phone || null;
    sellerContactMethods = teil.seller.contact_methods || ['phone'];
    
    if (teil.seller.social_media) {
      try {
        sellerSocialMedia = typeof teil.seller.social_media === 'string'
          ? JSON.parse(teil.seller.social_media)
          : teil.seller.social_media;
      } catch (e) {
        console.warn('Social Media parsing error:', e);
      }
    }
    
    verkäufer = teil.seller.account_type === 'company' 
      ? teil.seller.company_name || teil.seller.username
      : teil.seller.username || "Privater Verkäufer";
  }

  const bilder = [];
  for (let i = 1; i <= 5; i++) {
    const feldName = i === 1 ? "image_url" : `image_url${i}`;
    if (teil[feldName]) {
      bilder.push(teil[feldName]);
    }
  }

  return {
    name, preis, beschreibung, bild, kategorie, zustand,
    telefon, verkäufer, datum, id, typ, bilder, link,
    verkäuferId, sellerContactMethods, sellerSocialMedia
  };
}

export function truncateDescription(text, maxLength = 120) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength).trim() + "...";
}

export async function contactSeller(teilId, verkäuferId, telefon) {
  if (!verkäuferId && !telefon) { 
    alert("Keine Kontaktinformationen verfügbar"); 
    return; 
  }
  
  try {
    let contactMethods = ['phone'];
    let verkäuferTelefon = telefon;
    let verkäuferName = 'Verkäufer';
    
    if (verkäuferId && supabase) {
      try {
        const { data: baseProfile } = await supabase
          .from('profiles')
          .select('username, phone, account_type, company_name')
          .eq('id', verkäuferId)
          .maybeSingle();
        
        if (baseProfile) {
          verkäuferTelefon = baseProfile.phone || telefon;
          verkäuferName = baseProfile.account_type === 'company' 
            ? baseProfile.company_name || baseProfile.username
            : baseProfile.username || 'Verkäufer';
        }
      } catch (err) {
        console.warn('Profil konnte nicht geladen werden:', err);
      }
    }

    if (!verkäuferTelefon) {
      alert("Keine Kontaktinformationen verfügbar");
      return;
    }

    const cleanedPhone = verkäuferTelefon.replace(/[^\d+]/g, "");

    const dialog = document.createElement("div");
    dialog.className = "contact-dialog-overlay";
    dialog.innerHTML = `
      <div class="contact-dialog-content">
        <h3>${verkäuferName} kontaktieren</h3>
        <div class="contact-options">
          <button class="contact-option call">
            <span class="icon">📞</span><span>Anrufen</span>
          </button>
          <button class="contact-option whatsapp">
            <span class="icon">💬</span><span>WhatsApp</span>
          </button>
        </div>
        <button class="contact-cancel">Abbrechen</button>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector(".call").addEventListener("click", () => { 
      window.location.href = `tel:${cleanedPhone}`; 
      dialog.remove(); 
    });
    
    dialog.querySelector(".whatsapp").addEventListener("click", () => { 
      window.open(`https://wa.me/${cleanedPhone}`, "_blank"); 
      dialog.remove(); 
    });
    
    dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.remove(); });

  } catch (error) {
    console.error("Fehler in contactSeller:", error);
    alert("Kontaktinformationen konnten nicht geladen werden");
  }
}

let currentPart = null;
let currentImageIndex = 0;
let imageUrls = [];

export function showImage(index) {
  if (imageUrls.length === 0) return;
  if (index < 0) index = imageUrls.length - 1;
  if (index >= imageUrls.length) index = 0;
  currentImageIndex = index;
  const detailImage = document.getElementById("detail-image");
  if (detailImage) {
    detailImage.src = imageUrls[index];
  }
}

export function nextImage() { showImage(currentImageIndex + 1); }
export function prevImage() { showImage(currentImageIndex - 1); }

export function openDetailView(teil) {
  const modal = document.getElementById("detail-modal");
  if (!modal) return;
  
  const { name, preis, beschreibung, bild, kategorie, zustand, telefon, verkäufer, typ, id, bilder, verkäuferId } = extractData(teil);
  currentPart = teil;
  imageUrls = bilder.length > 0 ? bilder : [bild || "/public/img/no-image.png"];
  currentImageIndex = 0;
  
  const detailTitle = document.getElementById("detail-title");
  if (detailTitle) detailTitle.textContent = name;
  
  const detailImage = document.getElementById("detail-image");
  if (detailImage) {
    detailImage.src = imageUrls[0];
    detailImage.alt = name;
  }
  
  showImage(0);
  
  const prevBtn = document.getElementById("prev-image");
  const nextBtn = document.getElementById("next-image");
  if (prevBtn) prevBtn.onclick = prevImage;
  if (nextBtn) nextBtn.onclick = nextImage;
  
  let preisText = preis;
  if (typeof preis === "number") preisText = `${preis.toLocaleString("de-DE")}€`;
  
  const detailPrice = document.getElementById("detail-price");
  if (detailPrice) detailPrice.textContent = preisText;
  
  const detailDescription = document.getElementById("detail-description");
  if (detailDescription) detailDescription.textContent = beschreibung || "Keine Beschreibung verfügbar.";
  
  const detailCategory = document.getElementById("detail-category");
  if (detailCategory) detailCategory.textContent = kategorie;
  
  const detailCondition = document.getElementById("detail-condition");
  if (detailCondition) detailCondition.textContent = zustand;
  
  const detailSeller = document.getElementById("detail-seller");
  if (detailSeller) detailSeller.textContent = verkäufer;
  
  const contactBtn = document.getElementById("contact-seller-btn");
  if (contactBtn) {
    contactBtn.onclick = () => contactSeller(id, verkäuferId, telefon);
  }
  
  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.onclick = () => sharePart(id);
  }
  
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  
  log("Detailansicht geöffnet für:", name);
}

export function closeDetailView() {
  const modal = document.getElementById("detail-modal");
  if (modal) {
    modal.classList.remove("active");
  }
  document.body.style.overflow = "";
  currentPart = null;
  imageUrls = [];
  currentImageIndex = 0;
  log("Detailansicht geschlossen");
}

export async function sharePart(id) {
  if (!id) { 
    alert("Fehler: Teil-ID nicht verfügbar"); 
    return; 
  }
  
  const url = `${window.location.origin}/src/pages/teileübersicht.html?part=${id}`;
  
  if (navigator.share) {
    try {
      await navigator.share({ 
        title: "Tuning-Teil bei TuningHub", 
        url: url 
      });
    } catch (err) {
      console.warn("Sharing failed:", err);
    }
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      alert("Link wurde in die Zwischenablage kopiert!");
    } catch (err) {
      alert(`Link: ${url}`);
    }
  } else {
    alert(`Link: ${url}`);
  }
}

function displaySearchResults(results, query) {
  log(`Zeige ${results.length} Suchergebnisse für: "${query}"`);
  
  isSearchActive = true;
  searchResults = results;
  
  const container = document.getElementById("angebot-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (results.length === 0) {
    showNoSearchResults(query);
    return;
  }
  
  const header = document.createElement("div");
  header.style.cssText = "grid-column: 1/-1; padding: 20px; background: #f0f0f0; border-radius: 8px; margin-bottom: 20px;";
  header.innerHTML = `
    <h2 style="margin: 0 0 10px 0;">Suchergebnisse für "${query}"</h2>
    <p style="margin: 0;">${results.length} ${results.length === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden</p>
    <button onclick="window.TuningHubParts.clearSearchResults()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Suche zurücksetzen
    </button>
  `;
  container.appendChild(header);
  
  results.forEach(teil => {
    try {
      const card = createCard(teil);
      container.appendChild(card);
    } catch (error) {
      log("Fehler beim Erstellen der Such-Karte:", error);
    }
  });
  
  log("Suchergebnisse angezeigt");
}

export function clearSearchResults() {
  log("Setze Suche zurück");
  
  isSearchActive = false;
  searchResults = [];
  
  const url = new URL(window.location);
  url.searchParams.delete('search');
  window.history.pushState({}, '', url);
  
  const searchInput = document.getElementById('searchbar');
  if (searchInput) {
    searchInput.value = '';
  }
  
  loadParts();
}

function loadMoreParts() {
  if (isLoading || loadedPartsCount >= allPartsData.length) return;
  
  isLoading = true;
  const container = document.getElementById("angebot-container");
  if (!container) return;
  
  const endIndex = Math.min(loadedPartsCount + PARTS_PER_LOAD, allPartsData.length);
  
  log(`Lade Teile ${loadedPartsCount + 1} bis ${endIndex}`);
  
  for (let i = loadedPartsCount; i < endIndex; i++) {
    const teil = allPartsData[i];
    try {
      const card = createCard(teil);
      container.appendChild(card);
    } catch (cardError) {
      log(`Fehler beim Erstellen der Karte ${i + 1}:`, cardError);
    }
  }
  
  loadedPartsCount = endIndex;
  isLoading = false;
  
  if (loadedPartsCount < allPartsData.length) {
    addLoadMoreTrigger();
  }
  
  log(`${loadedPartsCount} von ${allPartsData.length} Teilen geladen`);
}

function addLoadMoreTrigger() {
  let trigger = document.getElementById("load-more-trigger");
  if (!trigger) {
    trigger = document.createElement("div");
    trigger.id = "load-more-trigger";
    trigger.style.height = "10px";
    trigger.style.margin = "20px 0";
    const container = document.getElementById("angebot-container");
    if (container) container.appendChild(trigger);
  }
  
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      log("Load-More Trigger sichtbar, lade weitere Teile...");
      loadMoreParts();
    }
  }, { rootMargin: "100px" });
  
  observer.observe(trigger);
}

export async function loadParts() {
  log("Starte Laden der Angebote...");
  const container = document.getElementById("angebot-container");
  if (!container) { 
    log("ERROR: Container nicht gefunden"); 
    return; 
  }
  
  if (!supabase) { 
    showError("Supabase nicht initialisiert"); 
    return; 
  }
  
  isSearchActive = false;
  searchResults = [];
  
  showLoading();
  
  try {
    log("Lade Daten aus Supabase...");
    
    let { data, error } = await supabase
      .from("parts")
      .select(`
        *,
        seller:profiles!parts_user_id_fkey (
          id,
          username,
          phone,
          account_type,
          company_name
        )
      `)
      .order("created_at", { ascending: false });
    
    if (error && error.message.includes('relationship')) {
      log("⚠️ JOIN fehlgeschlagen, lade ohne Profile");
      
      const result = await supabase
        .from("parts")
        .select("*")
        .order("created_at", { ascending: false });
      
      data = result.data;
      error = result.error;
    }

    if (error) { 
      log("Supabase Fehler:", error); 
      showError(`Datenbankfehler: ${error.message}`); 
      return; 
    }
    
    log("Daten erfolgreich geladen:", data ? data.length : 0);
    
    allPartsData = data || [];
    allPartsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (allPartsData.length === 0) { 
      showEmpty(); 
      return; 
    }
    
    container.innerHTML = "";
    loadedPartsCount = 0;
    
    loadMoreParts();
    
    // Handle Hash Scroll nach dem Laden
    setTimeout(() => handleHashScroll(), 500);
    
  } catch (error) {
    log("Unerwarteter Fehler:", error);
    showError(`Unerwarteter Fehler: ${error.message}`);
  }
}

// Hash Scroll Handler
function handleHashScroll() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#teil-')) {
    log("Hash erkannt:", hash);
    const teilId = hash.substring(6); // Entferne '#teil-'
    
    let element = document.querySelector(hash);
    
    if (element) {
      scrollToElement(element);
    } else {
      log("Teil noch nicht geladen, lade alle Teile bis zum Ziel...");
      loadAllPartsUntilHash(teilId);
    }
  }
}

// Lade alle Teile bis zum Hash-Element
function loadAllPartsUntilHash(teilId) {
  const teilIndex = allPartsData.findIndex(t => t.id === teilId);
  
  if (teilIndex === -1) {
    log("Teil nicht in Daten gefunden:", teilId);
    return;
  }
  
  const container = document.getElementById("angebot-container");
  if (!container) return;
  
  // Lade alle Teile bis zum gewünschten Teil
  for (let i = loadedPartsCount; i <= teilIndex; i++) {
    const teil = allPartsData[i];
    try {
      const card = createCard(teil);
      container.appendChild(card);
    } catch (cardError) {
      log(`Fehler beim Erstellen der Karte ${i + 1}:`, cardError);
    }
  }
  
  loadedPartsCount = teilIndex + 1;
  
  // Scrolle zum Element nach kurzem Delay
  setTimeout(() => {
    const element = document.querySelector(`#teil-${teilId}`);
    if (element) {
      scrollToElement(element);
    }
  }, 300);
}

// Scrolle zu Element mit Highlight
function scrollToElement(element) {
  log("Scrolle zu Element:", element.id);
  
  element.scrollIntoView({ 
    behavior: "smooth", 
    block: "center" 
  });
  
  // Highlight-Effekt
  element.style.transition = "box-shadow 0.3s ease";
  element.style.boxShadow = "0 0 0 4px #007bff, 0 4px 12px rgba(0, 123, 255, 0.3)";
  
  setTimeout(() => {
    element.style.boxShadow = "";
  }, 2000);
}

window.addEventListener('tuninghub:search', (event) => {
  log("Such-Event empfangen:", event.detail);
  const { query, results } = event.detail;
  displaySearchResults(results, query);
});

window.addEventListener('tuninghub:clearsearch', () => {
  log("Clear-Search Event empfangen");
  clearSearchResults();
});

async function initializePage() {
  log("Seite wird initialisiert...");
  
  try {
    const clients = await waitForSupabase();
    supabase = clients.supabase;
    trackingSupabase = clients.trackingSupabase;

    if (!supabase) {
      log("❌ ERROR: Supabase nicht verfügbar");
      showError("Verbindung zur Datenbank fehlgeschlagen");
      return;
    }

    log("✅ Supabase Clients verfügbar");
    
    await loadParts();
    
    pageFullyLoaded = true;
    
    log("Seite fertig geladen, sende 'overview-ready' Signal...");
    window.dispatchEvent(new CustomEvent('tuninghub:overview-ready', {
      detail: { timestamp: Date.now() }
    }));
    
  } catch (error) {
    log("Fehler beim Laden:", error);
    showError("Fehler beim Laden der Daten: " + error.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

// Hash Change Event Listener
window.addEventListener('hashchange', () => {
  log("Hash geändert, prüfe Scroll...");
  handleHashScroll();
});

const closeBtn = document.getElementById("close-detail");
if (closeBtn) {
  closeBtn.addEventListener("click", closeDetailView);
}

window.TuningHubParts = {
  loadParts,
  clearSearchResults,
  openDetailView,
  closeDetailView,
  contactSeller,
  sharePart,
  getAllParts: () => allPartsData,
  isReady: () => pageFullyLoaded
};

log("teileübersicht.js vollständig initialisiert");