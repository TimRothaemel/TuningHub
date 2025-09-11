/**
 * TuningHub - Teile-Sharing System mit Open Graph Meta-Tags
 * Erstellt Rich Link Previews für WhatsApp, Instagram, Facebook etc.
 */

class TeileSharing {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.baseUrl = window.location.origin;
    }

    /**
     * Aktualisiert die Meta-Tags dynamisch für bessere Link Previews
     */
    updateMetaTags(partData) {
        const { name, preis, beschreibung, bild, kategorie, verkäufer } = this.extractPartData(partData);
        
        // Preis formatieren
        let preisText = preis;
        if (typeof preis === 'number') {
            preisText = `${preis.toLocaleString('de-DE')}€`;
        } else if (typeof preis === 'string' && !isNaN(parseFloat(preis))) {
            preisText = `${parseFloat(preis).toLocaleString('de-DE')}€`;
        }

        // Beschreibung für Preview kürzen
        const shortDescription = this.truncateText(beschreibung || `${kategorie} von ${verkäufer}`, 160);
        
        // Bild URL vorbereiten
        const imageUrl = bild ? (bild.startsWith('http') ? bild : `${this.baseUrl}${bild}`) : `${this.baseUrl}/img/tuninghub-logo.png`;

        // Meta-Tags aktualisieren oder erstellen
        this.updateMetaTag('og:title', `${name} - ${preisText}`);
        this.updateMetaTag('og:description', shortDescription);
        this.updateMetaTag('og:image', imageUrl);
        this.updateMetaTag('og:url', window.location.href);
        this.updateMetaTag('og:type', 'product');
        this.updateMetaTag('og:site_name', 'TuningHub');
        
        // Twitter Cards
        this.updateMetaTag('twitter:card', 'summary_large_image');
        this.updateMetaTag('twitter:title', `${name} - ${preisText}`);
        this.updateMetaTag('twitter:description', shortDescription);
        this.updateMetaTag('twitter:image', imageUrl);
        
        // WhatsApp spezifische Tags
        this.updateMetaTag('og:image:width', '1200');
        this.updateMetaTag('og:image:height', '630');
        this.updateMetaTag('og:image:alt', `${name} bei TuningHub`);
        
        // Produkt-spezifische Meta-Tags
        this.updateMetaTag('product:price:amount', typeof preis === 'number' ? preis.toString() : '');
        this.updateMetaTag('product:price:currency', 'EUR');
        this.updateMetaTag('product:category', kategorie);
        this.updateMetaTag('product:condition', partData.zustand || 'used');

        // Page Title aktualisieren
        document.title = `${name} - ${preisText} | TuningHub`;
    }

    /**
     * Hilfsfunktion um Meta-Tags zu aktualisieren oder zu erstellen
     */
    updateMetaTag(property, content) {
        if (!content) return;

        // Prüfe ob property oder name Attribut verwendet werden soll
        const isNameProperty = property.startsWith('twitter:') || 
                              property === 'description' || 
                              property === 'keywords';
        
        const selector = isNameProperty ? 
            `meta[name="${property}"]` : 
            `meta[property="${property}"]`;
        
        let meta = document.querySelector(selector);
        
        if (meta) {
            meta.setAttribute('content', content);
        } else {
            meta = document.createElement('meta');
            if (isNameProperty) {
                meta.setAttribute('name', property);
            } else {
                meta.setAttribute('property', property);
            }
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
        }
    }

    /**
     * Erstellt eine optimierte Share-URL mit Teil-ID
     */
    createShareUrl(partId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?part=${encodeURIComponent(partId)}`;
    }

    /**
     * Hauptfunktion zum Teilen eines Teils
     */
    async sharePart(partId, partData = null) {
        try {
            // Wenn keine Daten übergeben wurden, lade sie
            if (!partData) {
                const { data: part, error } = await this.supabase
                    .from('parts')
                    .select('*')
                    .eq('id', partId)
                    .single();

                if (error || !part) {
                    throw new Error('Teil nicht gefunden');
                }
                partData = part;
            }

            // Meta-Tags für bessere Previews aktualisieren
            this.updateMetaTags(partData);
            
            // Share-URL erstellen
            const shareUrl = this.createShareUrl(partId);
            
            // Teil-Daten für Sharing vorbereiten
            const { name, preis, beschreibung } = this.extractPartData(partData);
            let preisText = typeof preis === 'number' ? `${preis.toLocaleString('de-DE')}€` : preis;
            
            const shareData = {
                title: `${name} bei TuningHub`,
                text: `Schau dir dieses ${partData.kategorie || 'Tuning-Teil'} an: ${name} für ${preisText}`,
                url: shareUrl
            };

            // Native Web Share API verwenden falls verfügbar
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    console.log('[TuningHub] Teil erfolgreich geteilt via Web Share API');
                    return;
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.warn('[TuningHub] Web Share API Fehler:', err);
                    }
                }
            }

            // Fallback: Link in Zwischenablage kopieren
            await this.copyToClipboard(shareUrl);
            this.showShareDialog(shareUrl, shareData);

        } catch (error) {
            console.error('[TuningHub] Sharing-Fehler:', error);
            alert('Fehler beim Teilen des Teils. Bitte versuche es später erneut.');
        }
    }

    /**
     * Link in Zwischenablage kopieren
     */
    async copyToClipboard(url) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                return true;
            }
        } catch (err) {
            console.warn('[TuningHub] Clipboard API nicht verfügbar:', err);
        }

        // Fallback für ältere Browser
        return this.fallbackCopyToClipboard(url);
    }

    /**
     * Fallback Methode zum Kopieren
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            document.body.removeChild(textArea);
            console.error('[TuningHub] Fallback copy failed:', err);
            return false;
        }
    }

    /**
     * Zeigt Share-Dialog mit verschiedenen Optionen
     */
    showShareDialog(url, shareData) {
        const dialog = document.createElement('div');
        dialog.className = 'share-dialog-overlay';
        dialog.innerHTML = `
            <div class="share-dialog-content">
                <div class="share-header">
                    <h3>Teil teilen</h3>
                    <button class="share-close">&times;</button>
                </div>
                <div class="share-preview">
                    <div class="share-preview-text">Link wurde in die Zwischenablage kopiert!</div>
                    <div class="share-url">${url}</div>
                </div>
                <div class="share-options">
                    <button class="share-option whatsapp" data-url="${encodeURIComponent(url)}" data-text="${encodeURIComponent(shareData.text)}">
                        <span class="share-icon">💬</span>
                        <span>WhatsApp</span>
                    </button>
                    <button class="share-option telegram" data-url="${encodeURIComponent(url)}" data-text="${encodeURIComponent(shareData.text)}">
                        <span class="share-icon">✈️</span>
                        <span>Telegram</span>
                    </button>
                    <button class="share-option facebook" data-url="${encodeURIComponent(url)}">
                        <span class="share-icon">📘</span>
                        <span>Facebook</span>
                    </button>
                    <button class="share-option email" data-url="${encodeURIComponent(url)}" data-text="${encodeURIComponent(shareData.text)}">
                        <span class="share-icon">📧</span>
                        <span>E-Mail</span>
                    </button>
                    <button class="share-option copy-again" data-url="${url}">
                        <span class="share-icon">📋</span>
                        <span>Erneut kopieren</span>
                    </button>
                </div>
            </div>
        `;

        // Styles für den Dialog
        const style = document.createElement('style');
        style.textContent = `
            .share-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            }
            
            .share-dialog-content {
                background: white;
                border-radius: 15px;
                max-width: 400px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .share-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .share-header h3 {
                margin: 0;
                color: #333;
            }
            
            .share-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .share-preview {
                padding: 15px 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #eee;
            }
            
            .share-preview-text {
                color: #28a745;
                font-weight: 500;
                margin-bottom: 10px;
            }
            
            .share-url {
                font-size: 12px;
                color: #666;
                word-break: break-all;
                background: white;
                padding: 8px;
                border-radius: 5px;
                border: 1px solid #ddd;
            }
            
            .share-options {
                padding: 20px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .share-option {
                padding: 15px 10px;
                border: 1px solid #ddd;
                border-radius: 10px;
                background: white;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .share-option:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .share-option.whatsapp:hover { border-color: #25d366; }
            .share-option.telegram:hover { border-color: #0088cc; }
            .share-option.facebook:hover { border-color: #1877f2; }
            .share-option.email:hover { border-color: #dc3545; }
            .share-option.copy-again:hover { border-color: #007bff; }
            
            .share-icon {
                font-size: 24px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(dialog);

        // Event-Listener für Optionen
        dialog.addEventListener('click', async (e) => {
            if (e.target.closest('.share-close') || e.target === dialog) {
                this.removeShareDialog(dialog, style);
                return;
            }

            const option = e.target.closest('.share-option');
            if (!option) return;

            const url = decodeURIComponent(option.dataset.url || '');
            const text = decodeURIComponent(option.dataset.text || '');

            if (option.classList.contains('whatsapp')) {
                window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
            } else if (option.classList.contains('telegram')) {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
            } else if (option.classList.contains('facebook')) {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            } else if (option.classList.contains('email')) {
                const subject = encodeURIComponent('Schau dir dieses Teil bei TuningHub an!');
                const body = encodeURIComponent(`${text}\n\n${url}`);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
            } else if (option.classList.contains('copy-again')) {
                const copied = await this.copyToClipboard(url);
                if (copied) {
                    option.innerHTML = '<span class="share-icon">✅</span><span>Kopiert!</span>';
                    setTimeout(() => {
                        option.innerHTML = '<span class="share-icon">📋</span><span>Erneut kopieren</span>';
                    }, 2000);
                }
            }
        });

        // ESC zum Schließen
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.removeShareDialog(dialog, style);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Entfernt den Share-Dialog
     */
    removeShareDialog(dialog, style) {
        dialog.remove();
        style.remove();
    }

    /**
     * Extrahiert und normalisiert Teil-Daten
     */
    extractPartData(teil) {
        return {
            name: teil.name || teil.title || teil.bezeichnung || 'Unbekanntes Teil',
            preis: teil.preis || teil.price || teil.kosten || 'Preis auf Anfrage',
            beschreibung: teil.beschreibung || teil.description || '',
            bild: teil.bild_url || teil.image_url || teil.foto || '',
            kategorie: teil.kategorie || teil.category || 'Tuning-Teil',
            zustand: teil.zustand || teil.condition || 'Gebraucht',
            verkäufer: teil.seller_name || teil.user_name || 'Privater Verkäufer'
        };
    }

    /**
     * Text auf bestimmte Länge kürzen
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substr(0, maxLength).trim() + '...';
    }

    /**
     * Initialisiert das Sharing-System beim Laden einer geteilten URL
     */
    async initSharedPart() {
        const urlParams = new URLSearchParams(window.location.search);
        const partId = urlParams.get('part');
        
        if (partId) {
            try {
                const { data: part, error } = await this.supabase
                    .from('parts')
                    .select('*')
                    .eq('id', partId)
                    .single();

                if (!error && part) {
                    this.updateMetaTags(part);
                    console.log('[TuningHub] Meta-Tags für geteiltes Teil aktualisiert');
                }
            } catch (error) {
                console.error('[TuningHub] Fehler beim Laden des geteilten Teils:', error);
            }
        }
    }
}

// Export für Verwendung in anderen Dateien
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeileSharing;
} else {
    window.TeileSharing = TeileSharing;
}