console.log("loadParts.js geladen");

import { supabase, trackingSupabase } from "./supabaseClient.js";

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
  const { name, preis, beschreibung, bild, typ } = extractData(teil);

  const card = document.createElement("div");
  const isSearch = typ === "teilesuche";
  card.className = isSearch ? "card search-card" : "card";

  // Prüfen ob Teil einen Link hat
  const hasExternalLink = teil.link && teil.link.trim().length > 0;
  
  // External link badge hinzufügen wenn Link vorhanden
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

  // Click-Handler: Link oder Detail-View je nach Teil
  card.addEventListener("click", function (e) {
    e.preventDefault();
    
    if (hasExternalLink) {
      // Externen Link in neuem Tab öffnen
      window.open(teil.link, '_blank');
      log(`Externen Link geöffnet: ${teil.link}`);
    } else {
      // Detail-View für Teile ohne Link
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
  
  // Add click event to open external link
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
  const telefon = teil.contact_number;
  const verkäufer = "Privater Verkäufer";
  const datum = teil.created_at;
  const id = teil.id;
  const typ = teil.type;
  const link = teil.link; // Link extrahieren

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
    link, // Link zurückgeben
  };
}

export function truncateDescription(text, maxLength = 120) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength).trim() + "...";
}

export function contactSeller(telefon) {
  if (!telefon) {
    alert("Keine Telefonnummer verfügbar");
    return;
  }

  const cleanedPhone = telefon.replace(/[^\d+]/g, "");

  const dialog = document.createElement("div");
  dialog.className = "contact-dialog-overlay";
  dialog.innerHTML = `
    <div class="contact-dialog-content">
      <h3>Kontaktoptionen</h3>
      <p class="contact-phone">${telefon}</p>
      <div class="contact-options">
        <button class="contact-option call">
          <span class="icon">📞</span>
          <span>Anrufen</span>
        </button>
        <button class="contact-option whatsapp">
          <span class="icon">💬</span>
          <span>WhatsApp</span>
        </button>
        <button class="contact-option sms">
          <span class="icon">📱</span>
          <span>SMS</span>
        </button>
      </div>
      <button class="contact-cancel">Abbrechen</button>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector(".call").addEventListener("click", () => {
    window.location.href = `tel:${cleanedPhone}`;
    removeDialog();
  });

  dialog.querySelector(".whatsapp").addEventListener("click", () => {
    window.open(
      `https://wa.me/${cleanedPhone.replace(/[^\d]/g, "")}`,
      "_blank"
    );
    removeDialog();
  });

  dialog.querySelector(".sms").addEventListener("click", () => {
    window.location.href = `sms:${cleanedPhone}`;
    removeDialog();
  });

  dialog
    .querySelector(".contact-cancel")
    .addEventListener("click", removeDialog);

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      removeDialog();
    }
  });

  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      removeDialog();
      document.removeEventListener("keydown", escHandler);
    }
  });

  function removeDialog() {
    dialog.remove();
  }
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
    if (successful) {
      alert("Link zum Teil wurde in die Zwischenablage kopiert!");
    } else {
      showLinkDialog(text);
    }
  } catch (err) {
    console.error("Fallback copy failed:", err);
    showLinkDialog(text);
  } finally {
    document.body.removeChild(textArea);
  }
}

export function showLinkDialog(url) {
  const message = `Link konnte nicht automatisch kopiert werden. Bitte kopiere den Link manuell:\n\n${url}`;
  alert(message);
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

  detailImage.classList.remove("fade-in");
  setTimeout(() => {
    detailImage.src = imageUrls[index];
    detailImage.classList.add("fade-in");
  }, 50);

  document.getElementById("prev-image").disabled = imageUrls.length <= 1;
  document.getElementById("next-image").disabled = imageUrls.length <= 1;

  updateImageIndicators();

  document.getElementById("image-counter").textContent = `${index + 1}/${
    imageUrls.length
  }`;
}

export function nextImage() {
  showImage(currentImageIndex + 1);
}

export function prevImage() {
  showImage(currentImageIndex - 1);
}

export function updateImageIndicators() {
  const indicatorsContainer = document.getElementById("image-indicators");
  indicatorsContainer.innerHTML = "";

  if (imageUrls.length <= 1) return;

  for (let i = 0; i < imageUrls.length; i++) {
    const indicator = document.createElement("div");
    indicator.className = `image-indicator ${
      i === currentImageIndex ? "active" : ""
    }`;
    indicator.addEventListener("click", () => showImage(i));
    indicatorsContainer.appendChild(indicator);
  }
}

