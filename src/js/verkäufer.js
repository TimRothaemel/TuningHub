// verkäufer.js - Lädt und zeigt alle Shops/Verkäufer an
console.log("Verkäufer.js geladen");

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Warte auf Supabase Client falls noch nicht geladen
        await new Promise(resolve => {
            const checkSupabase = () => {
                if (window.supabase) {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });

        await loadShops();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Fehler beim Laden der Shops');
    }
});

async function loadShops() {
    try {
        showLoading(true);
        console.log('Loading shops from database...');
        
        // Shops aus der shops-Tabelle laden (öffentlich zugänglich, ohne Authentifizierung)
        const { data: shops, error } = await supabase
            .from('shops')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Error loading shops:', error);
            throw error;
        }
        
        console.log('Loaded shops:', shops);
        renderShops(shops || []);
        
    } catch (error) {
        console.error('Fehler beim Laden der Shops:', error);
        showError('Fehler beim Laden der Shops: ' + error.message);
        renderShops([]);
    } finally {
        showLoading(false);
    }
}

function renderShops(shops) {
    const container = document.getElementById('shopsGrid');
    
    if (!container) {
        console.error('shopsGrid container not found');
        return;
    }
    
    if (!shops || shops.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <div style="font-size: 4rem; margin-bottom: 20px;"></div>
                <h2 style="color: #374151; margin-bottom: 10px;">Keine Shops gefunden</h2>
                <p style="color: #6b7280; font-style: italic; font-size: 1.1rem;">
                    Derzeit sind keine Shops verfügbar.
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = shops.map(shop => `
        <div class="shop-card" onclick="openShopCategories('${shop.id}', '${escapeHtml(shop.name)}')">
            <div class="shop-logo-container">
                ${shop.logo_url ? 
                    `<img src="${shop.logo_url}" alt="${escapeHtml(shop.name)}" class="shop-logo">` : 
                    `<div class="shop-logo-placeholder">
                        <span style="font-size: 3rem;">🏪</span>
                    </div>`
                }
            </div>
            <div class="shop-card-content">
                <h3>${escapeHtml(shop.name)}</h3>
                <p class="shop-card-description">${escapeHtml(shop.description || 'Besuche diesen Shop')}</p>
                ${shop.website ? `<p class="shop-card-meta"><a href="${shop.website}" target="_blank" onclick="event.stopPropagation()">Website</a></p>` : ''}
                <div class="shop-card-footer">
                    <p>Shop besuchen →</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Navigation zu den Kategorien eines Shops
function openShopCategories(shopId, shopName) {
    console.log('Opening categories for shop:', shopId, shopName);
    
    // Shop-Informationen in sessionStorage speichern für die nächste Seite
    sessionStorage.setItem('selectedShopId', shopId);
    sessionStorage.setItem('selectedShopName', shopName);
    
    // Zur Kategorien-Seite navigieren
    window.location.href = '/src/pages/verkäuferKategorien.html';
}

// Hilfsfunktionen
function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    // Fallback: Zeige Loading-Text im Container
    if (show) {
        const container = document.getElementById('shopsGrid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                    <div style="font-size: 2rem; margin-bottom: 20px;">⏳</div>
                    <p style="color: #6b7280;">Shops werden geladen...</p>
                </div>
            `;
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    } else {
        console.error('Error:', message);
        alert('Fehler: ' + message);
    }
}

// Globale Funktionen für onclick
window.openShopCategories = openShopCategories;

// Styles hinzufügen falls noch nicht vorhanden
if (!document.querySelector('#shop-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'shop-styles';
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
}