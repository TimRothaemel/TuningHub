console.log("teileübersicht.html.js geladen");

import { supabase, trackingSupabase } from "./supabaseClient.js";

// Lazy Loading State
let allPartsData = [];
let loadedPartsCount = 0;
const PARTS_PER_LOAD = 20;
let isLoading = false;

// Utility functions
export function log(message, data = '') {
  console.log(`[TuningHub] ${message}`, data);
}

export function showError(message) {
  const container = document.getElementById("angebot-container");
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>⚠️ ${message}</p>
        <button onclick="loadParts()" class="retry-btn">Erneut versuchen</button>
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
        <a href="/html/teilehinzufügen.html" class="add-parts-btn">Erstes Teil hinzufügen</a>
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

  const imageUrl = bild || "/img/search.png";
  const fallbackUrl = "/img/search.png";

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

export function createLinkCard(name, beschreibung, imageUrl, preis, targetUrl) {
  const card = document.createElement('div');
  card.className = 'grid-item';
  card.innerHTML = `
    <div class="card link-card">
      <div class="image-container">
        <img src="${imageUrl || '/img/placeholder.jpg'}" alt="${name}" loading="lazy">
        <div class="card-badge">Extern</div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${name}</h3>
        <p class="card-description">${beschreibung.substring(0, 100)}${beschreibung.length > 100 ? '...' : ''}</p>
        <div class="card-footer">
          <span class="price">${preis}</span>
          <div class="card-meta">
            <span class="category">Externe Quelle</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    window.open(targetUrl, '_blank');
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
  const telefon = teil.contact_number || teil.seller_phone;
  const verkäufer = "Privater Verkäufer";
  const datum = teil.created_at;
  const id = teil.id;
  const typ = teil.type;
  const link = teil.link;
  const verkäuferId = teil.user_id || teil.seller_id;
  const sellerContactMethods = teil.seller_contact_methods || ['phone'];
  const sellerSocialMedia = teil.seller_social_media;

  const bilder = [];
  for (let i = 1; i <= 5; i++) {
    const feldName = i === 1 ? "image_url" : `image_url${i}`;
    if (teil[feldName]) {
      bilder.push(teil[feldName]);
    }
  }

  return {
    name,
    preis,
    beschreibung,
    bild,
    kategorie,
    zustand,
    telefon,
    verkäufer,
    datum,
    id,
    typ,
    bilder,
    link,
    verkäuferId,
    sellerContactMethods,
    sellerSocialMedia,
  };
}

export function truncateDescription(text, maxLength = 120) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength).trim() + "...";
}

// [Alle Helper-Funktionen für Kontakt-Dialog bleiben gleich...]
function generateContactOptions(methods, phone, verkäuferId, teilId) {
  let html = '';
  methods.forEach(method => {
    switch(method) {
      case 'phone':
        if (phone) {
          html += `
            <button class="contact-option call" data-method="call">
              <span class="icon">📞</span><span>Anrufen</span>
            </button>
            <button class="contact-option whatsapp" data-method="whatsapp">
              <span class="icon">💬</span><span>WhatsApp</span>
            </button>
            <button class="contact-option sms" data-method="sms">
              <span class="icon">📱</span><span>SMS</span>
            </button>
          `;
        }
        break;
      case 'chat':
        html += `
          <button class="contact-option chat" data-method="chat" data-seller="${verkäuferId}" data-teil="${teilId}">
            <span class="icon">💬</span><span>Chat starten</span>
          </button>
        `;
        break;
      case 'social':
        html += `
          <button class="contact-option social" data-method="social">
            <span class="icon">📱</span><span>Social Media</span>
          </button>
        `;
        break;
    }
  });
  if (html === '') {
    html = '<p class="no-contact-methods">Keine Kontaktmethoden verfügbar</p>';
  }
  return html;
}

function setupContactEventListeners(dialog, methods, phone, verkäuferId, teilId, socialMedia) {
  const container = dialog.querySelector("#contact-options-container");
  if (methods.includes('phone') && phone) {
    const callBtn = container.querySelector('[data-method="call"]');
    const whatsappBtn = container.querySelector('[data-method="whatsapp"]');
    const smsBtn = container.querySelector('[data-method="sms"]');
    if (callBtn) callBtn.addEventListener("click", () => { window.location.href = `tel:${phone}`; dialog.remove(); });
    if (whatsappBtn) whatsappBtn.addEventListener("click", () => { window.open(`https://wa.me/${phone.replace(/[^\d]/g, "")}`, "_blank"); dialog.remove(); });
    if (smsBtn) smsBtn.addEventListener("click", () => { window.location.href = `sms:${phone}`; dialog.remove(); });
  }
  if (methods.includes('chat')) {
    const chatBtn = container.querySelector('[data-method="chat"]');
    if (chatBtn) chatBtn.addEventListener("click", async () => { dialog.remove(); await openChatHandler(verkäuferId, teilId); });
  }
  if (methods.includes('social')) {
    const socialBtn = container.querySelector('[data-method="social"]');
    if (socialBtn) socialBtn.addEventListener("click", () => { dialog.remove(); if (socialMedia) showSocialMediaDialog(socialMedia); else alert("Keine Social Media Informationen verfügbar"); });
  }
}

