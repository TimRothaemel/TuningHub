// TuningHub Search System - Ohne Namenskonflikte
// Kompatibel mit bestehenden HTML-Variablen

// Namespace für Search-System
window.TuningHubSearch = window.TuningHubSearch || {};

(function() {
    'use strict';
    
    // Lokale Variablen (kein Konflikt mit globalen Variablen)
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
            // Versuche globalen Supabase-Client zu verwenden
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
            // Prüfe ob bereits geladene Daten vorhanden sind
            if (window.allParts && Array.isArray(window.allParts) && window.allParts.length > 0) {
                searchLog("Verwende bereits geladene Daten aus globalem allParts");
                searchParts = normalizePartsData(window.allParts);
                initSearchFuse();
                return searchParts;
            }

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
            },
            {
                id: "search-fallback-2", 
                name: "Suche: S51 Tank",
                title: "Suche: S51 Tank",
                description: "Suche original Tank für Simson S51 in gutem Zustand",
                price: 0,
                condition: "Gesucht",
                type: "teilesuche",
                contact_number: "+49 987 654321",
                image_url: "https://via.placeholder.com/300x200/ff6b35/fff?text=SUCHE",
                images: ["https://via.placeholder.com/300x200/ff6b35/fff?text=SUCHE"],
                searchText: "suche s51 tank simson"
            }
        ];
    }

    // Suchfunktion
    function executeSearch(query) {
        if (!query || !query.trim()) {
            searchLog("Leere Suche - zeige alle Teile");
            return searchParts;
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

    // Suchergebnisse rendern
    function renderResults(results, container) {
        if (!container) {
            searchLog("Container nicht gefunden");
            return;
        }

        container.classList.remove('loading');

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="search-empty" style="text-align: center; padding: 40px; color: #666;">
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
                const card = createResultCard(part, index);
                container.appendChild(card);
            } catch (error) {
                searchLog(`Fehler beim Erstellen der Karte ${index}:`, error);
            }
        });

        searchLog(`${results.length} Suchergebnisse gerendert`);
    }

    // Result-Karte erstellen
    function createResultCard(part, index = 0) {
        const card = document.createElement('div');
        const isSearch = part.type === 'teilesuche';
        
        card.className = `card ${isSearch ? 'search-card' : ''}`;
        card.dataset.partId = part.id;
        card.dataset.searchIndex = index;

        // Preis formatieren
        let priceText = 'Preis auf Anfrage';
        if (part.price && part.price > 0) {
            try {
                priceText = new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR'
                }).format(part.price);
            } catch (e) {
                priceText = part.price + ' €';
            }
        } else if (isSearch) {
            priceText = 'Gesuch';
        }

        // Beschreibung kürzen
        const shortDescription = truncateSearchText(part.description, 120);

        // Bild-URL bestimmen
        const imageUrl = part.image_url || 
                        (part.images && part.images[0]) || 
                        'https://via.placeholder.com/300x200/f8f9fa/adb5bd?text=Kein+Bild';

        const fallbackImage = isSearch ? 
                             'https://via.placeholder.com/300x200/ff6b35/fff?text=SUCHE' : 
                             'https://via.placeholder.com/300x200/f8f9fa/adb5bd?text=Bild+nicht+verfügbar';

        card.innerHTML = `
            ${isSearch ? '<div class="search-badge" style="position: absolute; top: 10px; left: 10px; background: #ff6b35; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; z-index: 10;">🔍 SUCHE</div>' : ''}
            
            <div class="card-image-container" style="position: relative;">
                <img src="${imageUrl}" 
                     alt="${part.name || part.title}"
                     onerror="this.src='${fallbackImage}'"
                     loading="lazy"
                     style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0;" />
                ${part.images && part.images.length > 1 ? 
                    `<div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 8px; border-radius: 10px; font-size: 12px;">${part.images.length} Bilder</div>` : ''
                }
            </div>
            
            <div class="card-content" style="padding: 15px;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #333;">${part.name || part.title}</h3>
                
                ${shortDescription ? 
                    `<p style="color: #666; font-size: 0.9rem; line-height: 1.4; margin: 0 0 15px 0;">${shortDescription}</p>` : ''
                }
                
                <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: bold; color: #2c3e50; font-size: 1.1rem;">${priceText}</div>
                    <div style="color: #666; font-size: 0.9rem;">${part.condition}</div>
                </div>
            </div>
        `;

        // Click-Handler
        card.addEventListener('click', () => {
            openSearchPartDetail(part);
        });

        // Hover-Effekte
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        });

        return card;
    }

    // Hilfsfunktionen
    function truncateSearchText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength).trim() + '...';
    }

    function formatSearchPrice(price) {
        if (!price || price === 0) return 'Preis auf Anfrage';
        try {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }).format(price);
        } catch (e) {
            return price + ' €';
        }
    }

    // Detailansicht öffnen
    function openSearchPartDetail(part) {
        searchLog("Öffne Detailansicht für:", part.name);
        
        // Prüfe verschiedene mögliche globale Funktionen
        if (typeof window.openDetailView === 'function') {
            window.openDetailView(part);
        } else if (typeof openDetailView === 'function') {
            openDetailView(part);
        } else {
            // Fallback: Alert mit Grundinformationen
            const message = `${part.name || part.title}\n\nPreis: ${formatSearchPrice(part.price)}\nZustand: ${part.condition}\n\n${part.description || 'Keine Beschreibung verfügbar'}`;
            alert(message);
        }
    }

    // Such-Interface initialisieren
    function initSearchInterface() {
        searchLog("Initialisiere Such-Interface...");

        // Such-Input finden (mehrere mögliche Selektoren)
        const searchInput = document.getElementById('searchbar') || 
                           document.getElementById('search-input') || 
                           document.querySelector('.searchbar') ||
                           document.querySelector('#searchbar') ||
                           document.querySelector('input[placeholder*="Suche"]');

        if (!searchInput) {
            searchLog("Such-Input nicht gefunden");
            return false;
        }

        searchLog("Such-Input gefunden:", searchInput.id || searchInput.className);

        // Container finden
        const resultsContainer = document.getElementById('angebot-container') || 
                               document.getElementById('results-container') ||
                               document.querySelector('.grid-container');

        if (!resultsContainer) {
            searchLog("Ergebnis-Container nicht gefunden");
            return false;
        }

        searchLog("Container gefunden:", resultsContainer.id || resultsContainer.className);

        // Suchlogik mit Debouncing
        let searchTimeout;
        
        const performDelayedSearch = (query) => {
            clearTimeout(searchTimeout);
            
            if (!query.trim()) {
                renderResults(searchParts, resultsContainer);
                return;
            }

            resultsContainer.classList.add('loading');
            
            searchTimeout = setTimeout(() => {
                try {
                    const results = executeSearch(query);
                    renderResults(results, resultsContainer);
                } catch (error) {
                    searchLog("Suchfehler:", error);
                    resultsContainer.classList.remove('loading');
                }
            }, 300);
        };

        // Event-Listener
        searchInput.addEventListener('input', (e) => {
            performDelayedSearch(e.target.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimeout);
                const results = executeSearch(e.target.value);
                renderResults(results, resultsContainer);
            }
        });

        searchLog("Such-Interface initialisiert");

        // Initial alle Teile anzeigen
        if (searchParts.length > 0) {
            renderResults(searchParts, resultsContainer);
        }

        return true;
    }

    // Hauptinitialisierung
    async function initializeTuningHubSearch() {
        searchLog("Starte Such-System...");

        try {
            // Daten laden
            await loadSearchParts();
            
            // Interface initialisieren
            const interfaceReady = initSearchInterface();
            
            if (interfaceReady) {
                searchLog("Such-System erfolgreich initialisiert");
            } else {
                searchLog("Such-Interface konnte nicht initialisiert werden");
            }
            
        } catch (error) {
            searchLog("Fehler beim Initialisieren:", error);
        }
    }

    // Globale API für das Such-System
    window.TuningHubSearch.clearSearch = function() {
        const searchInput = document.getElementById('searchbar') || 
                           document.getElementById('search-input') || 
                           document.querySelector('.searchbar');
        
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        const container = document.getElementById('angebot-container') || 
                         document.getElementById('results-container');
        
        if (container && searchParts.length > 0) {
            renderResults(searchParts, container);
        }
    };

    // Öffentliche API
    window.TuningHubSearch.search = executeSearch;
    window.TuningHubSearch.getParts = () => searchParts;
    window.TuningHubSearch.init = initializeTuningHubSearch;

    // Auto-Initialisierung
    function startTuningHubSearch() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeTuningHubSearch);
        } else {
            setTimeout(initializeTuningHubSearch, 500); // Etwas länger warten
        }
    }

    // Starte das Such-System
    startTuningHubSearch();

    searchLog("TuningHub Search System geladen");

})();