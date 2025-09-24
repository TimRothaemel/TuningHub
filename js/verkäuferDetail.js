console.log("verkäufer-detail.js geladen");

// Supabase Verbindungen
const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";

const client = supabase.createClient(supabaseUrl, supabaseKey);

let currentSeller = null;
let sellerProducts = [];
let isLoading = false;

// Get URL Parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Sanitize Functions
function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "").substring(0, 500);
}

// Loading Overlay
function showLoading(show = true) {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay && show) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <div>Lade Sortiment...</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

// Create Product Card
function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "card";
  card.onclick = () => navigateToProduct(product);

  // Handle multiple images
  const imageUrl = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : "/img/default-part-image.png";

  // Sanitize data
  const title = sanitizeInput(product.title || "Unbekanntes Teil");
  const description = sanitizeInput(product.description || "Keine Beschreibung verfügbar");
  const price = product.price ? parseFloat(product.price).toFixed(2) : "Preis auf Anfrage";

  card.innerHTML = `
    <div class="card-image-container">
      <img src="${imageUrl}" alt="${title}" onerror="this.src='/img/default-part-image.png'">
      ${product.condition ? `<div class="card-badge">${product.condition}</div>` : ''}
    </div>
    <div class="card-content">
      <h2>${title}</h2>
      <div class="card-description">${description}</div>
      <div class="card-footer">
        <p><strong>${price}€</strong></p>
      </div>
    </div>
  `;

  return card;
}

// Navigate to Product Detail
function navigateToProduct(product) {
  console.log("Navigating to product:", product.title);
  window.location.href = `/html/teil-detail.html?id=${product.id}`;
}

// Create Seller Header
function createSellerHeader(seller) {
  const header = document.createElement("div");
  header.className = "seller-header";

  const logoUrl = seller.logo_url || "/img/default-business-logo.png";
  const companyName = sanitizeInput(seller.company_name || "Unbekannter Verkäufer");
  const description = sanitizeInput(seller.description || "Spezialist für Mopedteile");

  header.innerHTML = `
    <div class="seller-header-content">
      <div class="seller-logo">
        <img src="${logoUrl}" alt="${companyName} Logo" onerror="this.src='/img/default-business-logo.png'">
      </div>
      <div class="seller-info">
        <h1>${companyName}</h1>
        <p class="seller-description">${description}</p>
        ${seller.contact_link ? `
          <div class="seller-contact">
            <a href="${seller.contact_link}" target="_blank" rel="noopener noreferrer" class="contact-btn">
              Kontakt aufnehmen
            </a>
          </div>
        ` : ''}
      </div>
    </div>
    <div class="back-navigation">
      <button onclick="goBack()" class="back-btn">
        ← Zurück zu allen Verkäufern
      </button>
    </div>
  `;

  return header;
}

// Group Products by Category
function groupProductsByCategory(products) {
  const grouped = {};
  
  products.forEach(product => {
    const category = product.category || "Sonstige Teile";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(product);
  });

  return grouped;
}