function showSocialMediaDialog(socialMedia) {
  const dialog = document.createElement("div");
  dialog.className = "contact-dialog-overlay";
  let socialLinks = '';
  if (socialMedia.instagram) socialLinks += `<a href="https://instagram.com/${socialMedia.instagram}" target="_blank" class="social-link"><span class="icon">📷</span><span>Instagram: @${socialMedia.instagram}</span></a>`;
  if (socialMedia.facebook) socialLinks += `<a href="${socialMedia.facebook}" target="_blank" class="social-link"><span class="icon">👤</span><span>Facebook</span></a>`;
  if (socialMedia.twitter) socialLinks += `<a href="https://twitter.com/${socialMedia.twitter}" target="_blank" class="social-link"><span class="icon">🐦</span><span>Twitter: @${socialMedia.twitter}</span></a>`;
  if (!socialLinks) { alert("Keine Social Media Informationen verfügbar"); return; }
  dialog.innerHTML = `<div class="contact-dialog-content"><h3>Social Media</h3><div class="social-media-options">${socialLinks}</div><button class="contact-cancel">Schließen</button></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.remove(); });
}

export async function contactSeller(teilId, verkäuferId, telefon) {
  if (!verkäuferId && !telefon) { alert("Keine Kontaktinformationen verfügbar"); return; }
  try {
    let contactMethods = ['phone'];
    let socialMedia = null;
    let verkäuferTelefon = telefon;
    if (teilId) {
      try {
        const { data: partData, error } = await supabase.from('parts').select('seller_contact_methods, seller_social_media, seller_phone').eq('id', teilId).single();
        if (!error && partData) {
          console.log('Verkäufer Präferenzen aus part geladen:', partData);
          if (partData.seller_contact_methods && Array.isArray(partData.seller_contact_methods)) contactMethods = partData.seller_contact_methods;
          if (partData.seller_social_media) socialMedia = partData.seller_social_media;
          if (!verkäuferTelefon && partData.seller_phone) verkäuferTelefon = partData.seller_phone;
        }
      } catch (dbError) { console.warn('Fehler beim Laden der Verkäufer-Präferenzen:', dbError); }
    }
    const cleanedPhone = verkäuferTelefon ? verkäuferTelefon.replace(/[^\d+]/g, "") : null;
    const dialog = document.createElement("div");
    dialog.className = "contact-dialog-overlay";
    dialog.innerHTML = `<div class="contact-dialog-content"><h3>Verkäufer kontaktieren</h3><p class="contact-subtitle">Wähle eine Kontaktmethode:</p><div class="contact-options" id="contact-options-container">${generateContactOptions(contactMethods, cleanedPhone, verkäuferId, teilId)}</div><button class="contact-cancel">Abbrechen</button></div>`;
    document.body.appendChild(dialog);
    setupContactEventListeners(dialog, contactMethods, cleanedPhone, verkäuferId, teilId, socialMedia);
    dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.remove(); });
    document.addEventListener("keydown", function escHandler(e) { if (e.key === "Escape") { dialog.remove(); document.removeEventListener("keydown", escHandler); } });
  } catch (error) {
    console.error("Fehler beim Laden der Verkäufer-Präferenzen:", error);
    showBasicContactDialog(verkäuferTelefon || telefon);
  }
}

async function openChatHandler(verkäuferId, teilId) {
  try { await openChat(verkäuferId, teilId); } 
  catch (error) { console.error("Fehler beim Öffnen des Chats:", error); alert("Chat konnte nicht geöffnet werden: " + error.message); }
}

function showBasicContactDialog(telefon) {
  if (!telefon) { alert("Keine Kontaktdaten verfügbar"); return; }
  const cleanedPhone = telefon.replace(/[^\d+]/g, "");
  const dialog = document.createElement("div");
  dialog.className = "contact-dialog-overlay";
  dialog.innerHTML = `<div class="contact-dialog-content"><h3>Kontaktoptionen</h3><div class="contact-options"><button class="contact-option call"><span class="icon">📞</span><span>Anrufen</span></button><button class="contact-option whatsapp"><span class="icon">💬</span><span>WhatsApp</span></button><button class="contact-option sms"><span class="icon">📱</span><span>SMS</span></button></div><button class="contact-cancel">Abbrechen</button></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector(".call").addEventListener("click", () => { window.location.href = `tel:${cleanedPhone}`; dialog.remove(); });
  dialog.querySelector(".whatsapp").addEventListener("click", () => { window.open(`https://wa.me/${cleanedPhone.replace(/[^\d]/g, "")}`, "_blank"); dialog.remove(); });
  dialog.querySelector(".sms").addEventListener("click", () => { window.location.href = `sms:${cleanedPhone}`; dialog.remove(); });
  dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.remove(); });
}

