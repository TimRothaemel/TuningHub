console.log("loadParts.js geladen");

import { supabase } from "./supabaseClient.js";

// Utility functions
function log(message, data = '') {
  console.log(`[TuningHub] ${message}`, data);
}

function showError(message) {
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

function showLoading() {
  const container = document.getElementById("angebot-container");
  if (container) {
    container.innerHTML = `
      <div class="loading-message">
        <p>⏳ Lade Angebote...</p>
      </div>
    `;
  }
}

function showEmpty() {
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

function createCard(teil) {
  const card = document.createElement('div');
  card.className = 'grid-item';
  card.innerHTML = `
    <div class="card">
      <div class="image-container">
        <img src="${teil.image_url || '/img/placeholder.jpg'}" alt="${teil.name || 'Unbekanntes Teil'}" loading="lazy">
      </div>
      <div class="card-content">
        <h3 class="card-title">${teil.name || 'Unbekanntes Teil'}</h3>
        <p class="card-description">${(teil.beschreibung || 'Keine Beschreibung verfügbar').substring(0, 100)}${teil.beschreibung && teil.beschreibung.length > 100 ? '...' : ''}</p>
        <div class="card-footer">
          <span class="price">${teil.preis || '0'}€</span>
          <div class="card-meta">
            <span class="category">${teil.category || 'Tuning-Teil'}</span>
            <span class="condition">${teil.condition || 'Gebraucht'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add click event to open detail modal
  card.addEventListener('click', () => {
    openDetailModal(teil);
  });
  
  return card;
}

function createLinkCard(name, beschreibung, imageUrl, preis, targetUrl) {
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

function openDetailModal(teil) {
  // This function should open your detail modal
  // Implementation depends on your modal system
  console.log('Opening detail modal for:', teil);
  
  // Example implementation (adjust to your modal structure):
  const modal = document.getElementById('detail-modal');
  if (modal) {
    document.getElementById('detail-title').textContent = teil.name || 'Unbekanntes Teil';
    document.getElementById('detail-price').textContent = `${teil.preis || '0'} €`;
    document.getElementById('detail-description').textContent = teil.beschreibung || 'Keine Beschreibung verfügbar';
    document.getElementById('detail-image').src = teil.image_url || '/img/placeholder.jpg';
    
    modal.style.display = 'block';
  }
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

// Auto-load parts when module is imported (optional)
// You can remove this if you want to call loadParts() manually
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

function extractData(teil) {
        const name =
          teil.name ||
          teil.title ||
          teil.bezeichnung ||
          teil.teil_name ||
          "Unbekanntes Teil";
        const preis =
          teil.preis ||
          teil.price ||
          teil.kosten ||
          teil.euro ||
          "Preis auf Anfrage";
        const beschreibung =
          teil.beschreibung || teil.description || teil.details || "";
        const bild =
          teil.bild_url || teil.image_url || teil.foto || teil.bild || null;
        const kategorie =
          teil.kategorie || teil.category || teil.type || "Tuning-Teil";
        const zustand =
          teil.zustand || teil.condition || teil.state || "Gebraucht";
        const telefon = teil.contact_number || teil.phone || teil.telefon || "";
        const verkäufer =
          teil.seller_name || teil.user_name || "Privater Verkäufer";
        const datum = teil.created_at || teil.date || new Date().toISOString();
        const id = teil.id;
        const typ = teil.type || teil.typ || "";

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
        };
      }

      function truncateDescription(text, maxLength = 120) {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + "...";
      }

      function contactSeller(telefon) {
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

      // GEÄNDERT: Neue sharePart Funktion mit TeileSharing Integration
      function sharePart(id) {
        if (!id) {
          alert("Fehler: Teil-ID nicht verfügbar");
          return;
        }

        if (!teileSharing) {
          log("TeileSharing nicht verfügbar, verwende Fallback");
          
          // Fallback für den Fall, dass TeileSharing nicht geladen wurde
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

        // Verwende die neue TeileSharing Klasse
        teileSharing.sharePart(id, currentPart);
      }

      function fallbackCopyToClipboard(text) {
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

      function showLinkDialog(url) {
        const message = `Link konnte nicht automatisch kopiert werden. Bitte kopiere den Link manuell:\n\n${url}`;
        alert(message);
      }

      let currentPart = null;
      let currentImageIndex = 0;
      let imageUrls = [];

      function showImage(index) {
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

      function nextImage() {
        showImage(currentImageIndex + 1);
      }

      function prevImage() {
        showImage(currentImageIndex - 1);
      }

      function updateImageIndicators() {
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
      function openDetailView(teil) {
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

        // GEÄNDERT: Share Button mit neuer sharePart Funktion
        const shareBtn = document.getElementById("share-btn");
        shareBtn.onclick = function () {
          sharePart(id);
        };

        modal.classList.add("active");
        document.body.style.overflow = "hidden";

        log("Detailansicht geöffnet für:", name);
      }

      function closeDetailView() {
        const modal = document.getElementById("detail-modal");
        modal.classList.remove("active");
        document.body.style.overflow = "";
        currentPart = null;
        imageUrls = [];
        currentImageIndex = 0;

        log("Detailansicht geschlossen");
      }

      function createCard(teil) {
        const { name, preis, beschreibung, bild, typ } = extractData(teil);

        const card = document.createElement("div");
        const isSearch = typ === "teilesuche";
        card.className = isSearch ? "card search-card" : "card";

        // WICHTIG: Teil-ID als data-Attribut speichern
        if (teil.id) {
          card.dataset.partId = teil.id;
        }

        const imageUrl =
          bild ||
          "/img/no-image.png";
        const fallbackUrl = "/img/search.png";

        let preisText = preis;
        if (typeof preis === "number") {
          preisText = `${preis.toLocaleString("de-DE")}€`;
        } else if (typeof preis === "string" && !isNaN(parseFloat(preis))) {
          preisText = `${parseFloat(preis).toLocaleString("de-DE")}€`;
        }

        const kurzbeschreibung = truncateDescription(beschreibung, 120);

        card.innerHTML = `
                ${isSearch ? '<span class="search-badge">🔍 SUCHE</span>' : ""}
                <img src="${imageUrl}" 
                     alt="${name}" 
                     onerror="this.src='${fallbackUrl}'" 
                     loading="lazy" />
                <div class="card-content">
                    <h2>${name}</h2>
                    ${
                      kurzbeschreibung
                        ? `<p class="card-description">${kurzbeschreibung}</p>`
                        : ""
                    }
                    <div class="card-footer">
                        <p><strong>${preisText}</strong></p>
                    </div>
                </div>
            `;

        card.addEventListener("click", function () {
          openDetailView(teil);
        });

        return card;
      }

      function createLinkCard(
        title,
        description,
        imageUrl,
        preisText,
        targetUrl
      ) {
        const card = document.createElement("div");
        card.className = "card";

        const fallbackUrl = "/img/search.png";
        const kurzbeschreibung = truncateDescription(description, 120);

        card.innerHTML = `
                <img src="${
                  imageUrl ||
                  "/img/no-image.png"
                }"
                     alt="${title}"
                     onerror="this.src='${fallbackUrl}'"
                     loading="lazy" />
                <div class="card-content">
                    <h2>${title}</h2>
                    ${
                      kurzbeschreibung
                        ? `<p class="card-description">${kurzbeschreibung}</p>`
                        : ""
                    }
                    <div class="card-footer">
                        <p><strong>${preisText}</strong></p>
                    </div>
                </div>
            `;

        card.addEventListener("click", function () {
          window.location.href = targetUrl;
        });

        return card;
      }
