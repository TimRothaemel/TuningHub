import { 
  supabase, 
  trackingSupabase 
} from "./supabaseClient.js";

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

// Make functions available globally for HTML onclick handlers
window.openDetailView = openDetailView;
window.closeDetailView = closeDetailView;
window.contactSeller = contactSeller;
window.sharePart = sharePart;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[TuningHub] Init Startseite...");

  await ladeAngebote();
  trackPageview();
  setAccountLink();
  setupSearch();
  setupDetailView();
  setupMoreLinkWithPosition();
  handleSharedPartLink();
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
  if (!supabase) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const accountLink = document.getElementById("account-link");
    if (accountLink) {
      accountLink.href = user ? "/src/pages/account.html" : "/src/pages/login.html";
      log(
        "Account-Link gesetzt:",
        user ? "Eingeloggt" : "Nicht eingeloggt"
      );
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
  log("More link setup completed");
}

function handleSharedPartLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const partId = urlParams.get("part");

  if (partId) {
    log("Shared part ID detected:", partId);

    if (typeof window.teileSharing !== 'undefined') {
      window.teileSharing.initSharedPart();
    }

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
}

async function trackPageview() {
  if (!trackingSupabase) {
    console.warn("[TuningHub] Tracking-Supabase Client nicht verfügbar");
    return;
  }

  try {
    let userId = null;

    try {
      if (supabase) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          userId = session.user.id;
        }
      }
    } catch (authError) {
      console.warn(
        "[TuningHub] Auth nicht verfügbar:",
        authError.message
      );
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
      `[TuningHub] Pageview erfolgreich getrackt${
        userId ? " (authentifiziert)" : " (anonym)"
      }`,
      data
    );
  } catch (error) {
    console.error(`[TuningHub] Tracking-Fehler: ${error.message}`, error);

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
      console.log(
        "[TuningHub] Fallback-Tracking in localStorage gespeichert"
      );
    } catch (localStorageError) {
      console.error(
        "[TuningHub] Auch Fallback-Tracking fehlgeschlagen:",
        localStorageError
      );
    }
  }
}

window.addEventListener("error", function (e) {
  log("Globaler Fehler:", e.error);
});