// [Restliche Funktionen bleiben gleich bis loadParts...]

let currentPart = null;
let currentImageIndex = 0;
let imageUrls = [];

export function showImage(index) {
  if (imageUrls.length === 0) return;
  if (index < 0) index = imageUrls.length - 1;
  if (index >= imageUrls.length) index = 0;
  currentImageIndex = index;
  const detailImage = document.getElementById("detail-image");
  detailImage.classList.remove("fade-in");
  setTimeout(() => { detailImage.src = imageUrls[index]; detailImage.classList.add("fade-in"); }, 50);
  document.getElementById("prev-image").disabled = imageUrls.length <= 1;
  document.getElementById("next-image").disabled = imageUrls.length <= 1;
  updateImageIndicators();
  document.getElementById("image-counter").textContent = `${index + 1}/${imageUrls.length}`;
}

export function nextImage() { showImage(currentImageIndex + 1); }
export function prevImage() { showImage(currentImageIndex - 1); }

export function updateImageIndicators() {
  const indicatorsContainer = document.getElementById("image-indicators");
  indicatorsContainer.innerHTML = "";
  if (imageUrls.length <= 1) return;
  for (let i = 0; i < imageUrls.length; i++) {
    const indicator = document.createElement("div");
    indicator.className = `image-indicator ${i === currentImageIndex ? "active" : ""}`;
    indicator.addEventListener("click", () => showImage(i));
    indicatorsContainer.appendChild(indicator);
  }
}

export function openDetailView(teil) {
  const modal = document.getElementById("detail-modal");
  const { name, preis, beschreibung, bild, kategorie, zustand, telefon, verkäufer, typ, id, bilder, link, verkäuferId } = extractData(teil);
  currentPart = teil;
  imageUrls = bilder.length > 0 ? bilder : [bild || "/img/no-image.png"];
  currentImageIndex = 0;
  document.getElementById("detail-title").textContent = name;
  const fallbackUrl = "/img/no-image.png";
  const detailImage = document.getElementById("detail-image");
  detailImage.src = imageUrls[0] || fallbackUrl;
  detailImage.alt = name;
  detailImage.onerror = function () { this.src = fallbackUrl; };
  showImage(0);
  document.getElementById("prev-image").addEventListener("click", prevImage);
  document.getElementById("next-image").addEventListener("click", nextImage);
  function handleKeydown(e) { if (e.key === "ArrowLeft") prevImage(); if (e.key === "ArrowRight") nextImage(); }
  document.addEventListener("keydown", handleKeydown);
  let preisText = preis;
  if (typeof preis === "number") preisText = `${preis.toLocaleString("de-DE")}€`;
  else if (typeof preis === "string" && !isNaN(parseFloat(preis))) preisText = `${parseFloat(preis).toLocaleString("de-DE")}€`;
  document.getElementById("detail-price").textContent = preisText;
  document.getElementById("detail-description").textContent = beschreibung || "Keine detaillierte Beschreibung verfügbar.";
  document.getElementById("detail-category").textContent = kategorie;
  document.getElementById("detail-condition").textContent = zustand;
  document.getElementById("detail-seller").textContent = verkäufer;
  const typeContainer = document.getElementById("detail-type-container");
  const typeElement = document.getElementById("detail-type");
  if (typ) { typeContainer.style.display = "flex"; typeElement.textContent = typ === "teilesuche" ? "Suche" : typ; } 
  else { typeContainer.style.display = "none"; }
  const linkContainer = document.getElementById("detail-link-container") || createLinkContainer();
  const linkButton = document.getElementById("visit-link-btn");
  if (link && link.trim().length > 0) { linkContainer.style.display = "block"; linkButton.onclick = function () { window.open(link, '_blank'); }; } 
  else { linkContainer.style.display = "none"; }
  const contactBtn = document.getElementById("contact-seller-btn");
  contactBtn.onclick = function () { contactSeller(id, verkäuferId, telefon); };
  if (!verkäuferId && !telefon) { contactBtn.disabled = true; contactBtn.textContent = "Keine Kontaktdaten verfügbar"; } 
  else { contactBtn.disabled = false; contactBtn.textContent = "Verkäufer kontaktieren"; }
  const shareBtn = document.getElementById("share-btn");
  shareBtn.onclick = function () { sharePart(id); };
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  log("Detailansicht geöffnet für:", name);
}

