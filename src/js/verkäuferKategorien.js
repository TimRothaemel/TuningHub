console.log("Shop Kategorien Script geladen");

let supabase;
let currentShop;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Warte auf Supabase Client
        await new Promise(resolve => {
            const checkSupabase = () => {
                if (window.supabase) {
                    supabase = window.supabase;
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });

        await initializeCategoriesPage();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Fehler beim Laden der Kategorien');
    }
});

async function initializeCategoriesPage() {
    // Shop ID aus sessionStorage holen (von verkäufer.html)
    const shopId = sessionStorage.getItem('selectedShopId');
    const shopName = sessionStorage.getItem('selectedShopName');
    
    if (!shopId) {
        showError('Kein Shop ausgewählt');
        setTimeout(() => window.location.href = '/src/pages/verkäufer.html', 3000);
        return;
    }

    console.log('Loading categories for shop:', shopId, shopName);

    await loadShopDetails(shopId);
    await loadShopCategories(shopId);
    setupEventListeners();
}

async function loadShopDetails(shopId) {
    try {
        showLoading(true);
        
        const { data: shop, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();

        if (error) {
            console.error('Error loading shop details:', error);
            throw error;
        }

        if (!shop) {
            throw new Error('Shop not found');
        }

        currentShop = shop;
        
        // Shop-Informationen in der Seite anzeigen
        const shopTitle = document.getElementById('shopTitle');
        const shopDescription = document.getElementById('shopDescription');
        
        if (shopTitle) shopTitle.textContent = shop.name;
        if (shopDescription) shopDescription.textContent = shop.description || 'Wähle eine Kategorie aus';
        
       

        console.log('Shop details loaded:', shop);

    } catch (error) {
        console.error('Error loading shop details:', error);
        showError('Fehler beim Laden der Shop-Details: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function loadShopCategories(shopId) {
    try {
        showLoading(true);
        console.log('Loading categories for shop:', shopId);
        
        // Strategie 1: Kategorien über shop_categories Verknüpfungstabelle laden
        let categories = [];
        let categoriesError = null;
        
        try {
            console.log('Trying to load via shop_categories...');
            const { data: shopCategories, error } = await supabase
                .from('shop_categories')
                .select(`
                    category_id,
                    categories (
                        id,
                        name,
                        description,
                        user_id
                    )
                `)
                .eq('shop_id', shopId);

            if (error) {
                categoriesError = error;
                console.log('Shop categories error:', error);
            } else if (shopCategories && shopCategories.length > 0) {
                categories = shopCategories
                    .filter(sc => sc.categories) // Filter null categories
                    .map(sc => sc.categories);
                console.log('Loaded categories from shop_categories:', categories);
            }
        } catch (err) {
            categoriesError = err;
            console.log('Shop categories access error:', err);
        }

        // Strategie 2: Falls shop_categories leer ist, über user_id des Shops
        if (categories.length === 0 && currentShop?.user_id) {
            console.log('Trying to load via shop user_id:', currentShop.user_id);
            try {
                const { data: userCategories, error } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('user_id', currentShop.user_id)
                    .order('name');

                if (error) {
                    console.log('User categories error:', error);
                } else {
                    categories = userCategories || [];
                    console.log('Loaded categories from user_id:', categories);
                }
            } catch (err) {
                console.log('User categories access error:', err);
            }
        }

        // Strategie 3: Fallback - Kategorien aus parts extrahieren
        if (categories.length === 0) {
            console.log('No categories found, trying to extract from parts...');
            categories = await loadCategoriesFromParts(shopId);
        }
        
        renderCategories(categories || []);

    } catch (error) {
        console.error('Error in loadShopCategories:', error);
        showError('Fehler beim Laden der Kategorien: ' + error.message);
        renderCategories([]); // Zeige leere Ansicht
    } finally {
        showLoading(false);
    }
}

// Fallback: Kategorien aus parts-Tabelle extrahieren
async function loadCategoriesFromParts(shopId) {
    try {
        console.log('Attempting to load categories from parts table for shop:', shopId);
        
        let parts = null;
        
        // Versuche 1: parts mit shop_id (falls die Spalte existiert)
        try {
            const { data, error } = await supabase
                .from('parts')
                .select('category, user_id')
                .eq('shop_id', shopId)
                .not('category', 'is', null);

            if (error) {
                console.log('Parts with shop_id error:', error);
            } else {
                parts = data;
                console.log('Loaded parts via shop_id:', parts);
            }
        } catch (err) {
            console.log('Parts shop_id access error:', err);
        }

        // Versuche 2: parts über user_id des Shops
        if ((!parts || parts.length === 0) && currentShop?.user_id) {
            try {
                const { data, error } = await supabase
                    .from('parts')
                    .select('category, user_id')
                    .eq('user_id', currentShop.user_id)
                    .not('category', 'is', null);

                if (error) {
                    console.log('Parts with user_id error:', error);
                } else {
                    parts = data;
                    console.log('Loaded parts via user_id:', parts);
                }
            } catch (err) {
                console.log('Parts user_id access error:', err);
            }
        }

        if (!parts || parts.length === 0) {
            console.log('No parts found for category extraction');
            return [];
        }

        // Einzigartige Kategorien extrahieren
        const uniqueCategories = [...new Set(parts.map(item => item.category).filter(Boolean))];
        
        const categories = uniqueCategories.map(name => ({
            id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name: name,
            description: `Teile in der Kategorie ${name}`,
            user_id: parts[0]?.user_id || null
        }));
        
        console.log('Extracted categories from parts:', categories);
        return categories;
        
    } catch (error) {
        console.error('Error loading categories from parts:', error);
        return [];
    }
}

function renderCategories(categories) {
    const container = document.getElementById('categoriesGrid');
    
    if (!container) {
        console.error('Categories grid container not found');
        return;
    }
    
    console.log('Rendering categories:', categories);
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                <div style="font-size: 4rem; margin-bottom: 20px;"></div>
                <h2 style="color: #374151; margin-bottom: 10px;">Keine Kategorien gefunden</h2>
                <p style="color: #6b7280; font-style: italic; font-size: 1.1rem; margin-bottom: 30px;">
                    Dieser Shop hat noch keine Kategorien angelegt.
                </p>
                <button onclick="goBackToShops()" 
                        style="padding: 12px 24px; background: #667eea; color: white; 
                               border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Zurück zu den Shops
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = categories.map(category => `
        <div class="shop-card" onclick="openCategoryParts('${category.id}', '${escapeHtml(category.name)}')">
            <div class="shop-card-content">
                <h2>${escapeHtml(category.name)}</h2>
                <p class="shop-card-description">
                    ${escapeHtml(category.description || 'Entdecke die Teile in dieser Kategorie')}
                </p>
                <div class="shop-card-footer">
                    <p>Kategorie ansehen →</p>
                </div>
            </div>
        </div>
    `).join('');

    console.log('Categories rendered successfully');
}

// Navigation zur Teile-Seite
function openCategoryParts(categoryId, categoryName) {
    sessionStorage.setItem('selectedCategoryId', categoryId);
    sessionStorage.setItem('selectedCategoryName', categoryName);
    sessionStorage.setItem('selectedShopId', currentShop.id);
    sessionStorage.setItem('selectedShopName', currentShop.name);
    
    console.log('Opening category parts:', categoryId, categoryName);
    window.location.href = '/src/pages/kategorieTeile.html';
}

// Zurück zu den Shops
function goBackToShops() {
    window.location.href = '/src/pages/verkäufer.html';
}

// Event Listener für Back-Button
function setupEventListeners() {
    // Back-Button im Header falls vorhanden
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', goBackToShops);
    }
    
    // Browser Back-Button unterstützen
    window.addEventListener('popstate', function(event) {
        if (!sessionStorage.getItem('selectedShopId')) {
            goBackToShops();
        }
    });
}

// Hilfsfunktionen
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

// Globale Funktionen für onclick
window.openCategoryParts = openCategoryParts;
window.goBackToShops = goBackToShops;