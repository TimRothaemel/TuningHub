console.log("Business Shop Einstellungen Script geladen");

let supabase;
let currentUser;
let userCategories = [];

// Initialize Supabase
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Wait for supabase client to be available
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

        await initializeApp();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Fehler beim Laden der Anwendung');
    }
});

async function initializeApp() {
    // Check authentication
    currentUser = await getCurrentUser();
    if (!currentUser) {
        showError('Du musst als Business-Account eingeloggt sein.');
        setTimeout(() => window.location.href = '/pages/login.html', 3000);
        return;
    }

    console.log('Current user data:', currentUser);

    // Check if user is business account - use metadata only
    const accountType = currentUser.user_metadata?.account_type || 
                       currentUser.raw_user_meta_data?.account_type ||
                       currentUser.app_metadata?.account_type;
    
    console.log('Account type found:', accountType);
    
    if (accountType !== 'business') {
        showError('Diese Seite ist nur für Business-Accounts verfügbar. Dein Account-Typ: ' + (accountType || 'unbekannt'));
        setTimeout(() => window.location.href = '/index.html', 3000);
        return;
    }

    setupEventListeners();
    await loadShopData();
    await loadCategories();
}

async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

function setupEventListeners() {
    // Tab switching - FIXED: Use event delegation for dynamically loaded content
    document.addEventListener('click', function(e) {
        if (e.target.closest('.tab-button')) {
            const tabButton = e.target.closest('.tab-button');
            const tabId = tabButton.dataset.tab;
            switchTab(tabId);
        }
    });

    // Forms
    document.getElementById('shopInfoForm').addEventListener('submit', handleShopInfoSubmit);
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);

    // Logo preview
    document.getElementById('shopLogo').addEventListener('change', handleLogoPreview);
}

function switchTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

async function loadShopData() {
    try {
        showLoading(true);
        
        // Try to load existing shop data
        const { data, error } = await supabase
            .from('shops')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        if (data) {
            // Populate form with existing data
            document.getElementById('shopName').value = data.name || '';
            document.getElementById('shopDescription').value = data.description || '';
            document.getElementById('shopWebsite').value = data.website || '';
            
            if (data.logo_url) {
                document.getElementById('logoPreview').innerHTML = 
                    `<img src="${data.logo_url}" style="max-width: 200px; max-height: 100px; border-radius: 6px;" alt="Shop Logo">`;
            }
        }
    } catch (error) {
        console.error('Error loading shop data:', error);
        showError('Fehler beim Laden der Shop-Daten');
    } finally {
        showLoading(false);
    }
}


function renderCategories() {
    const container = document.getElementById('categoriesList');
    
    if (!container) {
        console.error('Categories list container not found');
        return;
    }
    
    if (userCategories.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 40px; font-style: italic;">Noch keine Kategorien vorhanden. Erstellen Sie Ihre erste Kategorie!</p>';
        return;
    }

    container.innerHTML = userCategories.map(category => `
        <div class="category-item">
            <div class="category-info">
                <div class="category-name">${escapeHtml(category.name)}</div>
                <div class="category-description">${escapeHtml(category.description || 'Keine Beschreibung')}</div>
            </div>
            <div class="category-actions">
                <button class="icon-btn" onclick="deleteCategory('${escapeHtml(category.id)}')" title="Kategorie löschen">
                    Löschen
                </button>
            </div>
        </div>
    `).join('');
}
async function loadCategories() {
    try {
        // Load categories from database
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
            userCategories = data;
            renderCategories();
        } else {
            // Fallback: Get distinct categories from user's parts if no categories exist yet
            await loadCategoriesFromParts();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to loading from parts if categories table doesn't exist
        await loadCategoriesFromParts();
    }
}

async function loadCategoriesFromParts() {
    try {
        const { data, error } = await supabase
            .from('parts')
            .select('category')
            .eq('user_id', currentUser.id)
            .not('category', 'is', null);

        if (error) throw error;

        const uniqueCategories = [...new Set(data.map(item => item.category))].filter(Boolean);
        userCategories = uniqueCategories.map(name => ({ 
            id: name, 
            name: name, 
            description: '' 
        }));
        
        renderCategories();
    } catch (error) {
        console.error('Error loading categories from parts:', error);
        // Don't show error if no categories exist yet
    }
}
async function handleShopInfoSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const shopData = {
            user_id: currentUser.id,
            name: document.getElementById('shopName').value.trim(),
            description: document.getElementById('shopDescription').value.trim(),
            website: document.getElementById('shopWebsite').value.trim(),
            updated_at: new Date().toISOString()
        };

        // Handle logo upload if present
        const logoFile = document.getElementById('shopLogo').files[0];
        if (logoFile) {
            const logoUrl = await uploadShopLogo(logoFile);
            shopData.logo_url = logoUrl;
        }

        // Upsert shop data - only update specific fields
        const { error } = await supabase
            .from('shops')
            .upsert(shopData, { 
                onConflict: 'user_id',
                ignoreDuplicates: false
            });

        if (error) throw error;

        showSuccess('Shop-Informationen erfolgreich gespeichert!');
    } catch (error) {
        console.error('Error saving shop info:', error);
        showError('Fehler beim Speichern der Shop-Informationen: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function uploadShopLogo(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}_logo_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from('shop-logos')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    return `https://yvdptnkmgfxkrszitweo.supabase.co/storage/v1/object/public/shop-logos/${fileName}`;
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const categoryName = document.getElementById('categoryName').value.trim();
        const categoryDescription = document.getElementById('categoryDescription').value.trim();

        if (!categoryName) {
            showError('Bitte geben Sie einen Kategorienamen ein');
            return;
        }

        // Check if category already exists in database
        const { data: existingCategories, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('name', categoryName);

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingCategories && existingCategories.length > 0) {
            showError('Diese Kategorie existiert bereits!');
            return;
        }

        // Save category to database
        const { data: newCategory, error: insertError } = await supabase
            .from('categories')
            .insert([
                {
                    user_id: currentUser.id,
                    name: categoryName,
                    description: categoryDescription
                }
            ])
            .select();

        if (insertError) throw insertError;

        // Add to user categories array
        userCategories.push({
            id: newCategory[0].id,
            name: categoryName,
            description: categoryDescription
        });

        // Render updated categories
        renderCategories();
        
        // Reset form
        document.getElementById('categoryForm').reset();
        
        showSuccess('Kategorie erfolgreich hinzugefügt!');
    } catch (error) {
        console.error('Error adding category:', error);
        showError('Fehler beim Hinzufügen der Kategorie: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Möchten Sie diese Kategorie wirklich löschen?')) {
        return;
    }

    try {
        showLoading(true);
        
        // Delete category from database
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        
        // Remove category from local array
        userCategories = userCategories.filter(cat => cat.id !== categoryId);
        
        // Re-render categories
        renderCategories();
        
        showSuccess('Kategorie erfolgreich gelöscht!');
    } catch (error) {
        console.error('Error deleting category:', error);
        showError('Fehler beim Löschen der Kategorie: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function handleLogoPreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('logoPreview');

    if (!file) {
        preview.innerHTML = '';
        return;
    }

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" 
                     style="max-width: 200px; max-height: 100px; border-radius: 8px; border: 2px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" 
                     alt="Logo Preview">
            `;
        };
        reader.readAsDataURL(file);
    }
}

function showSuccess(message) {
    hideMessages();
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => successDiv.style.display = 'none', 5000);
}

function showError(message) {
    hideMessages();
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideMessages() {
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global for onclick handlers
window.deleteCategory = deleteCategory;