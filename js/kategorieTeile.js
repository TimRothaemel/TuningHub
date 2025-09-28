// kategorieTeile.js - Lädt und zeigt Teile einer Kategorie an
console.log("Kategorie Teile Script geladen");

let supabase;
let currentShop;
let currentCategory;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Supabase Client direkt importieren
        const supabaseModule = await import('/js/supabaseClient.js');
        supabase = supabaseModule.supabase;
        
        await initializePartsPage();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Fehler beim Laden der Teile');
    }
});

async function initializePartsPage() {
    // Daten aus sessionStorage holen
    const shopId = sessionStorage.getItem('selectedShopId');
    const shopName = sessionStorage.getItem('selectedShopName');
    const categoryId = sessionStorage.getItem('selectedCategoryId');
    const categoryName = sessionStorage.getItem('selectedCategoryName');
    
    if (!shopId || !categoryId) {
        showError('Fehlende Shop- oder Kategorie-Information');
        setTimeout(() => window.location.href = '/html/verkäufer.html', 3000);
        return;
    }

    console.log('Loading parts for shop:', shopId, 'category:', categoryId);

    // UI aktualisieren
    updatePageHeader(shopName, categoryName);
    
    // Shop-Details laden
    await loadShopDetails(shopId);
    
    // Teile laden - VERBESSERTE VERSION
    await loadCategoryParts(shopId, categoryId, categoryName);
}

function updatePageHeader(shopName, categoryName) {
    const pageTitle = document.getElementById('pageTitle');
    const pageDescription = document.getElementById('pageDescription');
    const shopBreadcrumb = document.getElementById('shopBreadcrumb');
    const categoryBreadcrumb = document.getElementById('categoryBreadcrumb');
    
    if (pageTitle) pageTitle.textContent = categoryName || 'Kategorie';
    if (pageDescription) pageDescription.textContent = `Teile in der Kategorie "${categoryName}" von ${shopName}`;
    if (shopBreadcrumb) {
        shopBreadcrumb.textContent = shopName || 'Shop';
        shopBreadcrumb.onclick = () => goBackToCategories();
    }
    if (categoryBreadcrumb) categoryBreadcrumb.textContent = categoryName || 'Kategorie';
}

async function loadShopDetails(shopId) {
    try {
        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();

        if (error) {
            console.error('Error loading shop details:', error);
            return;
        }

        currentShop = shop;
        console.log('Shop details loaded:', shop);

    } catch (error) {
        console.error('Error loading shop details:', error);
    }
}

async function loadCategoryParts(shopId, categoryId, categoryName) {
    try {
        showLoading(true);
        console.log('Loading parts for category ID:', categoryId, 'Name:', categoryName);
        
        let parts = [];
        
        // VERBESSERTE ABFRAGE-STRATEGIE
        // 1. Versuche direkte Abfrage mit category_id
        try {
            const { data, error } = await supabase
                .from('parts')
                .select('*')
                .eq('category_id', categoryId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                parts = data;
                console.log('Loaded parts via category_id:', parts);
            }
        } catch (err) {
            console.log('category_id query error:', err);
        }
        
        // 2. Fallback: Versuche mit category (falls das der Spaltenname ist)
        if (parts.length === 0) {
            try {
                const { data, error } = await supabase
                    .from('parts')
                    .select('*')
                    .eq('category', categoryId)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    parts = data;
                    console.log('Loaded parts via category field:', parts);
                }
            } catch (err) {
                console.log('category field query error:', err);
            }
        }
        
        // 3. Fallback: Über user_id des Shops
        if (parts.length === 0 && currentShop?.user_id) {
            try {
                const { data, error } = await supabase
                    .from('parts')
                    .select('*')
                    .eq('user_id', currentShop.user_id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    // Client-seitig nach Kategorie filtern
                    parts = data.filter(part => 
                        part.category_id === categoryId || 
                        part.category === categoryId
                    );
                    console.log('Loaded parts via user_id with filtering:', parts);
                }
            } catch (err) {
                console.log('User parts access error:', err);
            }
        }
        
        // 4. Debug: Zeige alle verfügbaren Teile für diesen Shop
        if (parts.length === 0 && currentShop?.user_id) {
            try {
                const { data, error } = await supabase
                    .from('parts')
                    .select('*')
                    .eq('user_id', currentShop.user_id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    console.log('All parts for this shop (for debugging):', data);
                    console.log('Looking for categoryId:', categoryId);
                    console.log('Available category_ids in parts:', [...new Set(data.map(p => p.category_id))]);
                    console.log('Available category fields in parts:', [...new Set(data.map(p => p.category))]);
                }
            } catch (err) {
                console.log('Debug query error:', err);
            }
        }
        
        renderParts(parts, categoryName);

    } catch (error) {
        console.error('Error loading parts:', error);
        showError('Fehler beim Laden der Teile: ' + error.message);
        renderParts([], categoryName);
    } finally {
        showLoading(false);
    }
}

