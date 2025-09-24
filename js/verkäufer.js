console.log("verkäufer.js geladen");

// Supabase Verbindungen
const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";

const client = supabase.createClient(supabaseUrl, supabaseKey);

let allSellers = [];
let isLoading = false;

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
        <div>Lade Verkäufer...</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

// Create Seller Card
function createSellerCard(seller) {
  const card = document.createElement("div");
  card.className = "card";
  card.onclick = () => navigateToSellerPage(seller);

  // Fallback logo if none provided
  const logoUrl = seller.logo_url || "/img/default-business-logo.png";
  
  // Create company description with fallback
  const description = seller.description || "Spezialist für Mopedteile und Tuning-Komponenten";
  
  // Sanitize data
  const companyName = sanitizeInput(seller.company_name || "Unbekannter Verkäufer");
  const sanitizedDescription = sanitizeInput(description);
  
  card.innerHTML = `
    <div class="card-image-container">
      <img src="${logoUrl}" alt="${companyName} Logo" onerror="this.src='/img/default-business-logo.png'">
      <div class="card-badge">Business</div>
    </div>
    <div class="card-content">
      <h2>${companyName}</h2>
      <div class="card-description">${sanitizedDescription}</div>
      <div class="card-footer">
        <p><strong>Sortiment ansehen</strong></p>
      </div>
    </div>
  `;

  return card;
}

// Navigate to Seller Page
function navigateToSellerPage(seller) {
  console.log("Navigating to seller:", seller.company_name);
  
  // Store seller data in localStorage for the detail page
  try {
    localStorage.setItem("currentSeller", JSON.stringify({
      id: seller.id,
      company_name: seller.company_name,
      description: seller.description,
      logo_url: seller.logo_url,
      contact_link: seller.contact_link
    }));
    
    // Navigate to seller detail page
    window.location.href = `/html/verkäufer-detail.html?seller=${encodeURIComponent(seller.id)}`;
  } catch (error) {
    console.error("Error storing seller data:", error);
    // Fallback: navigate with URL parameters
    window.location.href = `/html/verkäufer-detail.html?seller=${encodeURIComponent(seller.id)}&name=${encodeURIComponent(seller.company_name)}`;
  }
}

// Render Sellers
function renderSellers(sellers) {
  const mainContent = document.querySelector("main");
  
  if (!sellers || sellers.length === 0) {
    mainContent.innerHTML = `
      <div class="no-results">
        <div class="no-results-content">
          <img src="/svg/business_60dp_000000_FILL0_wght400_GRAD0_opsz48.svg" alt="Keine Verkäufer" width="64" height="64">
          <h3>Noch keine Verkäufer gefunden</h3>
          <p>Derzeit sind noch keine Business-Verkäufer registriert.</p>
          <a href="/html/registerbusiness.html" class="btn-primary">Als Verkäufer registrieren</a>
        </div>
      </div>
    `;
    return;
  }

  const sellersGrid = document.createElement("div");
  sellersGrid.className = "sellers-grid";

  const headerSection = document.createElement("div");
  headerSection.className = "page-header";
  headerSection.innerHTML = `
    <h1>Unsere Verkäufer</h1>
    <p>Entdecke ${sellers.length} spezialisierte Verkäufer für Mopedteile und Tuning-Komponenten</p>
    <div class="sellers-search">
      <input type="text" id="seller-search" placeholder="Verkäufer suchen..." onkeyup="searchSellers(this.value)">
    </div>
  `;

  sellers.forEach(seller => {
    const card = createSellerCard(seller);
    sellersGrid.appendChild(card);
  });

  mainContent.innerHTML = "";
  mainContent.appendChild(headerSection);
  mainContent.appendChild(sellersGrid);
}

// Search Sellers
function searchSellers(query) {
  if (!query || query.trim() === "") {
    renderSellers(allSellers);
    return;
  }

  const filteredSellers = allSellers.filter(seller => 
    seller.company_name?.toLowerCase().includes(query.toLowerCase()) ||
    seller.description?.toLowerCase().includes(query.toLowerCase())
  );

  renderSellers(filteredSellers);
}

// Load Sellers from Supabase
async function loadSellers() {
  if (isLoading) return;
  
  try {
    isLoading = true;
    showLoading(true);

    console.log("Loading sellers from Supabase...");
    
    // Query to get business users with their metadata
    const { data: authUsers, error: authError } = await client.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error loading auth users:", authError);
      throw new Error("Fehler beim Laden der Verkäufer");
    }

    // Filter business accounts and extract relevant data
    const businessUsers = authUsers.users
      .filter(user => user.user_metadata?.account_type === "business")
      .map(user => ({
        id: user.id,
        email: user.email,
        company_name: user.user_metadata?.company_name,
        description: user.user_metadata?.description,
        logo_url: user.user_metadata?.logo_url,
        contact_link: user.user_metadata?.contact_link,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }))
      .filter(user => user.company_name) // Only include users with company names
      .sort((a, b) => a.company_name.localeCompare(b.company_name));

    console.log(`Loaded ${businessUsers.length} business sellers`);
    
    allSellers = businessUsers;
    renderSellers(allSellers);

  } catch (error) {
    console.error("Error loading sellers:", error);
    
    const mainContent = document.querySelector("main");
    mainContent.innerHTML = `
      <div class="error-message">
        <div class="error-content">
          <img src="/svg/error_60dp_000000_FILL0_wght400_GRAD0_opsz48.svg" alt="Fehler" width="64" height="64">
          <h3>Fehler beim Laden</h3>
          <p>${error.message}</p>
          <button onclick="loadSellers()" class="btn-primary">Erneut versuchen</button>
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
  if (document.getElementById("sellersStyles")) return;
  
  const style = document.createElement("style");
  style.id = "sellersStyles";
  style.textContent = `
    .page-header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 2rem 1rem;
    }

    .page-header h1 {
      font-size: 2.5rem;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }

    .page-header p {
      font-size: 1.1rem;
      color: #666;
      margin-bottom: 2rem;
    }

    .sellers-search {
      max-width: 400px;
      margin: 0 auto;
    }

    .sellers-search input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s ease;
    }

    .sellers-search input:focus {
      outline: none;
      border-color: #3498db;
    }

    .sellers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
      padding: 0 1rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .card-image-container {
      position: relative;
      height: 200px;
      overflow: hidden;
    }

    .card-image-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background-color: #f8f9fa;
      padding: 1rem;
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
    }

    .card-content {
      padding: 1.5rem;
    }

    .no-results, .error-message {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
      text-align: center;
    }

    .no-results-content, .error-content {
      max-width: 400px;
      padding: 2rem;
    }

    .no-results-content img, .error-content img {
      opacity: 0.5;
      margin-bottom: 1rem;
    }

    .no-results-content h3, .error-content h3 {
      color: #2c3e50;
      margin-bottom: 1rem;
    }

    .no-results-content p, .error-content p {
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
    }

    .btn-primary:hover {
      background: #2980b9;
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

    @media (max-width: 768px) {
      .sellers-grid {
        grid-template-columns: 1fr;
        padding: 0 0.5rem;
      }

      .page-header {
        padding: 1rem;
      }

      .page-header h1 {
        font-size: 2rem;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Make searchSellers globally available
window.searchSellers = searchSellers;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Initializing sellers page");
  
  addStyles();
  loadSellers();
  
  console.log("Sellers page initialization complete");
});