console.log("loadParts.js geladen");

import { supabase, trackingSupabase } from "./supabaseClient.js";

// Import Chat-Modul dynamisch
let ChatModule = null;

// Dynamischer Import der openChat Funktion
async function openChat(sellerId, teilId) {
  try {
    if (!ChatModule) {
      ChatModule = await import('./chat.js');
    }
    
    if (ChatModule && typeof ChatModule.openChat === 'function') {
      return await ChatModule.openChat(sellerId, teilId);
    } else {
      throw new Error('Chat-Modul konnte nicht geladen werden');
    }
  } catch (error) {
    console.error('Fehler beim Laden des Chat-Moduls:', error);
    alert('Chat-Funktion ist momentan nicht verfügbar');
    throw error;
  }
}

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
        <button id="retry-btn" class="retry-btn">Erneut versuchen</button>
      </div>
    `;
    
    // Event Listener statt inline onclick
    const retryBtn = document.getElementById("retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        loadParts();
      });
    }
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
  const datum = teil.created_at;
  const id = teil.id;
  const typ = teil.type;
  const link = teil.link;
  const verkäuferId = teil.user_id || teil.seller_id;

  // Verkäufer-Infos aus dem JOIN mit profiles
  let telefon = null;
  let verkäufer = "Privater Verkäufer";
  let sellerContactMethods = ['phone'];
  let sellerSocialMedia = null;

  if (teil.seller) {
    telefon = teil.seller.phone || null;
    sellerContactMethods = teil.seller.contact_methods || ['phone'];
    
    // Social Media parsen (kann string oder object sein)
    if (teil.seller.social_media) {
      try {
        sellerSocialMedia = typeof teil.seller.social_media === 'string'
          ? JSON.parse(teil.seller.social_media)
          : teil.seller.social_media;
      } catch (e) {
        console.warn('Social Media parsing error:', e);
      }
    }
    
    // Name: Company oder Username
    verkäufer = teil.seller.account_type === 'company' 
      ? teil.seller
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

// Helper: Kontaktoptionen generieren
function generateContactOptions(methods, phone, verkäuferId, teilId) {
  let html = '';

  methods.forEach(method => {
    switch(method) {
      case 'phone':
        if (phone) {
          html += `
            <button class="contact-option call" data-method="call">
              <span class="icon">📞</span>
              <span>Anrufen</span>
            </button>
            <button class="contact-option whatsapp" data-method="whatsapp">
              <span class="icon">💬</span>
              <span>WhatsApp</span>
            </button>
            <button class="contact-option sms" data-method="sms">
              <span class="icon">📱</span>
              <span>SMS</span>
            </button>
          `;
        }
        break;
      
      case 'chat':
        html += `
          <button class="contact-option chat" data-method="chat" data-seller="${verkäuferId}" data-teil="${teilId}">
            <span class="icon">💬</span>
            <span>Chat starten</span>
          </button>
        `;
        break;
      
      case 'social':
        html += `
          <button class="contact-option social" data-method="social">
            <span class="icon">📱</span>
            <span>Social Media</span>
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

// Helper: Event Listener für Kontaktoptionen
function setupContactEventListeners(dialog, methods, phone, verkäuferId, teilId, socialMedia) {
  const container = dialog.querySelector("#contact-options-container");

  if (methods.includes('phone') && phone) {
    const callBtn = container.querySelector('[data-method="call"]');
    const whatsappBtn = container.querySelector('[data-method="whatsapp"]');
    const smsBtn = container.querySelector('[data-method="sms"]');

    if (callBtn) {
      callBtn.addEventListener("click", () => {
        window.location.href = `tel:${phone}`;
        dialog.remove();
      });
    }

    if (whatsappBtn) {
      whatsappBtn.addEventListener("click", () => {
        window.open(`https://wa.me/${phone.replace(/[^\d]/g, "")}`, "_blank");
        dialog.remove();
      });
    }

    if (smsBtn) {
      smsBtn.addEventListener("click", () => {
        window.location.href = `sms:${phone}`;
        dialog.remove();
      });
    }
  }

  if (methods.includes('chat')) {
    const chatBtn = container.querySelector('[data-method="chat"]');
    if (chatBtn) {
      chatBtn.addEventListener("click", async () => {
        dialog.remove();
        await openChatHandler(verkäuferId, teilId);
      });
    }
  }

  if (methods.includes('social')) {
    const socialBtn = container.querySelector('[data-method="social"]');
    if (socialBtn) {
      socialBtn.addEventListener("click", () => {
        dialog.remove();
        if (socialMedia) {
          showSocialMediaDialog(socialMedia);
        } else {
          alert("Keine Social Media Informationen verfügbar");
        }
      });
    }
  }
}