function createLinkContainer() {
  const modal = document.getElementById("detail-modal");
  const actionsContainer = modal.querySelector('.modal-actions') || modal.querySelector('.detail-actions');
  if (actionsContainer && !document.getElementById("detail-link-container")) {
    const linkContainer = document.createElement('div');
    linkContainer.id = "detail-link-container";
    linkContainer.style.display = "none";
    linkContainer.innerHTML = `<button id="visit-link-btn" class="action-btn link-btn">🔗 Zur Webseite</button>`;
    actionsContainer.insertBefore(linkContainer, actionsContainer.firstChild);
  }
  return document.getElementById("detail-link-container");
}

export function closeDetailView() {
  const modal = document.getElementById("detail-modal");
  modal.classList.remove("active");
  document.body.style.overflow = "";
  currentPart = null;
  imageUrls = [];
  currentImageIndex = 0;
  log("Detailansicht geschlossen");
}

export function fallbackCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand("copy");
    if (successful) alert("Link zum Teil wurde in die Zwischenablage kopiert!");
    else showLinkDialog(text);
  } catch (err) { console.error("Fallback copy failed:", err); showLinkDialog(text); } 
  finally { document.body.removeChild(textArea); }
}

export function showLinkDialog(url) {
  const message = `Link konnte nicht automatisch kopiert werden. Bitte kopiere den Link manuell:\n\n${url}`;
  alert(message);
}

export async function sharePart(id) {
  if (!id) { alert("Fehler: Teil-ID nicht verfügbar"); return; }
  if (!window.teileSharing) {
    log("TeileSharing nicht verfügbar, verwende Fallback");
    const url = `${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(id)}`;
    if (navigator.share) {
      navigator.share({ title: "Tuning-Teil bei TuningHub", text: "Schau dir dieses Teil bei TuningHub an!", url: url }).catch((err) => console.warn("Sharing failed:", err));
    } else {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => alert("Link zum Teil wurde in die Zwischenablage kopiert!")).catch((err) => { console.error("Fehler beim Kopieren des Links:", err); fallbackCopyToClipboard(url); });
      } else { fallbackCopyToClipboard(url); }
    }
    return;
  }
  window.teileSharing.sharePart(id, currentPart);
}