export function openDetailView(teil) {
  const modal = document.getElementById("detail-modal");
  const {
    name,
    preis,
    beschreibung,
    bild,
    kategorie,
    zustand,
    telefon,
    verkäufer,
    typ,
    id,
    bilder,
    link,
  } = extractData(teil);

  currentPart = teil;

  imageUrls =
    bilder.length > 0
      ? bilder
      : [
          bild ||
            "/img/no-image.png",
        ];
  currentImageIndex = 0;

  document.getElementById("detail-title").textContent = name;

  const fallbackUrl = "/img/no-image.png";
  const detailImage = document.getElementById("detail-image");
  detailImage.src = imageUrls[0] || fallbackUrl;
  detailImage.alt = name;
  detailImage.onerror = function () {
    this.src = fallbackUrl;
  };

  showImage(0);

  document
    .getElementById("prev-image")
    .addEventListener("click", prevImage);
  document
    .getElementById("next-image")
    .addEventListener("click", nextImage);

  function handleKeydown(e) {
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "ArrowRight") nextImage();
  }

  document.addEventListener("keydown", handleKeydown);

  let preisText = preis;
  if (typeof preis === "number") {
    preisText = `${preis.toLocaleString("de-DE")}€`;
  } else if (typeof preis === "string" && !isNaN(parseFloat(preis))) {
    preisText = `${parseFloat(preis).toLocaleString("de-DE")}€`;
  }
  document.getElementById("detail-price").textContent = preisText;

  document.getElementById("detail-description").textContent =
    beschreibung || "Keine detaillierte Beschreibung verfügbar.";

  document.getElementById("detail-category").textContent = kategorie;
  document.getElementById("detail-condition").textContent = zustand;
  document.getElementById("detail-seller").textContent = verkäufer;
  document.getElementById("detail-phone").textContent =
    telefon || "Nicht verfügbar";

  const typeContainer = document.getElementById("detail-type-container");
  const typeElement = document.getElementById("detail-type");
  if (typ) {
    typeContainer.style.display = "flex";
    typeElement.textContent = typ === "teilesuche" ? "Suche" : typ;
  } else {
    typeContainer.style.display = "none";
  }

  // Link-Button in Detail-View hinzufügen/aktualisieren
  const linkContainer = document.getElementById("detail-link-container") || createLinkContainer();
  const linkButton = document.getElementById("visit-link-btn");
  
  if (link && link.trim().length > 0) {
    linkContainer.style.display = "block";
    linkButton.onclick = function () {
      window.open(link, '_blank');
    };
  } else {
    linkContainer.style.display = "none";
  }

  const contactBtn = document.getElementById("contact-seller-btn");
  contactBtn.onclick = function () {
    contactSeller(telefon);
  };

  if (!telefon) {
    contactBtn.disabled = true;
    contactBtn.textContent = "Keine Kontaktdaten verfügbar";
  } else {
    contactBtn.disabled = false;
    contactBtn.textContent = "Verkäufer kontaktieren";
  }

  const shareBtn = document.getElementById("share-btn");
  shareBtn.onclick = function () {
    sharePart(id);
  };

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  log("Detailansicht geöffnet für:", name);
}

// Funktion zum Erstellen des Link-Containers in der Detail-View (falls nicht vorhanden)
function createLinkContainer() {
  const modal = document.getElementById("detail-modal");
  const actionsContainer = modal.querySelector('.modal-actions') || modal.querySelector('.detail-actions');
  
  if (actionsContainer && !document.getElementById("detail-link-container")) {
    const linkContainer = document.createElement('div');
    linkContainer.id = "detail-link-container";
    linkContainer.style.display = "none";
    linkContainer.innerHTML = `
      <button id="visit-link-btn" class="action-btn link-btn">
        🔗 Zur Webseite
      </button>
    `;
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

export async function sharePart(id) {
  if (!id) {
    alert("Fehler: Teil-ID nicht verfügbar");
    return;
  }

  if (!window.teileSharing) {
    log("TeileSharing nicht verfügbar, verwende Fallback");
    
    const url = `${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(id)}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Tuning-Teil bei TuningHub",
        text: "Schau dir dieses Teil bei TuningHub an!",
        url: url,
      }).catch((err) => console.warn("Sharing failed:", err));
    } else {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(() => alert("Link zum Teil wurde in die Zwischenablage kopiert!"))
          .catch((err) => {
            console.error("Fehler beim Kopieren des Links:", err);
            fallbackCopyToClipboard(url);
          });
      } else {
        fallbackCopyToClipboard(url);
      }
    }
    return;
  }

  window.teileSharing.sharePart(id, currentPart);
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

  showLoading();

  try {
    log("Lade Daten aus Supabase...");

    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      log("Supabase Fehler:", error);
      showError(`Datenbankfehler: ${error.message}`);
      return;
    }

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

    let allData = data ? [...data, linkCardEntry] : [linkCardEntry];
    allData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    allData = allData.slice(0, 20);

    if (allData.length === 0) {
      showEmpty();
      return;
    }

    container.innerHTML = "";

    allData.forEach((teil, index) => {
      log(`Verarbeite Teil ${index + 1}:`, teil);

      try {
        if (teil.isCustomLink) {
          const card = createLinkCard(
            teil.name,
            teil.beschreibung,
            teil.image_url,
            teil.preis,
            teil.targetUrl
          );
          container.appendChild(card);
        } else {
          const card = createCard(teil);
          container.appendChild(card);
        }
      } catch (cardError) {
        log(`Fehler beim Erstellen der Karte ${index + 1}:`, cardError);
      }
    });

    log(`✅ ${allData.length} Teile erfolgreich angezeigt (maximal 20)`);
  } catch (error) {
    log("Unerwarteter Fehler:", error);
    showError(`Unerwarteter Fehler: ${error.message}`);
  }
}

// Auto-load parts when module is imported
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadParts().catch((error) => {
      log("Fallback: Zeige Test-Daten wegen Fehler:", error);
      showError("Fehler beim Laden der Daten: " + error.message);
    });
  });
} else {
  // DOM already loaded
  loadParts().catch((error) => {
    log("Fallback: Zeige Test-Daten wegen Fehler:", error);
    showError("Fehler beim Laden der Daten: " + error.message);
  });
}