function renderParts(parts, categoryName) {
    const container = document.getElementById('partsGrid');
    
    if (!container) {
        console.error('Parts grid container not found');
        return;
    }
    
    console.log('Rendering parts:', parts);
    
    if (!parts || parts.length === 0) {
        container.innerHTML = `
            <div class="no-parts-message" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;"></div>
                <h2 style="color: #374151; margin-bottom: 10px;">Keine Teile gefunden</h2>
                <p style="color: #6b7280; font-style: italic; font-size: 1.1rem; margin-bottom: 30px;">
                    In der Kategorie "${categoryName || 'diese Kategorie'}" sind derzeit keine Teile verfügbar.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="goBackToCategories()" 
                            style="padding: 12px 24px; background: #667eea; color: white; 
                                   border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        Zurück zu Kategorien
                    </button>
                    <button onclick="location.reload()" 
                            style="padding: 12px 24px; background: #e2e8f0; color: #374151; 
                                   border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        Erneut versuchen
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = parts.map(part => createPartCard(part, categoryName)).join('');
    console.log('Parts rendered successfully');
}

function createPartCard(part, defaultCategoryName) {
    const categoryName = part.category_name || defaultCategoryName || part.category || 'Unbekannte Kategorie';
    const condition = part.condition || 'used';
    const conditionClass = `condition-${condition.toLowerCase().replace(' ', '-')}`;
    const conditionText = getConditionText(condition);
    
    // Prüfen ob ein Link vorhanden ist
    const hasLink = part.link && part.link.trim().length > 0;
    const clickHandler = hasLink ? `openExternalLink('${escapeHtml(part.link)}', '${escapeHtml(part.title || part.name)}')` : `openPartDetails('${part.id}', '${escapeHtml(part.title || part.name)}')`;
    
    // Bild-URLs
    const imageUrl = part.image_url || part.image_url1 || part.photo_url || 
                    '/images/placeholder-part.jpg';
    
    const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmM2Y0ZjYiLz4KICAgIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiPvCfmKc8L3RleHQ+Cjwvc3ZnPg==';
    
    return `
        <div class="card ${hasLink ? 'external-link-card' : ''}" onclick="${clickHandler}">
            <img src="${imageUrl}" 
                 alt="${escapeHtml(part.title || part.name)}" 
                 onerror="this.src='${fallbackImage}'"
                 style="width: 100%; height: 200px; object-fit: cover;">
            <div class="card-content">
                <div class="part-condition ${conditionClass}">${conditionText}</div>
                <h3>${escapeHtml(part.title || part.name || 'Unbenanntes Teil')}</h3>
                <div class="part-meta">
                    <small>Kategorie: ${escapeHtml(categoryName)}</small>
                    ${hasLink ? '<small style="display: block; color: #28a745; font-weight: bold;">🔗 Zur Webseite</small>' : ''}
                </div>
                <p class="card-description">
                    ${escapeHtml(part.description || 'Keine Beschreibung verfügbar')}
                </p>
                <div class="card-footer">
                    <p><strong>${formatPrice(part.price)}</strong></p>
                </div>
            </div>
        </div>
    `;
}

function getConditionText(condition) {
    const cond = condition?.toLowerCase();
    switch(cond) {
        case 'neu': return 'Neu';
        case 'new': return 'Neu';
        case 'sehr gut': return 'Sehr gut';
        case 'gebraucht': return 'Gebraucht';
        case 'used': return 'Gebraucht';
        case 'defekt': return 'Defekt';
        default: return cond || 'Gebraucht';
    }
}

function formatPrice(price) {
    if (!price && price !== 0) return 'Preis auf Anfrage';
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) return 'Preis auf Anfrage';
    
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(numPrice);
}

// NEUE FUNKTION: Externen Link öffnen
function openExternalLink(url, partName) {
    console.log('Opening external link:', url, 'for part:', partName);
    
    if (!url) {
        console.error('No URL provided');
        alert('Fehler: Kein Link verfügbar');
        return;
    }
    
    // Validierung der URL
    try {
        new URL(url);
    } catch (e) {
        console.error('Invalid URL:', url);
        alert('Fehler: Ungültiger Link');
        return;
    }
    
    // Link in neuem Tab/Fenster öffnen
    window.open(url, '_blank', 'noopener,noreferrer');
}

// MODIFIZIERTE FUNKTION: Fallback für Teile ohne Link
function openPartDetails(partId, partName) {
    console.log('Opening part details:', partId, partName);
    
    sessionStorage.setItem('selectedPartId', partId);
    sessionStorage.setItem('selectedPartName', partName);
    
    // Für zukünftige Detailseite oder Fallback-Verhalten
    alert(`Teil-Details für "${partName}" würden hier angezeigt.\nTeil-ID: ${partId}\n\nHinweis: Für Teile mit hinterlegtem Link wird direkt der externe Link geöffnet.`);
}

function goBackToCategories() {
    window.location.href = '/html/verkäuferKategorien.html';
}

function goBackToShops() {
    window.location.href = '/html/verkäufer.html';
}

function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    console.error('Error:', message);
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    } else {
        alert('Fehler: ' + message);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Browser Back-Button Support
window.addEventListener('popstate', function(event) {
    const categoryId = sessionStorage.getItem('selectedCategoryId');
    if (!categoryId) {
        goBackToCategories();
    }
});

// Globale Funktionen für HTML onclick
window.openExternalLink = openExternalLink;  // NEUE FUNKTION
window.openPartDetails = openPartDetails;
window.goBackToCategories = goBackToCategories;
window.goBackToShops = goBackToShops;