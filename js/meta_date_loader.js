/**
 * TuningHub - Sofortige Meta-Tags Aktualisierung
 * Muss VOR allen anderen Scripts geladen werden!
 */

(function() {
    'use strict';
    
    console.log('[TuningHub Meta] Meta-Tags Script gestartet');
    
    const urlParams = new URLSearchParams(window.location.search);
    const partId = urlParams.get('part');
    
    if (!partId) {
        console.log('[TuningHub Meta] Keine Teil-ID gefunden, verwende Standard Meta-Tags');
        return;
    }
    
    console.log('[TuningHub Meta] Lade Teil-Daten für Meta-Tags:', partId);
    
    // Basis Supabase Setup für Meta-Tags
    const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";
    
    // Warte auf Supabase und aktualisiere dann Meta-Tags
    function waitForSupabaseAndUpdateMeta() {
        if (typeof window === 'undefined' || !window.supabase) {
            // Warte max. 5 Sekunden auf Supabase
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (window.supabase || (Date.now() - startTime > 5000)) {
                    clearInterval(checkInterval);
                    if (window.supabase) {
                        updateMetaTags();
                    } else {
                        console.warn('[TuningHub Meta] Supabase nicht verfügbar nach 5 Sekunden');
                    }
                }
            }, 50);
        } else {
            updateMetaTags();
        }
    }
    
    function updateMetaTags() {
        try {
            const tempSupabase = window.supabase.createClient(supabaseUrl, supabaseKey);
            
            tempSupabase
                .from('parts')
                .select('*')
                .eq('id', partId)
                .single()
                .then(({ data: part, error }) => {
                    if (error || !part) {
                        console.log('[TuningHub Meta] Teil nicht gefunden:', partId);
                        return;
                    }
                    
                    console.log('[TuningHub Meta] Teil-Daten geladen:', part);
                    
                    // Extrahiere und normalisiere Daten
                    const partData = extractPartData(part);
                    
                    // Page Title sofort setzen
                    document.title = `${partData.name} - ${partData.preis} | TuningHub`;
                    
                    // Meta-Tags aktualisieren
                    setMetaTag('og:title', `${partData.name} - ${partData.preis}`);
                    setMetaTag('og:description', partData.description);
                    setMetaTag('og:image', partData.imageUrl);
                    setMetaTag('og:url', window.location.href);
                    setMetaTag('og:type', 'product');
                    setMetaTag('og:site_name', 'TuningHub');
                    
                    // Twitter Cards
                    setMetaTag('twitter:card', 'summary_large_image');
                    setMetaTag('twitter:title', `${partData.name} - ${partData.preis}`);
                    setMetaTag('twitter:description', partData.description);
                    setMetaTag('twitter:image', partData.imageUrl);
                    
                    // WhatsApp optimierte Tags
                    setMetaTag('og:image:width', '1200');
                    setMetaTag('og:image:height', '630');
                    setMetaTag('og:image:alt', `${partData.name} bei TuningHub`);
                    
                    // Produkt-spezifische Meta-Tags
                    setMetaTag('product:price:amount', partData.priceNumber);
                    setMetaTag('product:price:currency', 'EUR');
                    setMetaTag('product:category', partData.kategorie);
                    setMetaTag('product:condition', partData.zustand === 'Neu' ? 'new' : 'used');
                    
                    // Standard Description Meta-Tag
                    setMetaTag('description', partData.description);
                    
                    console.log('[TuningHub Meta] Meta-Tags erfolgreich aktualisiert für:', partData.name);
                })
                .catch(error => {
                    console.error('[TuningHub Meta] Fehler beim Laden der Teil-Daten:', error);
                });
        } catch (error) {
            console.error('[TuningHub Meta] Fehler beim Erstellen des Supabase Clients:', error);
        }
    }
    
    function extractPartData(teil) {
        const name = teil.name || teil.title || teil.bezeichnung || 'Tuning-Teil';
        let preis = teil.preis || teil.price || teil.kosten || 'Preis auf Anfrage';
        const beschreibung = teil.beschreibung || teil.description || '';
        const bild = teil.bild_url || teil.image_url || teil.foto || '';
        const kategorie = teil.kategorie || teil.category || 'Tuning-Teil';
        const zustand = teil.zustand || teil.condition || 'Gebraucht';
        const verkäufer = teil.seller_name || teil.user_name || 'TuningHub';
        
        // Preis formatieren
        let priceNumber = '';
        if (typeof preis === 'number') {
            priceNumber = preis.toString();
            preis = `${preis.toLocaleString('de-DE')}€`;
        } else if (typeof preis === 'string' && !isNaN(parseFloat(preis))) {
            priceNumber = parseFloat(preis).toString();
            preis = `${parseFloat(preis).toLocaleString('de-DE')}€`;
        }
        
        // Beschreibung für Preview optimieren
        let description = beschreibung || `${kategorie} von ${verkäufer}`;
        if (description.length > 160) {
            description = description.substr(0, 160).trim() + '...';
        }
        
        // Bild URL vorbereiten
        let imageUrl;
        if (bild) {
            imageUrl = bild.startsWith('http') ? bild : `${window.location.origin}${bild}`;
        } else {
            imageUrl = `${window.location.origin}/img/THub-Logo-ohne-Hintergrund-500x200.png`;
        }
        
        return {
            name,
            preis,
            priceNumber,
            description,
            imageUrl,
            kategorie,
            zustand,
            verkäufer
        };
    }
    
    function setMetaTag(property, content) {
        if (!content) return;
        
        const isNameProperty = property.startsWith('twitter:') || 
                              property === 'description' || 
                              property === 'keywords';
        
        const selector = isNameProperty ? 
            `meta[name="${property}"]` : 
            `meta[property="${property}"]`;
        
        let meta = document.querySelector(selector);
        
        if (meta) {
            meta.setAttribute('content', content);
            console.log(`[TuningHub Meta] Updated: ${property} = ${content}`);
        } else {
            meta = document.createElement('meta');
            if (isNameProperty) {
                meta.setAttribute('name', property);
            } else {
                meta.setAttribute('property', property);
            }
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
            console.log(`[TuningHub Meta] Created: ${property} = ${content}`);
        }
    }
    
    // Starte den Prozess
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForSupabaseAndUpdateMeta);
    } else {
        waitForSupabaseAndUpdateMeta();
    }
    console.log('[TuningHub Meta] Meta-Tags Script initialisiert');
})();