// teileübersicht.js - Komplette Logik für Teilübersicht
console.log("teileübersicht.js geladen");

// ===== SUPABASE CLIENT =====
let supabase = null;

// Funktion zum Warten auf Supabase
function waitForSupabase() {
    return new Promise((resolve) => {
        if (window.supabase) {
            console.log("[TuningHub] Supabase Client bereits verfügbar");
            resolve(window.supabase);
        } else {
            console.log("[TuningHub] Warte auf Supabase Client...");
            const checkInterval = setInterval(() => {
                if (window.supabase) {
                    console.log("[TuningHub] Supabase Client gefunden");
                    clearInterval(checkInterval);
                    resolve(window.supabase);
                }
            }, 50);
        }
    });
}

// ===== GLOBALE VARIABLEN =====
let currentPart = null;
let currentImageIndex = 0;
let imageUrls = [];

// ===== UTILITY FUNCTIONS =====
function log(message, data = null) {
    console.log(`[TuningHub] ${message}`, data || "");
}

function showError(message) {
    const container = document.getElementById("angebot-container");
    if (container) {
        container.innerHTML = `<div class="error">❌ ${message}</div>`;
        log(`ERROR: ${message}`);
    }
}

function showLoading() {
    const container = document.getElementById("angebot-container");
    if (container) {
        container.innerHTML = '<div class="loading">🔄 Lade Angebote...</div>';
    }
}

function showEmpty() {
    const container = document.getElementById("angebot-container");
    if (container) {
        container.innerHTML = '<div class="empty">📦 Keine Angebote vorhanden</div>';
    }
}

function extractData(teil) {
    const name = teil.name || teil.title || teil.bezeichnung || teil.teil_name || "Unbekanntes Teil";
    const preis = teil.preis || teil.price || teil.kosten || teil.euro || "Preis auf Anfrage";
    const beschreibung = teil.beschreibung || teil.description || teil.details || "";
    const bild = teil.bild_url || teil.image_url || teil.foto || teil.bild || null;
    const kategorie = teil.kategorie || teil.category || teil.type || "Tuning-Teil";
    const zustand = teil.zustand || teil.condition || teil.state || "Gebraucht";
    const telefon = teil.contact_number || teil.seller_phone || teil.phone || teil.telefon || "";
    const verkäufer = teil.seller_name || teil.user_name || "Privater Verkäufer";
    const datum = teil.created_at || teil.date || new Date().toISOString();
    const id = teil.id;
    const typ = teil.type || teil.typ || "";
    const link = teil.link;
    const verkäuferId = teil.user_id || teil.seller_id;

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
        verkäuferId
    };
}

function truncateDescription(text, maxLength = 120) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength).trim() + "...";
}

// ===== KONTAKT-DIALOG HELPER FUNCTIONS =====
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
                console.log("Chat öffnen für Verkäufer:", verkäuferId, "Teil:", teilId);
                alert("Chat-Funktion wird geladen...");
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

