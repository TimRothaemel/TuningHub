// TuningHub Universal Search System
// Funktioniert auf allen Seiten und leitet zur Teileübersicht weiter

(function() {
    'use strict';
    
    // Namespace für Such-System
    window.TuningHubSearch = window.TuningHubSearch || {};

    // Lokale Variablen
    let searchFuse;
    let searchParts = [];
    let searchLoading = false;
    let searchSupabase;

    // Supabase-Konfiguration
    const SEARCH_CONFIG = {
        supabaseUrl: "https://yvdptnkmgfxkrszitweo.supabase.co",
        supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo"
    };

    // Debug-Logging
    function searchLog(message, data = null) {
        console.log(`[TuningHub-Search] ${message}`, data || "");
    }

    // Supabase-Client für Suche initialisieren
    function initSearchSupabase() {
        try {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                searchSupabase = window.supabase.createClient(SEARCH_CONFIG.supabaseUrl, SEARCH_CONFIG.supabaseKey);
                searchLog("Search-Supabase Client erstellt");
                return true;
            } else {
                throw new Error("Globaler Supabase Client nicht verfügbar");
            }
        } catch (error) {
            searchLog("Fehler beim Erstellen des Search-Supabase Clients:", error);
            return false;
        }
    }

    // Fuse.js für Suche initialisieren
    function initSearchFuse() {
        try {
            if (typeof Fuse !== 'undefined') {
                const fuseOptions = {
                    keys: [
                        { name: 'name', weight: 0.4 },
                        { name: 'title', weight: 0.4 },
                        { name: 'description', weight: 0.3 },
                        { name: 'searchText', weight: 0.2 },
                        { name: 'condition', weight: 0.1 },
                        { name: 'type', weight: 0.1 }
                    ],
                    threshold: 0.4,
                    ignoreLocation: true,
                    minMatchCharLength: 2,
                    includeScore: true,
                    includeMatches: true,
                    useExtendedSearch: true,
                    findAllMatches: true
                };

                searchFuse = new Fuse(searchParts, fuseOptions);
                searchLog("Fuse.js Suchindex initialisiert");
                return true;
            } else {
                searchLog("Fuse.js nicht verfügbar - verwende einfache Textsuche");
                return false;
            }
        } catch (error) {
            searchLog("Fehler beim Initialisieren von Fuse.js:", error);
            return false;
        }
    }

    // Teile aus Datenbank laden
    async function loadSearchParts() {
        if (searchLoading) {
            searchLog("Bereits am Laden...");
            return searchParts;
        }

        searchLoading = true;
        searchLog("Lade Teile für Suche...");

        try {
            // Falls kein globaler Supabase Client verfügbar, versuche eigenen
            if (!searchSupabase) {
                initSearchSupabase();
            }

            if (!searchSupabase) {
                throw new Error("Kein Supabase Client verfügbar");
            }

            const { data, error } = await searchSupabase
                .from('parts')
                .select(`
                    id,
                    title,
                    description,
                    price,
                    condition,
                    contact_number,
                    type,
                    image_url,
                    image_url2,
                    image_url3,
                    image_url4,
                    image_url5,
                    created_at
                `)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            searchParts = normalizePartsData(data);
            initSearchFuse();
            searchLog(`${searchParts.length} Teile für Suche geladen`);
            return searchParts;

        } catch (error) {
            searchLog("Fehler beim Laden der Suchteile:", error);
            searchParts = createSearchFallbackData();
            initSearchFuse();
            return searchParts;
        } finally {
            searchLoading = false;
        }
    }

    // Daten normalisieren
    function normalizePartsData(data) {
        return data.map(part => {
            const images = [
                part.image_url,
                part.image_url2,
                part.image_url3,
                part.image_url4,
                part.image_url5
            ].filter(url => url && url.trim() !== '');

            return {
                id: part.id,
                name: part.title || part.name || 'Unbenanntes Teil',
                title: part.title || part.name || 'Unbenanntes Teil',
                description: part.description || part.beschreibung || '',
                price: part.price || part.preis || 0,
                condition: part.condition || part.zustand || 'Unbekannt',
                contact_number: part.contact_number || part.telefon || '',
                type: part.type || part.typ || 'angebot',
                image_url: part.image_url || part.bild_url || null,
                images: images,
                created_at: part.created_at || part.datum,
                searchText: `${part.title || part.name || ''} ${part.description || part.beschreibung || ''}`.toLowerCase()
            };
        });
    }

    // Fallback-Daten
    function createSearchFallbackData() {
        return [
            {
                id: "search-fallback-1",
                name: "Simson S51 Auspuff",
                title: "Simson S51 Auspuff",
                description: "Sportauspuff für Simson S51, neuwertig",
                price: 89.99,
                condition: "Sehr gut",
                type: "angebot",
                contact_number: "+49 123 456789",
                image_url: "https://via.placeholder.com/300x200/e9ecef/666?text=Auspuff",
                images: ["https://via.placeholder.com/300x200/e9ecef/666?text=Auspuff"],
                searchText: "simson s51 auspuff sportauspuff"
            }
        ];
    }

    // Suchfunktion
    function executeSearch(query) {
        if (!query || !query.trim()) {
            searchLog("Leere Suche");
            return [];
        }

        const trimmedQuery = query.trim();
        searchLog(`Suche nach: "${trimmedQuery}"`);

        // Fallback auf einfache Textsuche wenn Fuse nicht verfügbar
        if (!searchFuse) {
            searchLog("Fuse nicht verfügbar - verwende einfache Textsuche");
            return searchParts.filter(part => 
                part.searchText.includes(trimmedQuery.toLowerCase()) ||
                part.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
                (part.description && part.description.toLowerCase().includes(trimmedQuery.toLowerCase()))
            );
        }

        try {
            // Erweiterte Fuse.js Suche
            const exactResults = searchFuse.search(`="${trimmedQuery}"`);
            const fuzzyResults = searchFuse.search(trimmedQuery);
            
            const words = trimmedQuery.toLowerCase().split(/\s+/);
            const wordResults = words.length > 1 ? searchFuse.search(words.join(' | ')) : [];

            const allResults = [...exactResults, ...fuzzyResults, ...wordResults];
            
            // Duplikate entfernen
            const uniqueResults = allResults.reduce((acc, current) => {
                const existing = acc.find(item => item.item.id === current.item.id);
                if (!existing || current.score < existing.score) {
                    acc = acc.filter(item => item.item.id !== current.item.id);
                    acc.push(current);
                }
                return acc;
            }, []);

            uniqueResults.sort((a, b) => a.score - b.score);
            const results = uniqueResults.map(result => result.item);

            searchLog(`Suchergebnisse: ${results.length} gefunden`);
            return results;

        } catch (error) {
            searchLog("Fehler bei der Suche:", error);
            return [];
        }
    }

    // Universelle Such-Karte erstellen (identisch zu index.html createCard)
    function createUnifiedCard(teil) {
        const name = teil.name || teil.title || 'Unbekanntes Teil';
        const preis = teil.price || teil.preis || 'Preis auf Anfrage';
        const beschreibung = teil.description || teil.beschreibung || '';
        const bild = teil.image_url || teil.bild_url || null;
        const typ = teil.type || teil.typ || '';

        const card = document.createElement("div");
        const isSearch = typ === "teilesuche";
        card.className = isSearch ? "card search-card" : "card";

        if (teil.id) {
            card.dataset.partId = teil.id;
        }

        const imageUrl = bild || "/img/no-image.png";
        const fallbackUrl = "/img/search.png";

        let preisText = preis;
        if (typeof preis === "number") {
            preisText = `${preis.toLocaleString("de-DE")}€`;
        } else if (typeof preis === "string" && !isNaN(parseFloat(preis))) {
            preisText = `${parseFloat(preis).toLocaleString("de-DE")}€`;
        }

        // Beschreibung kürzen
        function truncateDescription(text, maxLength = 120) {
            if (!text) return "";
            if (text.length <= maxLength) return text;
            return text.substr(0, maxLength).trim() + "...";
        }

        const kurzbeschreibung = truncateDescription(beschreibung, 120);

        // Identische HTML-Struktur wie in index.html
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
            // Prüfe ob openDetailView verfügbar ist (auf teileübersicht.html)
            if (typeof openDetailView === 'function') {
                openDetailView(teil);
            } else {
                // Fallback: Alert mit Grundinformationen
                alert(`${name}\n\nPreis: ${preisText}\nZustand: ${teil.condition}\n\n${beschreibung || 'Keine Beschreibung verfügbar'}`);
            }
        });

        return card;
    }

    // Suchergebnisse rendern (nur auf teileübersicht.html)
    function renderSearchResults(results, container) {
        if (!container) {
            searchLog("Container nicht gefunden");
            return;
        }

        container.classList.remove('loading');

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="search-empty" style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                    <h3>Keine Ergebnisse gefunden</h3>
                    <p>Versuche andere Suchbegriffe oder durchstöbere alle verfügbaren Teile.</p>
                    <button onclick="TuningHubSearch.clearSearch()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                        Suche zurücksetzen
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        results.forEach((part, index) => {
            try {
                const card = createUnifiedCard(part);
                container.appendChild(card);
            } catch (error) {
                searchLog(`Fehler beim Erstellen der Karte ${index}:`, error);
            }
        });

        searchLog(`${results.length} Suchergebnisse gerendert`);
    }

    // Suchparameter in URL speichern
    function saveSearchToURL(query) {
        const url = new URL(window.location);
        if (query && query.trim()) {
            url.searchParams.set('search', query.trim());
        } else {
            url.searchParams.delete('search');
        }
        window.history.pushState({}, '', url);
    }

    // Suchparameter aus URL laden
    function loadSearchFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('search') || '';
    }

    // Suche ausführen und zur Teileübersicht weiterleiten
    async function performSearch(query) {
        if (!query || !query.trim()) {
            searchLog("Leere Suche abgebrochen");
            return;
        }

        const trimmedQuery = query.trim();
        searchLog(`Führe Suche aus: "${trimmedQuery}"`);

        // Lade Daten falls noch nicht verfügbar
        if (searchParts.length === 0) {
            await loadSearchParts();
        }

        // Prüfe ob wir bereits auf der Teileübersicht sind
        const currentPage = window.location.pathname;
        const isOnOverviewPage = currentPage.includes('teileübersicht.html') || currentPage.includes('teileubersicht.html');

        if (isOnOverviewPage) {
            // Bereits auf der Übersichtsseite - direkt suchen
            const results = executeSearch(trimmedQuery);
            const container = document.getElementById('angebot-container');
            
            if (container) {
                renderSearchResults(results, container);
                saveSearchToURL(trimmedQuery);
                
                // Scroll zum Anfang der Ergebnisse
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // Auf anderer Seite - zur Teileübersicht weiterleiten
            const targetUrl = '/html/teileübersicht.html';
            const url = new URL(targetUrl, window.location.origin);
            url.searchParams.set('search', trimmedQuery);
            
            searchLog(`Leite zur Teileübersicht weiter: ${url.toString()}`);
            window.location.href = url.toString();
        }
    }

    // Such-Interface auf aktueller Seite initialisieren
    function initSearchInterface() {
        searchLog("Initialisiere universelles Such-Interface...");

        // Such-Input finden
        const searchInput = document.getElementById('searchbar') || 
                           document.getElementById('search-input') || 
                           document.querySelector('.searchbar') ||
                           document.querySelector('input[placeholder*="Suche"]');

        if (!searchInput) {
            searchLog("Such-Input nicht gefunden");
            return false;
        }

        // Such-Button (Lupe) finden
        const searchButton = searchInput.parentNode?.querySelector('img[src*="search"]') ||
                            document.querySelector('.search-button') ||
                            document.querySelector('[onclick*="search"]');

        searchLog("Such-Input gefunden:", searchInput.id || searchInput.className);
        if (searchButton) {
            searchLog("Such-Button gefunden");
        }

        // Bestehende Event-Listener entfernen
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        // Enter-Taste Handler
        newSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = newSearchInput.value.trim();
                if (query) {
                    performSearch(query);
                }
            }
        });

        // Such-Button Handler
        if (searchButton) {
            // Bestehende Event-Listener entfernen
            const newSearchButton = searchButton.cloneNode(true);
            searchButton.parentNode.replaceChild(newSearchButton, searchButton);

            newSearchButton.addEventListener('click', function(e) {
                e.preventDefault();
                const query = newSearchInput.value.trim();
                if (query) {
                    performSearch(query);
                }
            });

            // Cursor pointer für Button
            newSearchButton.style.cursor = 'pointer';
        }

        // Wenn wir auf der Teileübersicht sind, lade eventuell gespeicherte Suche
        const currentPage = window.location.pathname;
        const isOnOverviewPage = currentPage.includes('teileübersicht.html') || currentPage.includes('teileubersicht.html');
        
        if (isOnOverviewPage) {
            const savedSearch = loadSearchFromURL();
            if (savedSearch) {
                newSearchInput.value = savedSearch;
                searchLog(`Gespeicherte Suche geladen: "${savedSearch}"`);
                
                // Führe Suche automatisch aus
                setTimeout(() => {
                    performSearch(savedSearch);
                }, 500);
            }
        }

        searchLog("Universelles Such-Interface initialisiert");
        return true;
    }

    // Hauptinitialisierung
    async function initializeUniversalSearch() {
        searchLog("Starte universelles Such-System...");

        try {
            // Lade Daten im Hintergrund
            loadSearchParts();
            
            // Interface initialisieren
            const interfaceReady = initSearchInterface();
            
            if (interfaceReady) {
                searchLog("Universelles Such-System erfolgreich initialisiert");
            } else {
                searchLog("Such-Interface konnte nicht initialisiert werden");
            }
            
        } catch (error) {
            searchLog("Fehler beim Initialisieren:", error);
        }
    }

    // Globale API
    window.TuningHubSearch.clearSearch = function() {
        const searchInput = document.getElementById('searchbar') || 
                           document.getElementById('search-input') || 
                           document.querySelector('.searchbar');
        
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        // URL Parameter entfernen
        saveSearchToURL('');

        // Wenn auf Teileübersicht, alle Teile anzeigen
        const currentPage = window.location.pathname;
        const isOnOverviewPage = currentPage.includes('teileübersicht.html') || currentPage.includes('teileubersicht.html');
        
        if (isOnOverviewPage && typeof ladeAngebote === 'function') {
            ladeAngebote(); // Lade alle Teile neu
        }
    };

    window.TuningHubSearch.search = performSearch;
    window.TuningHubSearch.executeSearch = executeSearch;
    window.TuningHubSearch.getParts = () => searchParts;
    window.TuningHubSearch.init = initializeUniversalSearch;

    // Auto-Initialisierung
    function startUniversalSearch() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUniversalSearch);
        } else {
            setTimeout(initializeUniversalSearch, 100);
        }
    }

    // Starte das Such-System
    startUniversalSearch();

    searchLog("TuningHub Universal Search System geladen");

})();