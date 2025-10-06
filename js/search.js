// TuningHub Universal Search System - KORRIGIERT
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

    // Debug-Logging
    function searchLog(message, data = null) {
        console.log(`[TuningHub-Search] ${message}`, data || "");
    }

    // Supabase-Client für Suche initialisieren
    function initSearchSupabase() {
        try {
            // Versuche den globalen supabase Client zu nutzen
            if (window.supabase) {
                searchSupabase = window.supabase;
                searchLog("Nutze globalen Supabase Client");
                return true;
            }
            
            // Fallback: Warte auf supabaseClient.js
            searchLog("Warte auf globalen Supabase Client...");
            return false;
        } catch (error) {
            searchLog("Fehler beim Zugriff auf Supabase Client:", error);
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
                        { name: 'description', weight: 0.2 },
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
            // Prüfe ob Supabase Client verfügbar ist
            if (!searchSupabase) {
                const initialized = initSearchSupabase();
                if (!initialized) {
                    // Warte kurz und versuche nochmal
                    await new Promise(resolve => setTimeout(resolve, 500));
                    initSearchSupabase();
                }
            }

            if (!searchSupabase) {
                searchLog("WARNUNG: Kein Supabase Client verfügbar - verwende leere Daten");
                searchParts = [];
                return searchParts;
            }

            searchLog("Starte Datenbank-Abfrage...");
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
                    created_at,
                    seller_contact_methods,
                    seller_social_media,
                    seller_phone,
                    user_id,
                    link
                `)
                .order('created_at', { ascending: false });

            if (error) {
                searchLog("Supabase Abfrage-Fehler:", error);
                throw error;
            }

            searchLog(`${data?.length || 0} Teile von Datenbank erhalten`);
            searchParts = normalizePartsData(data);
            initSearchFuse();
            searchLog(`${searchParts.length} Teile für Suche geladen`);
            return searchParts;

        } catch (error) {
            searchLog("Fehler beim Laden der Suchteile:", error);
            searchParts = [];
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
                searchText: `${part.title || part.name || ''} ${part.description || part.beschreibung || ''}`.toLowerCase(),
                seller_contact_methods: part.seller_contact_methods,
                seller_social_media: part.seller_social_media,
                seller_phone: part.seller_phone,
                user_id: part.user_id,
                seller_id: part.user_id,
                link: part.link
            };
        });
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

    // NEUE FUNKTION: Prüfe ob wir auf der Übersichtsseite sind
    function isOnOverviewPage() {
        const currentPage = window.location.pathname;
        return currentPage.includes('teileübersicht.html') || 
               currentPage.includes('teileubersicht.html') ||
               currentPage.endsWith('/');
    }

    // NEUE FUNKTION: Suche auf aktueller Seite durchführen
    async function performLocalSearch(query) {
        searchLog(`Führe lokale Suche aus: "${query}"`);
        
        // Lade Daten falls noch nicht verfügbar
        if (searchParts.length === 0) {
            await loadSearchParts();
        }

        const results = executeSearch(query);
        
        // Event auslösen für teileübersicht.html.js
        const event = new CustomEvent('tuninghub:search', {
            detail: {
                query: query,
                results: results
            }
        });
        window.dispatchEvent(event);
        
        saveSearchToURL(query);
        return results;
    }

    // Suche ausführen und zur Teileübersicht weiterleiten
    async function performSearch(query) {
        if (!query || !query.trim()) {
            searchLog("Leere Suche abgebrochen");
            return;
        }

        const trimmedQuery = query.trim();
        searchLog(`Führe Suche aus: "${trimmedQuery}"`);

        if (isOnOverviewPage()) {
            // Bereits auf der Übersichtsseite - lokale Suche
            await performLocalSearch(trimmedQuery);
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
            const newSearchButton = searchButton.cloneNode(true);
            searchButton.parentNode.replaceChild(newSearchButton, searchButton);

            newSearchButton.addEventListener('click', function(e) {
                e.preventDefault();
                const query = newSearchInput.value.trim();
                if (query) {
                    performSearch(query);
                }
            });

            newSearchButton.style.cursor = 'pointer';
        }

        // Wenn wir auf der Teileübersicht sind, URL-Parameter prüfen
        if (isOnOverviewPage()) {
            const savedSearch = loadSearchFromURL();
            if (savedSearch) {
                newSearchInput.value = savedSearch;
                searchLog(`Gespeicherte Suche in Input gesetzt: "${savedSearch}"`);
                
                // WICHTIG: Führe Suche erst aus wenn teileübersicht.html.js bereit ist
                window.addEventListener('tuninghub:ready', () => {
                    searchLog("Teileübersicht ist bereit, führe gespeicherte Suche aus");
                    performLocalSearch(savedSearch);
                }, { once: true });
            }
        }

        searchLog("Universelles Such-Interface initialisiert");
        return true;
    }

    // Hauptinitialisierung
    async function initializeUniversalSearch() {
        searchLog("Starte universelles Such-System...");

        try {
            // Warte kurz bis supabaseClient.js geladen ist
            let retries = 0;
            while (!window.supabase && retries < 10) {
                searchLog(`Warte auf Supabase Client (Versuch ${retries + 1}/10)...`);
                await new Promise(resolve => setTimeout(resolve, 200));
                retries++;
            }
            
            if (!window.supabase) {
                searchLog("WARNUNG: Supabase Client nicht verfügbar nach 10 Versuchen");
            } else {
                searchLog("Supabase Client gefunden!");
                initSearchSupabase();
            }
            
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

        // Event auslösen um Suche zu löschen
        const event = new CustomEvent('tuninghub:clearsearch');
        window.dispatchEvent(event);
    };

    window.TuningHubSearch.search = performSearch;
    window.TuningHubSearch.executeSearch = executeSearch;
    window.TuningHubSearch.getParts = () => searchParts;
    window.TuningHubSearch.init = initializeUniversalSearch;
    window.TuningHubSearch.performLocalSearch = performLocalSearch;

    // Auto-Initialisierung
    function startUniversalSearch() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeUniversalSearch);
        } else {
            // Warte kurz damit andere Skripte laden können
            setTimeout(initializeUniversalSearch, 300);
        }
    }

    // Starte das Such-System
    startUniversalSearch();

    searchLog("TuningHub Universal Search System geladen");

})();