// Render Seller Products
function renderSellerProducts(seller, products) {
  const mainContent = document.querySelector("main");
  
  if (!products || products.length === 0) {
    mainContent.innerHTML = `
      ${createSellerHeader(seller).outerHTML}
      <div class="no-products">
        <div class="no-products-content">
          <img src="/svg/inventory_60dp_000000_FILL0_wght400_GRAD0_opsz48.svg" alt="Keine Produkte" width="64" height="64">
          <h3>Noch keine Produkte</h3>
          <p>Dieser Verkäufer hat noch keine Produkte in seinem Sortiment.</p>
        </div>
      </div>
    `;
    return;
  }

  const groupedProducts = groupProductsByCategory(products);
  const categories = Object.keys(groupedProducts).sort();

  const contentHTML = `
    ${createSellerHeader(seller).outerHTML}
    <div class="seller-products">
      <div class="products-header">
        <h2>Sortiment (${products.length} ${products.length === 1 ? 'Artikel' : 'Artikel'})</h2>
        <div class="category-filter">
          <select id="category-filter" onchange="filterByCategory(this.value)">
            <option value="">Alle Kategorien</option>
            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
          </select>
        </div>
      </div>
      
      ${categories.map(category => `
        <div class="category-section" data-category="${category}">
          <h3 class="category-title">${category} (${groupedProducts[category].length})</h3>
          <div class="products-grid">
            ${groupedProducts[category].map(product => createProductCard(product).outerHTML).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  mainContent.innerHTML = contentHTML;

  // Re-add event listeners for cards
  const cards = mainContent.querySelectorAll('.card');
  cards.forEach((card, index) => {
    const allProducts = categories.flatMap(cat => groupedProducts[cat]);
    card.onclick = () => navigateToProduct(allProducts[index]);
  });
}

// Filter by Category
function filterByCategory(selectedCategory) {
  const categorySections = document.querySelectorAll('.category-section');
  
  categorySections.forEach(section => {
    const category = section.getAttribute('data-category');
    if (!selectedCategory || category === selectedCategory) {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });
}

// Go Back Navigation
function goBack() {
  window.history.back();
}

// Load Seller Data
async function loadSellerData(sellerId) {
  try {
    console.log("Loading seller data for ID:", sellerId);

    // Try to get seller from localStorage first
    const storedSeller = localStorage.getItem("currentSeller");
    if (storedSeller) {
      try {
        currentSeller = JSON.parse(storedSeller);
        console.log("Loaded seller from localStorage:", currentSeller);
      } catch (e) {
        console.warn("Failed to parse stored seller data:", e);
      }
    }

    // If no stored data, fetch from Supabase
    if (!currentSeller) {
      const { data: authUsers, error: authError } = await client.auth.admin.listUsers();
      
      if (authError) {
        throw new Error("Fehler beim Laden der Verkäufer-Daten");
      }

      const seller = authUsers.users.find(user => user.id === sellerId);
      if (!seller || seller.user_metadata?.account_type !== "business") {
        throw new Error("Verkäufer nicht gefunden");
      }

      currentSeller = {
        id: seller.id,
        company_name: seller.user_metadata?.company_name,
        description: seller.user_metadata?.description,
        logo_url: seller.user_metadata?.logo_url,
        contact_link: seller.user_metadata?.contact_link
      };
    }

    return currentSeller;
  } catch (error) {
    console.error("Error loading seller data:", error);
    throw error;
  }
}

// Load Seller Products
async function loadSellerProducts(sellerId) {
  try {
    console.log("Loading products for seller:", sellerId);

    const { data: products, error } = await client
      .from("teile")
      .select("*")
      .eq("user_id", sellerId)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading products:", error);
      throw new Error("Fehler beim Laden der Produkte");
    }

    console.log(`Loaded ${products.length} products for seller`);
    return products || [];
  } catch (error) {
    console.error("Error loading seller products:", error);
    throw error;
  }
}

// Initialize Page
async function initializePage() {
  if (isLoading) return;
  
  const sellerId = getUrlParameter("seller");
  if (!sellerId) {
    window.location.href = "/html/Verkäufer/verkäufer.html";
    return;
  }

  try {
    isLoading = true;
    showLoading(true);

    const seller = await loadSellerData(sellerId);
    const products = await loadSellerProducts(sellerId);

    sellerProducts = products;
    renderSellerProducts(seller, products);

    // Update page title
    document.title = `${seller.company_name} - TuningHub`;

  } catch (error) {
    console.error("Error initializing page:", error);
    
    const mainContent = document.querySelector("main");
    mainContent.innerHTML = `
      <div class="error-message">
        <div class="error-content">
          <img src="/svg/error_60dp_000000_FILL0_wght400_GRAD0_opsz48.svg" alt="Fehler" width="64" height="64">
          <h3>Fehler beim Laden</h3>
          <p>${error.message}</p>
          <button onclick="initializePage()" class="btn-primary">Erneut versuchen</button>
          <a href="/html/Verkäufer/verkäufer.html" class="btn-secondary">Zurück zu allen Verkäufern</a>
        </div>
      </div>
    `;
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

// Add Styles
function addStyles() {
  if (document.getElementById("sellerDetailStyles")) return;
  
  const style = document.createElement("style");
  style.id = "sellerDetailStyles";
  style.textContent = `
    .seller-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 1rem;
      margin-bottom: 2rem;
    }

    .seller-header-content {
      display: flex;
      align-items: center;
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      margin-bottom: 1rem;
    }

    .seller-logo {
      flex-shrink: 0;
    }

    .seller-logo img {
      width: 120px;
      height: 120px;
      object-fit: contain;
      background: white;
      border-radius: 12px;
      padding: 1rem;
    }

    .seller-info h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: white;
    }

    .seller-description {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .contact-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 12px 24px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .contact-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .back-navigation {
      max-width: 1200px;
      margin: 0 auto;
    }

    .back-btn {
      background: transparent;
      color: white;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      padding: 8px 0;
      opacity: 0.8;
      transition: opacity 0.2s ease;
    }

    .back-btn:hover {
      opacity: 1;
    }

    .seller-products {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .products-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .products-header h2 {
      color: #2c3e50;
      font-size: 1.8rem;
    }

    .category-filter select {
      padding: 8px 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
    }

    .category-section {
      margin-bottom: 3rem;
    }

    .category-title {
      color: #2c3e50;
      font-size: 1.4rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #3498db;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .card-image-container {
      position: relative;
      height: 200px;
      overflow: hidden;
    }

    .card-image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .card:hover .card-image-container img {
      transform: scale(1.05);
    }

    .card-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: #27ae60;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .card-content {
      padding: 1.5rem;
    }

    .no-products, .error-message {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
      text-align: center;
    }

    .no-products-content, .error-content {
      max-width: 400px;
      padding: 2rem;
    }

    .no-products-content img, .error-content img {
      opacity: 0.5;
      margin-bottom: 1rem;
    }

    .no-products-content h3, .error-content h3 {
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    .no-products-content p, .error-content p {
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .btn-primary {
      background: #3498db;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: background-color 0.2s ease;
      cursor: pointer;
      margin-right: 1rem;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: background-color 0.2s ease;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      font-size: 18px;
      font-weight: bold;
    }

    .loading-content {
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .seller-header-content {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .seller-logo img {
        width: 80px;
        height: 80px;
      }

      .seller-info h1 {
        font-size: 2rem;
      }

      .seller-description {
        font-size: 1rem;
      }

      .products-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .products-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .seller-products {
        padding: 0 0.5rem;
      }

      .category-filter {
        width: 100%;
      }

      .category-filter select {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .seller-header {
        padding: 1rem 0.5rem;
      }

      .seller-info h1 {
        font-size: 1.5rem;
      }

      .card-content {
        padding: 1rem;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
        margin: 0.5rem 0;
        text-align: center;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Make functions globally available
window.filterByCategory = filterByCategory;
window.goBack = goBack;
window.initializePage = initializePage;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Initializing seller detail page");
  
  addStyles();
  initializePage();
  
  console.log("Seller detail page initialization complete");
});