// NEUE LAZY LOADING FUNKTION
function loadMoreParts() {
  if (isLoading || loadedPartsCount >= allPartsData.length) return;
  
  isLoading = true;
  const container = document.getElementById("angebot-container");
  const endIndex = Math.min(loadedPartsCount + PARTS_PER_LOAD, allPartsData.length);
  
  log(`Lade Teile ${loadedPartsCount + 1} bis ${endIndex}`);
  
  for (let i = loadedPartsCount; i < endIndex; i++) {
    const teil = allPartsData[i];
    try {
      if (teil.isCustomLink) {
        const card = createLinkCard(teil.name, teil.beschreibung, teil.image_url, teil.preis, teil.targetUrl);
        container.appendChild(card);
      } else {
        const card = createCard(teil);
        container.appendChild(card);
      }
    } catch (cardError) {
      log(`Fehler beim Erstellen der Karte ${i + 1}:`, cardError);
    }
  }
  
  loadedPartsCount = endIndex;
  isLoading = false;
  
  // Füge Load-More Trigger hinzu wenn noch mehr Teile vorhanden
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
    document.getElementById("angebot-container").appendChild(trigger);
  }
  
  // Intersection Observer für automatisches Nachladen
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
  if (!container) { log("ERROR: Container nicht gefunden"); return; }
  if (!supabase) { showError("Supabase nicht initialisiert"); return; }
  
  showLoading();
  
  try {
    log("Lade ALLE Daten aus Supabase...");
    const { data, error } = await supabase.from("parts").select("*, seller_contact_methods, seller_social_media, seller_phone").order("created_at", { ascending: false });
    
    if (error) { log("Supabase Fehler:", error); showError(`Datenbankfehler: ${error.message}`); return; }
    
    log("Daten erfolgreich geladen:", data);
    
    const linkCardEntry = {
      id: "custom-link-card",
      name: "AmbrossSachsen",
      beschreibung: "AmbrossSachsen *Zylinder.- und Sonderbearbeitungen*",
      image_url: "/img/zylinderbearbeitung_ambrosssachsen.jpg",
      preis: "Konfigurieren",
      created_at: "2025-08-29T00:00:00Z",
      isCustomLink: true,
      targetUrl: "https://ambrosssachsen.com/shop/AmbrossSachsen-*Zylinder-und-Sonderbearbeitungen*-p777421013",
    };
    
    allPartsData = data ? [...data, linkCardEntry] : [linkCardEntry];
    allPartsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (allPartsData.length === 0) { showEmpty(); return; }
    
    container.innerHTML = "";
    loadedPartsCount = 0;
    
    // Lade erste Batch
    loadMoreParts();
    
    // Prüfe ob ein spezifisches Teil angesprungen werden soll
    setTimeout(() => handleHashScroll(), 500);
    
  } catch (error) {
    log("Unerwarteter Fehler:", error);
    showError(`Unerwarteter Fehler: ${error.message}`);
  }
}

function handleHashScroll() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#teil-')) {
    log("Hash erkannt:", hash);
    const teilId = hash.substring(6); // Entferne '#teil-'
    
    // Prüfe ob das Teil bereits geladen ist
    let element = document.querySelector(hash);
    
    if (element) {
      // Teil ist bereits geladen
      scrollToElement(element);
    } else {
      // Teil muss noch geladen werden
      log("Teil noch nicht geladen, lade alle Teile bis zum Ziel...");
      loadAllPartsUntilHash(teilId);
    }
  }
}

function loadAllPartsUntilHash(teilId) {
  // Finde Index des gesuchten Teils
  const teilIndex = allPartsData.findIndex(t => t.id === teilId);
  
  if (teilIndex === -1) {
    log("Teil nicht in Daten gefunden:", teilId);
    return;
  }
  
  // Lade alle Teile bis zu diesem Index
  const container = document.getElementById("angebot-container");
  for (let i = loadedPartsCount; i <= teilIndex; i++) {
    const teil = allPartsData[i];
    try {
      if (teil.isCustomLink) {
        const card = createLinkCard(teil.name, teil.beschreibung, teil.image_url, teil.preis, teil.targetUrl);
        container.appendChild(card);
      } else {
        const card = createCard(teil);
        container.appendChild(card);
      }
    } catch (cardError) {
      log(`Fehler beim Erstellen der Karte ${i + 1}:`, cardError);
    }
  }
  
  loadedPartsCount = teilIndex + 1;
  
  // Jetzt zum Element scrollen
  setTimeout(() => {
    const element = document.querySelector(`#teil-${teilId}`);
    if (element) {
      scrollToElement(element);
    }
  }, 300);
}

function scrollToElement(element) {
  log("Scrolle zu Element:", element);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  
  // Highlight-Effekt
  element.style.boxShadow = "0 0 0 3px #007bff";
  setTimeout(() => {
    element.style.boxShadow = "";
  }, 2000);
}

// Event Listeners
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadParts().catch((error) => {
      log("Fehler beim Laden:", error);
      showError("Fehler beim Laden der Daten: " + error.message);
    });
  });
} else {
  loadParts().catch((error) => {
    log("Fehler beim Laden:", error);
    showError("Fehler beim Laden der Daten: " + error.message);
  });
}

// Hash-Change Listener für dynamisches Navigieren
window.addEventListener('hashchange', () => {
  handleHashScroll();
});