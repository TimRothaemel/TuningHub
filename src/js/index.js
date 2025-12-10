console.log('[TuningHub] index.js Modul geladen');

// Import nur Funktionen, NICHT die Supabase Clients
import { 
  loadParts, 
  openDetailView, 
  closeDetailView, 
  log,
  showError,
  extractData,
  truncateDescription, 
  contactSeller, 
  sharePart, 
  showImage, 
  nextImage, 
  prevImage, 
  updateImageIndicators 
} from "./loadParts.js";

// Globale Variablen für Supabase (werden dynamisch gefüllt)
let supabase = null;
let trackingSupabase = null;

// Warte auf Supabase
async function waitForSupabase() {
    return new Promise((resolve) => {
        if (window.supabase && typeof window.supabase.from === 'function') {
            console.log('[index.js] ✅ Supabase bereits verfügbar');
            resolve({
                supabase: window.supabase,
                trackingSupabase: window.trackingSupabase
            });
            return;
        }

        console.log('[index.js] ⏳ Warte auf supabaseReady Event...');
        
        window.addEventListener('supabaseReady', (event) => {
            console.log('[index.js] ✅ supabaseReady Event empfangen');
            resolve(event.detail);
        }, { once: true });
        
        // Timeout Fallback
        setTimeout(() => {
            if (window.supabase) {
                console.log('[index.js] ⚠️ Timeout, aber window.supabase gefunden');
                resolve({
                    supabase: window.supabase,
                    trackingSupabase: window.trackingSupabase
                });
            } else {
                console.error('[index.js] ❌ Supabase konnte nicht geladen werden');
                resolve({ supabase: null, trackingSupabase: null });
            }
        }, 10000);
    });
}

// Make functions available globally for HTML onclick handlers
window.openDetailView = openDetailView;
window.closeDetailView = closeDetailView;
window.contactSeller = contactSeller;
window.sharePart = sharePart;

// Hauptinitialisierung
document.addEventListener("DOMContentLoaded", async () => {
    console.log("[TuningHub] Init Startseite...");

    try {
        // Warte auf Supabase
        const clients = await waitForSupabase();
        supabase = clients.supabase;
        trackingSupabase = clients.trackingSupabase;

        if (!supabase) {
            console.error('[TuningHub] ❌ Supabase nicht verfügbar');
            showError('Verbindung zur Datenbank fehlgeschlagen');
            return;
        }

        console.log('[TuningHub] ✅ Supabase Clients verfügbar');

        // Initialisiere alle Features
        await ladeAngebote();
        setAccountLink();
        setupSearch();
        setupDetailView();
        setupMoreLinkWithPosition();
        handleSharedPartLink();
        trackPageview();

    } catch (error) {
        console.error('[TuningHub] Init Fehler:', error);
        showError('Fehler beim Laden der Seite: ' + error.message);
    }
});

async function ladeAngebote() {
    try {
        await loadParts();
    } catch (error) {
        log("Fehler beim Laden der Angebote:", error);
        showError("Fehler beim Laden der Angebote: " + error.message);
    }
}

async function setAccountLink() {
    if (!supabase || !supabase.auth) {
        console.warn('[TuningHub] Auth nicht verfügbar für Account-Link');
        return;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.warn('[TuningHub] Auth Fehler:', error);
            return;
        }

        const accountLink = document.getElementById("account-link");
        if (accountLink) {
            accountLink.href = user ? "/src/pages/profil.html" : "/src/pages/login.html";
            accountLink.textContent = user ? "Mein Konto" : "Anmelden";
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
    const closeButton = document.getElementById("close-detail");
    const modal = document.getElementById("detail-modal");
    
    if (closeButton) {
        closeButton.addEventListener("click", closeDetailView);
    }

    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === this) {
                closeDetailView();
            }
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeDetailView();
        }
    });

    log("Detailansicht Event-Listener eingerichtet");
}

function setupMoreLinkWithPosition() {
    const mehrLink = document.getElementById('mehr-link');
    if (mehrLink) {
        mehrLink.addEventListener('click', () => {
            const allParts = document.querySelectorAll('#angebot-container .card');
            if (allParts.length > 0) {
                const lastPart = allParts[allParts.length - 1];
                const partId = lastPart.getAttribute('data-id');
                if (partId) {
                    mehrLink.href = `/src/pages/teileübersicht.html#teil-${partId}`;
                }
            }
        });
        log("More link setup completed");
    }
}

async function handleSharedPartLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const partId = urlParams.get("part");

    if (!partId) return;

    log("Shared part ID detected:", partId);

    if (typeof window.teileSharing !== 'undefined') {
        window.teileSharing.initSharedPart();
    }

    setTimeout(async () => {
        if (!supabase) {
            console.error('[TuningHub] Supabase nicht verfügbar für Shared Part');
            alert("Das geteilte Teil konnte nicht geladen werden.");
            return;
        }

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
                
                if (typeof window.teileSharing !== 'undefined') {
                    window.teileSharing.updateMetaTags(part);
                }
                
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

async function trackPageview() {
    if (!trackingSupabase || typeof trackingSupabase.from !== 'function') {
        console.warn("[TuningHub] Tracking-Supabase Client nicht verfügbar");
        return;
    }

    try {
        let userId = null;

        // Versuche User ID zu holen
        if (supabase && supabase.auth) {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    userId = session.user.id;
                }
            } catch (authError) {
                console.warn("[TuningHub] Auth nicht verfügbar:", authError.message);
            }
        }

        const trackingData = {
            event_type: "pageview",
            user_id: userId,
            metadata: {
                path: window.location.pathname || "/",
                referrer: document.referrer || "",
                userAgent: navigator.userAgent || "",
                screen: `${window.screen.width}x${window.screen.height}`,
                timestamp: new Date().toISOString(),
            },
        };

        console.log("[TuningHub] Sende Tracking-Daten:", trackingData);

        const { data, error } = await trackingSupabase
            .from("tracking_events")
            .insert([trackingData]);

        if (error) {
            throw error;
        }

        console.log(
            `[TuningHub] Pageview erfolgreich getrackt${userId ? " (authentifiziert)" : " (anonym)"}`,
            data
        );
    } catch (error) {
        console.error(`[TuningHub] Tracking-Fehler: ${error.message}`, error);

        // Fallback: Speichere in localStorage
        try {
            const fallbackData = {
                path: window.location.pathname,
                timestamp: new Date().toISOString(),
                error: error.message,
                userAgent: navigator.userAgent,
            };

            localStorage.setItem(
                "tuning_hub_pageview",
                JSON.stringify(fallbackData)
            );
            console.log("[TuningHub] Fallback-Tracking in localStorage gespeichert");
        } catch (localStorageError) {
            console.error(
                "[TuningHub] Auch Fallback-Tracking fehlgeschlagen:",
                localStorageError
            );
        }
    }
}

// Globaler Error Handler
window.addEventListener("error", function (e) {
    log("Globaler Fehler:", e.error);
});