// ===== KONTAKT-FUNKTIONEN =====
async function contactSeller(teilId, verkäuferId, telefon) {
    if (!verkäuferId && !telefon) {
        alert("Keine Kontaktinformationen verfügbar");
        return;
    }

    try {
        let contactMethods = ['phone'];
        let socialMedia = null;
        let verkäuferTelefon = telefon;
        
        if (teilId && supabase) {
            try {
                const { data: partData, error } = await supabase
                    .from('parts')
                    .select('seller_contact_methods, seller_social_media, seller_phone')
                    .eq('id', teilId)
                    .single();
                
                if (!error && partData) {
                    console.log('Verkäufer Präferenzen geladen:', partData);
                    
                    if (partData.seller_contact_methods && Array.isArray(partData.seller_contact_methods)) {
                        contactMethods = partData.seller_contact_methods;
                    }
                    
                    if (partData.seller_social_media) {
                        socialMedia = partData.seller_social_media;
                    }
                    
                    if (!verkäuferTelefon && partData.seller_phone) {
                        verkäuferTelefon = partData.seller_phone;
                    }
                }
            } catch (dbError) {
                console.warn('Fehler beim Laden der Verkäufer-Präferenzen:', dbError);
            }
        }

        const cleanedPhone = verkäuferTelefon ? verkäuferTelefon.replace(/[^\d+]/g, "") : null;

        const dialog = document.createElement("div");
        dialog.className = "contact-dialog-overlay";
        dialog.innerHTML = `
            <div class="contact-dialog-content">
                <h3>Verkäufer kontaktieren</h3>
                <p class="contact-subtitle">Wähle eine Kontaktmethode:</p>
                ${verkäuferTelefon ? `<p class="contact-phone">${verkäuferTelefon}</p>` : ''}
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
        console.error("Fehler beim Laden der Verkäufer-Präferenzen:", error);
        showBasicContactDialog(verkäuferTelefon || telefon);
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

// ===== SHARE-FUNKTIONEN =====
function sharePart(id) {
    if (!id) {
        alert("Fehler: Teil-ID nicht verfügbar");
        return;
    }

    const url = `${window.location.origin}/../index.html?part=${encodeURIComponent(id)}`;

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
            alert(`Link konnte nicht automatisch kopiert werden. Bitte kopiere den Link manuell:\n\n${text}`);
        }
    } catch (err) {
        console.error("Fallback copy failed:", err);
        alert(`Link konnte nicht automatisch kopiert werden. Bitte kopiere den Link manuell:\n\n${text}`);
    } finally {
        document.body.removeChild(textArea);
    }
}

// ===== BILDVERWALTUNG =====
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

    document.getElementById("image-counter").textContent = `${index + 1}/${imageUrls.length}`;
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
        indicator.className = `image-indicator ${i === currentImageIndex ? "active" : ""}`;
        indicator.addEventListener("click", () => showImage(i));
        indicatorsContainer.appendChild(indicator);
    }
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

// ===== DETAIL-VIEW =====
function openDetailView(teil) {
    sessionStorage.setItem('tuninghub_scroll_position', window.scrollY);
    
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
        verkäuferId
    } = extractData(teil);

    currentPart = teil;
    imageUrls = bilder.length > 0 ? bilder : [bild || "/img/search.png"];
    currentImageIndex = 0;

    document.getElementById("detail-title").textContent = name;

    const fallbackUrl = "/img/search.png";
    const detailImage = document.getElementById("detail-image");
    detailImage.src = imageUrls[0] || fallbackUrl;
    detailImage.alt = name;
    detailImage.onerror = function () {
        this.src = fallbackUrl;
    };

    showImage(0);

    const prevBtn = document.getElementById("prev-image");
    const nextBtn = document.getElementById("next-image");
    
    prevBtn.replaceWith(prevBtn.cloneNode(true));
    nextBtn.replaceWith(nextBtn.cloneNode(true));
    
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

function closeDetailView() {
    const modal = document.getElementById("detail-modal");
    modal.classList.remove("active");
    document.body.style.overflow = "";
    currentPart = null;
    imageUrls = [];
    currentImageIndex = 0;

    const savedPosition = sessionStorage.getItem('tuninghub_scroll_position');
    if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition));
        console.log('Scroll-Position wiederhergestellt:', savedPosition);
        sessionStorage.removeItem('tuninghub_scroll_position');
    }

    log("Detailansicht geschlossen");
}

function createCard(teil) {
    const { name, preis, beschreibung, bild, typ, id } = extractData(teil);

    const card = document.createElement("div");
    const isSearch = typ === "teilesuche";
    card.className = isSearch ? "card search-card" : "card";

    if (id !== undefined && id !== null) {
        card.id = `teil-${id}`;
        card.setAttribute('data-id', id);
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
        ${isSearch ? '<span class="search-badge">🔍 SUCHE</span>' : ""}
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

    card.addEventListener("click", function () {
        openDetailView(teil);
    });

    return card;
}

function createLinkCard(title, description, imageUrl, preisText, targetUrl) {
    const card = document.createElement("div");
    card.className = "card";

    const fallbackUrl = "/img/search.png";
    const kurzbeschreibung = truncateDescription(description, 120);

    card.innerHTML = `
        <img src="${imageUrl || "/img/no-image.png"}"
             alt="${title}"
             onerror="this.src='${fallbackUrl}'"
             loading="lazy" />
        <div class="card-content">
            <h2>${title}</h2>
            ${kurzbeschreibung ? `<p class="card-description">${kurzbeschreibung}</p>` : ""}
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

// ===== HAUPT-LADE-FUNKTION =====
async function ladeAngebote() {
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

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    
    showLoading();

    try {
        log("Lade Daten aus Supabase...");

        const { data, error } = await supabase
            .from("parts")
            .select("*")
            .order("created_at", { ascending: false });

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
            targetUrl: "https://ambrosssachsen.com/shop/AmbrossSachsen-*Zylinder-und-Sonderbearbeitungen*-p777421013"
        };

        const allData = data ? [...data, linkCardEntry] : [linkCardEntry];
        window.allParts = allData;

        let displayData = allData;
        
        if (searchQuery && searchQuery.trim()) {
            log("Führe direkte Suche aus für:", searchQuery);
            
            const searchInput = document.getElementById('searchbar') || document.querySelector('.searchbar');
            if (searchInput && !searchInput.value) {
                searchInput.value = searchQuery;
            }
            
            const query = searchQuery.toLowerCase().trim();
            displayData = allData.filter(teil => {
                const name = (teil.name || teil.title || '').toLowerCase();
                const beschreibung = (teil.beschreibung || teil.description || '').toLowerCase();
                const typ = (teil.type || teil.typ || '').toLowerCase();
                
                return name.includes(query) || 
                       beschreibung.includes(query) || 
                       typ.includes(query) ||
                       (name + ' ' + beschreibung).includes(query);
            });
            
            log(`Suchergebnisse: ${displayData.length} von ${allData.length} Teilen`);
        }

        if (displayData.length === 0) {
            if (searchQuery) {
                container.innerHTML = `
                    <div class="search-empty" style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                        <h3>Keine Ergebnisse für "${searchQuery}" gefunden</h3>
                        <p>Versuche andere Suchbegriffe oder durchstöbere alle verfügbaren Teile.</p>
                        <button onclick="window.TuningHub.clearSearchAndReload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                            Suche zurücksetzen
                        </button>
                    </div>
                `;
            } else {
                showEmpty();
            }
            return;
        }

        container.innerHTML = "";

        displayData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (searchQuery) {
            const searchHeader = document.createElement('div');
            searchHeader.className = 'search-results-header';
            searchHeader.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;';
            searchHeader.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #333;">Suchergebnisse für "${searchQuery}"</h3>
                <p style="margin: 0; color: #666;">${displayData.length} ${displayData.length === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden</p>
                <button onclick="window.TuningHub.clearSearchAndReload()" style="margin-top: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Alle Teile anzeigen
                </button>
            `;
            container.appendChild(searchHeader);
        }

        displayData.forEach((teil, index) => {
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

        log(`✅ ${displayData.length} Teile erfolgreich angezeigt`);
        
    } catch (error) {
        log("Unerwarteter Fehler:", error);
        showError(`Unerwarteter Fehler: ${error.message}`);
    }
}

// ===== HILFSFUNKTIONEN =====
function clearSearchAndReload() {
    const url = new URL(window.location);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url);
    
    const searchInput = document.getElementById('searchbar') || document.querySelector('.searchbar');
    if (searchInput) {
        searchInput.value = '';
    }
    
    ladeAngebote();
}

async function setAccountLink() {
    if (!supabase) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const accountLink = document.getElementById("account-link");
        if (accountLink) {
            accountLink.href = user ? "account.html" : "login.html";
            log("Account-Link gesetzt:", user ? "Eingeloggt" : "Nicht eingeloggt");
        }
    } catch (error) {
        log("Fehler beim Setzen des Account-Links:", error);
    }
}

function setupSearch() {
    const searchInput = document.querySelector(".searchbar");
    if (!searchInput) return;

    searchInput.addEventListener("input", function (e) {
        const query = e.target.value.toLowerCase();
        log("Suche:", query);
    });
}

function setupDetailView() {
    const closeBtn = document.getElementById("close-detail");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeDetailView);
    }

    const modal = document.getElementById("detail-modal");
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === this) {
                closeDetailView();
            }
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            const modal = document.getElementById("detail-modal");
            if (modal && modal.classList.contains("active")) {
                closeDetailView();
            }
        }
    });

    log("Detailansicht Event-Listener eingerichtet");
}

function handleSharedPartLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const partId = urlParams.get("part");

    if (partId) {
        log("Shared part ID detected:", partId);

        setTimeout(async () => {
            try {
                const { data: part, error } = await supabase
                    .from("parts")
                    .select("*")
                    .eq("id", partId)
                    .single();

                if (error) {
                    log("Error loading shared part:", error);
                    alert("Das geteilte Teil konnte nicht gefunden werden.");
                    return;
                }

                if (part) {
                    log("Opening shared part:", part);
                    openDetailView(part);
                } else {
                    alert("Das geteilte Teil existiert nicht mehr.");
                }
            } catch (error) {
                log("Error handling shared part:", error);
                alert("Fehler beim Laden des geteilten Teils.");
            }
        }, 1000);
    }
}

function handleHashScroll() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#teil-')) {
        log("Hash erkannt:", hash);
        
        setTimeout(() => {
            const element = document.querySelector(hash);
            if (element) {
                log("Scrolle zu Element:", element);
                element.scrollIntoView({ 
                    behavior: "smooth",
                    block: "center"
                });
                element.style.boxShadow = "0 0 0 3px #007bff";
                setTimeout(() => {
                    element.style.boxShadow = "";
                }, 2000);
            } else {
                log("Element nicht gefunden:", hash);
            }
        }, 800);
    }
}

// ===== INITIALISIERUNG =====
async function initializePage() {
    log("DOM geladen, starte Initialisierung...");

    supabase = await waitForSupabase();
    log("Supabase Client bereit");

    setAccountLink();
    setupSearch();
    setupDetailView();

    await ladeAngebote().catch((error) => {
        log("Fallback: Zeige Test-Daten wegen Fehler:", error);
        showError("Fehler beim Laden der Daten: " + error.message);
    });

    handleHashScroll();
    handleSharedPartLink();
}

document.addEventListener("DOMContentLoaded", initializePage);

window.addEventListener("error", function (e) {
    log("Globaler Fehler:", e.error);
});

// ===== GLOBALE EXPORTS =====
window.TuningHub = {
    openDetailView,
    closeDetailView,
    contactSeller,
    sharePart,
    ladeAngebote,
    clearSearchAndReload
};