// Social Media Dialog
function showSocialMediaDialog(socialMedia) {
  const dialog = document.createElement("div");
  dialog.className = "contact-dialog-overlay";
  
  let socialLinks = '';
  
  if (socialMedia.instagram) {
    socialLinks += `
      <a href="https://instagram.com/${socialMedia.instagram}" target="_blank" class="social-link">
        <span class="icon">📷</span>
        <span>Instagram: @${socialMedia.instagram}</span>
      </a>
    `;
  }
  
  if (socialMedia.facebook) {
    socialLinks += `
      <a href="${socialMedia.facebook}" target="_blank" class="social-link">
        <span class="icon">👤</span>
        <span>Facebook</span>
      </a>
    `;
  }
  
  if (socialMedia.twitter) {
    socialLinks += `
      <a href="https://twitter.com/${socialMedia.twitter}" target="_blank" class="social-link">
        <span class="icon">🐦</span>
        <span>Twitter: @${socialMedia.twitter}</span>
      </a>
    `;
  }
  
  if (!socialLinks) {
    alert("Keine Social Media Informationen verfügbar");
    return;
  }
  
  dialog.innerHTML = `
    <div class="contact-dialog-content">
      <h3>Social Media</h3>
      <div class="social-media-options">
        ${socialLinks}
      </div>
      <button class="contact-cancel">Schließen</button>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.remove();
  });
}

// HAUPTFUNKTION: Verkäufer kontaktieren (mit Profiles-Integration)
// HAUPTFUNKTION: Verkäufer kontaktieren (mit Profiles-Integration) - FIXED
export async function contactSeller(teilId, verkäuferId, telefon) {
  if (!verkäuferId && !telefon) {
    alert("Keine Kontaktinformationen verfügbar");
    return;
  }

  try {
    let contactMethods = ['phone'];
    let socialMedia = null;
    let verkäuferTelefon = telefon;
    let verkäuferName = 'Verkäufer';
    
    // Hole Kontaktpräferenzen aus profiles-Tabelle
    if (verkäuferId) {
      try {
        console.log('🔍 Lade Verkäufer-Profil für ID:', verkäuferId);
        
        // SCHRITT 1: Lade Basis-Daten ohne JSONB
        const { data: baseProfile, error: baseError } = await supabase
          .from('profiles')
          .select('id,username,phone,email,account_type')
          .eq('id', verkäuferId)
          .maybeSingle();
        
        if (baseError) {
          console.error('❌ Fehler beim Laden des Basis-Profils:', baseError);
          throw baseError;
        }
        
        if (!baseProfile) {
          console.warn('⚠️ Kein Profil gefunden für ID:', verkäuferId);
        } else {
          console.log('✅ Basis-Profil geladen:', baseProfile);
          
          // Setze Basis-Daten
          verkäuferTelefon = baseProfile.phone || telefon;
          verkäuferName = baseProfile.account_type === 'company' 
            ? baseProfile
            : baseProfile.username || 'Verkäufer';
          
          // SCHRITT 2: Lade JSONB-Felder separat
          try {
            const { data: jsonProfile, error: jsonError } = await supabase
              .from('profiles')
              .select('id,contact_methods,social_media')
              .eq('id', verkäuferId)
              .maybeSingle();
            
            if (!jsonError && jsonProfile) {
              console.log('✅ JSONB-Felder geladen:', jsonProfile);
              
              // Contact Methods
              if (jsonProfile.contact_methods) {
                if (Array.isArray(jsonProfile.contact_methods)) {
                  contactMethods = jsonProfile.contact_methods;
                } else if (typeof jsonProfile.contact_methods === 'string') {
                  try {
                    contactMethods = JSON.parse(jsonProfile.contact_methods);
                  } catch (e) {
                    console.warn('⚠️ Contact Methods parsing error:', e);
                  }
                }
              }
              
              // Social Media
              if (jsonProfile.social_media) {
                try {
                  socialMedia = typeof jsonProfile.social_media === 'string' 
                    ? JSON.parse(jsonProfile.social_media) 
                    : jsonProfile.social_media;
                } catch (e) {
                  console.warn('⚠️ Social Media parsing error:', e);
                }
              }
              
              console.log('📋 Finale Kontaktdaten:', {
                contactMethods,
                socialMedia,
                phone: verkäuferTelefon
              });
            } else if (jsonError) {
              console.warn('⚠️ JSONB-Fehler (nicht kritisch):', jsonError.message);
            }
          } catch (jsonErr) {
            console.warn('⚠️ JSONB-Abfrage fehlgeschlagen (nicht kritisch):', jsonErr);
          }
        }
      } catch (dbError) {
        console.error('❌ Fehler beim Laden des Verkäufer-Profils:', dbError);
        // Fahre mit Default-Werten fort
      }
    }

    const cleanedPhone = verkäuferTelefon ? verkäuferTelefon.replace(/[^\d+]/g, "") : null;

    const dialog = document.createElement("div");
    dialog.className = "contact-dialog-overlay";
    dialog.innerHTML = `
      <div class="contact-dialog-content">
        <h3>${verkäuferName} kontaktieren</h3>
        <p class="contact-subtitle">Wähle eine Kontaktmethode:</p>
        <div class="contact-options" id="contact-options-container">
          ${generateContactOptions(contactMethods, cleanedPhone, verkäuferId, teilId)}
        </div>
        <button class="contact-cancel">Abbrechen</button>
      </div>
    `;

    document.body.appendChild(dialog);

    setupContactEventListeners(dialog, contactMethods, cleanedPhone, verkäuferId, teilId, socialMedia);

    dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.remove();
    });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        dialog.remove();
        document.removeEventListener("keydown", escHandler);
      }
    });

  } catch (error) {
    console.error("❌ Fehler in contactSeller:", error);
    // Fallback zu Basic Dialog
    showBasicContactDialog(telefon);
  }
}
async function openChatHandler(verkäuferId, teilId) {
  try {
    await openChat(verkäuferId, teilId);
  } catch (error) {
    console.error("Fehler beim Öffnen des Chats:", error);
    alert("Chat konnte nicht geöffnet werden: " + error.message);
  }
}

function showBasicContactDialog(telefon) {
  if (!telefon) {
    alert("Keine Kontaktdaten verfügbar");
    return;
  }

  const cleanedPhone = telefon.replace(/[^\d+]/g, "");

  const dialog = document.createElement("div");
  dialog.className = "contact-dialog-overlay";
  dialog.innerHTML = `
    <div class="contact-dialog-content">
      <h3>Kontaktoptionen</h3>
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
    dialog.remove();
  });

  dialog.querySelector(".whatsapp").addEventListener("click", () => {
    window.open(`https://wa.me/${cleanedPhone.replace(/[^\d]/g, "")}`, "_blank");
    dialog.remove();
  });

  dialog.querySelector(".sms").addEventListener("click", () => {
    window.location.href = `sms:${cleanedPhone}`;
    dialog.remove();
  });

  dialog.querySelector(".contact-cancel").addEventListener("click", () => dialog.remove());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.remove();
  });
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

  document.getElementById("image-counter").textContent = `${index + 1}/${imageUrls.length}`;
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
    indicator.className = `image-indicator ${i === currentImageIndex ? "active" : ""}`;
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
    verkäuferId,
  } = extractData(teil);

  currentPart = teil;

  imageUrls = bilder.length > 0 ? bilder : [bild || "/img/no-image.png"];
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

  document.getElementById("prev-image").addEventListener("click", prevImage);
  document.getElementById("next-image").addEventListener("click", nextImage);

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

  const typeContainer = document.getElementById("detail-type-container");
  const typeElement = document.getElementById("detail-type");
  if (typ) {
    typeContainer.style.display = "flex";
    typeElement.textContent = typ === "teilesuche" ? "Suche" : typ;
  } else {
    typeContainer.style.display = "none";
  }

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
    contactSeller(id, verkäuferId, telefon);
  };

  if (!verkäuferId && !telefon) {
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

// HAUPTFUNKTION: Teile laden (MIT JOIN zu profiles)
// HAUPTFUNKTION: Teile laden (MIT verbessertem JOIN zu profiles)
export async function loadParts() {
  log("🔄 Starte Laden der Angebote...");

  const container = document.getElementById("angebot-container");
  if (!container) {
    log("❌ ERROR: Container nicht gefunden");
    return;
  }

  if (!supabase) {
    showError("Supabase nicht initialisiert");
    return;
  }

  showLoading();

  try {
    log("📡 Lade Daten aus Supabase mit JOIN zu profiles...");

    // Überprüfe Supabase-Verbindung
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Supabase-Client nicht korrekt initialisiert');
    }

    // STRATEGIE 1: Versuche JOIN mit allen Feldern (inkl. JSONB)
    let { data, error } = await supabase
      .from("parts")
      .select(`
        *,
        seller:profiles!parts_user_id_fkey (
          id,
          username,
          phone,
          email,
          account_type,
          contact_methods,
          social_media
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);
    
    // STRATEGIE 2: Wenn JSONB-Fehler, versuche ohne JSONB und lade separat
    if (error && (error.message.includes('json') || error.message.includes('400'))) {
      log("⚠️ JSONB im JOIN fehlgeschlagen, lade separat...");
      
      // Hole Daten ohne JSONB
      const result = await supabase
        .from("parts")
        .select(`
          *,
          seller:profiles!parts_user_id_fkey (
            id,
            username,
            phone,
            email,
            account_type,
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      
      data = result.data;
      error = result.error;
      
      // Lade JSONB-Felder separat
      if (!error && data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.seller?.id).filter(Boolean))];
        
        if (userIds.length > 0) {
          log("📡 Lade JSONB-Felder für", userIds.length, "Verkäufer...");
          
          // Nutze IN-Query statt einzelner Abfragen
          const { data: profilesWithJson, error: jsonError } = await supabase
            .from("profiles")
            .select("id, contact_methods, social_media")
            .in("id", userIds);
          
          if (!jsonError && profilesWithJson && profilesWithJson.length > 0) {
            log("✅ JSONB-Felder geladen für", profilesWithJson.length, "Verkäufer");
            
            // Merge JSONB-Daten
            data = data.map(part => {
              if (part.seller) {
                const jsonData = profilesWithJson.find(p => p.id === part.seller.id);
                if (jsonData) {
                  part.seller.contact_methods = jsonData.contact_methods || ['phone'];
                  part.seller.social_media = jsonData.social_media || null;
                  log(`✅ JSONB für ${part.seller.username}:`, {
                    contact_methods: jsonData.contact_methods,
                    social_media: jsonData.social_media
                  });
                }
              }
              return part;
            });
          } else if (jsonError) {
            log("⚠️ JSONB-Fehler:", jsonError.message);
          }
        }
      }
    }

    // STRATEGIE 3: Vollständiger Fallback ohne JOIN
    if (error && error.message.includes('relationship')) {
      log("⚠️ JOIN komplett fehlgeschlagen, verwende Fallback-Methode");
      
      const { data: partsData, error: partsError } = await supabase
        .from("parts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (partsError) throw partsError;

      const userIds = [...new Set(partsData.map(p => p.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        log("📡 Lade Profile separat für", userIds.length, "Verkäufer...");
        
        // Nutze IN-Query für bessere Performance
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, phone, email, contact_methods, social_media, account_type")
          .in("id", userIds);

        if (!profilesError && profilesData && profilesData.length > 0) {
          log("✅ Profile geladen:", profilesData.length);
          
          data = partsData.map(part => ({
            ...part,
            seller: profilesData.find(p => p.id === part.user_id) || null
          }));
        } else if (profilesError) {
          log("⚠️ Profile-Fehler:", profilesError.message);
          data = partsData;
        } else {
          data = partsData;
        }
      } else {
        data = partsData;
      }
      
      error = null;
    }

    if (error) {
      log("❌ Supabase Fehler:", error);
      showError(`Datenbankfehler: ${error.message}`);
      return;
    }

    log("✅ Daten erfolgreich geladen:", data);

    // Custom Link Card hinzufügen
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
      log(`🔧 Verarbeite Teil ${index + 1}:`, teil);

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
        log(`❌ Fehler beim Erstellen der Karte ${index + 1}:`, cardError);
      }
    });

    log(`✅ ${allData.length} Teile erfolgreich angezeigt (maximal 20)`);
  } catch (error) {
    log("❌ Unerwarteter Fehler:", error);
    showError(`Unerwarteter Fehler: ${error.message}`);
  }
}

// Auto-Load beim Seitenaufruf
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadParts().catch((error) => {
      log("❌ Fallback: Zeige Test-Daten wegen Fehler:", error);
      showError("Fehler beim Laden der Daten: " + error.message);
    });
  });
} else {
  loadParts().catch((error) => {
    log("❌ Fallback: Zeige Test-Daten wegen Fehler:", error);
    showError("Fehler beim Laden der Daten: " + error.message);
  });
}

// "Mehr"-Link Logik
document.addEventListener("DOMContentLoaded", () => {
  const mehrLink = document.getElementById("mehr-link");
  if (!mehrLink) return;

  mehrLink.addEventListener("click", () => {
    const allParts = document.querySelectorAll("#angebot-container .card");
    if (allParts.length > 0) {
      const lastPart = allParts[allParts.length - 1];
      const partId = lastPart.getAttribute("data-id");
      mehrLink.href = `/html/teileübersicht.html#teil-${partId}`;
    }
  });
});

// Mache loadParts global verfügbar für inline onclick Handler
window.loadParts = loadParts;