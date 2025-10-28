document.addEventListener("DOMContentLoaded", async () => {
  const menubtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  let isMenuOpen = false;

  if (!menubtn || !sidebar || !overlay) {
    console.warn("Menu: fehlende Elemente (menu-btn / sidebar / overlay)");
    return;
  }

  // Account type detection from Supabase
// ROBUSTE Account type detection from Supabase
async function getUserAccountType() {
  try {
    if (!window.supabase) {
      console.warn("Supabase not available");
      return "guest";
    }

    // 🔹 Hole aktuellen User
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error || !user) {
      console.warn("No user found or error:", error);
      return "guest";
    }

    // 🔹 Debug: vollständige Ausgabe
    console.log("🔍 Supabase user object:", JSON.parse(JSON.stringify(user)));

    // 🔹 Finde account_type in allen möglichen Quellen
    const metaSources = [
      user.raw_user_meta_data?.account_type,
      user.user_metadata?.account_type,
      user.app_metadata?.account_type
    ];

    const accountType = metaSources.find(Boolean) || "normal";

    // 🔹 Validierung
    const valid = ["guest", "normal", "business", "admin"];
    const cleanType = String(accountType).trim().toLowerCase();

    if (!valid.includes(cleanType)) {
      console.warn(`⚠️ Invalid account_type detected: "${cleanType}", defaulting to "normal"`);
      return "normal";
    }

    console.log(`✅ Account type detected: ${cleanType}`);
    return cleanType;

  } catch (err) {
    console.error("❌ Error detecting account type:", err);
    return "guest";
  }
}

// ALTERNATIVE: Session-basierte Methode als Backup
async function getUserAccountTypeFromSession() {
  try {
    if (!window.supabase) return 'guest';
    
    const { data: { session }, error } = await window.supabase.auth.getSession();
    
    if (error || !session) {
      return 'guest';
    }
    
    console.log("Session user:", session.user);
    const user = session.user;
    
    if (user.raw_user_meta_data?.account_type) {
      return user.raw_user_meta_data.account_type.toLowerCase().trim();
    }
    
    return 'normal';
    
  } catch (error) {
    console.error('Session-based account type detection failed:', error);
    return 'guest';
  }
}

// VERBESSERTE Menu-Initialisierung mit mehreren Fallback-Methoden
async function initializeMenuRobust() {
  try {
    console.log("=== MENU INITIALIZATION START ===");
    
    // Warte auf Supabase Ready-Status
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        // Versuche primäre Methode
        let accountType = await getUserAccountType();
        
        // Falls das fehlschlägt, versuche Session-Methode
        if (accountType === 'normal' || accountType === 'guest') {
          const sessionAccountType = await getUserAccountTypeFromSession();
          if (sessionAccountType !== 'guest') {
            accountType = sessionAccountType;
          }
        }
        
        console.log('Final account type for menu:', accountType);
        
        const config = menuConfigs[accountType] || menuConfigs.guest;
        createMenuItems(config);
        updateSidebarHeader(accountType);
        
        // Add account type class to sidebar
        sidebar.className = sidebar.className.replace(/account-\w+/g, '');
        sidebar.classList.add(`account-${accountType}`);
        
        console.log("=== MENU INITIALIZATION SUCCESS ===");
        return; // Erfolg - beende Funktion
        
      } catch (error) {
        retries++;
        console.warn(`Menu initialization attempt ${retries} failed:`, error);
        
        if (retries < maxRetries) {
          // Warte vor nächstem Versuch
          await new Promise(resolve => setTimeout(resolve, 200 * retries));
        }
      }
    }
    
    // Fallback nach allen Versuchen
    console.warn("All menu initialization attempts failed, using guest fallback");
    createMenuItems(menuConfigs.guest);
    updateSidebarHeader('guest');
    
  } catch (error) {
    console.error('Critical error initializing menu:', error);
    // Absoluter Fallback
    createMenuItems(menuConfigs.guest);
    updateSidebarHeader('guest');
  }
}

  // Menu configurations for different user types
  const menuConfigs = {
    guest: [
      { href: "../index.html", text: "Startseite" },
      { href: "/src/pages/verkäufer.html", text: "Verkäufer"},
      { href: "/src/pages/login.html", text: "Anmelden" },
      { href: "/src/pages/register.html", text: "Registrieren"},
      { href: "/src/pages/übertuninghub.html", text: "Über uns"},
      { href: "/src/pages/support.html", text: "Support"},
      { href: "/src/pages/datenschutz.html", text: "Datenschutz"},
      { href: "/src/pages/impressum.html", text: "Impressum"}
    ],
    normal: [
      { href: "../src/pages/index.html", text: "Startseite"},
      { href: "/src/pages/teilesuchen.html", text: "Teile suchen"},
      { href: "/src/pages/teilehinzufügen.html", text: "Teile verkaufen"},
      { href: "/src/pages/meineteile.html", text: "Meine Anzeigen"},
      { href: "/src/pages/chat.html", text: "Chat"},
      { href: "/src/pages/verkäufer.html", text: "Verkäufer",},
      { href: "/src/pages/account.html", text: "Einstellungen"},
      { href: "/src/pages/support.html", text: "Support"},
      { href: "/src/pages/übertuninghub.html", text: "Über uns"},
      { href: "/src/pages/datenschutz.html", text: "Datenschutz"},
      { href: "/src/pages/impressum.html", text: "Impressum"},
      { href: "#", text: "Abmelden", action: "logout" }
    ],
    business: [
      { href: "../index.html", text: "Startseite",},
      { href: "/src/pages/verkäufer.html", text: "Verkäufer"},
      { href: "/src/pages/account.html", text: "Einstellungen"},      
      { href: "/src/pages/produkteHinzufügen.html", text: "Produkte hinzufügen"},
      { href: "/src/pages/meineProdukte.html", text: "Meine Produkte"},
      { href: "/src/pages/businessShopEinstellungen.html", text: "Shop Einstellungen"},
      { href: "/src/pages/support.html", text: "Support"},
      { href: "/src/pages/übertuninghub.html", text: "Über uns"},
      { href: "/src/pages/datenschutz.html", text: "Datenschutz"},
      { href: "/src/pages/impressum.html", text: "Impressum"},
      { href: "#", text: "Abmelden", action: "logout" }
    ],
    admin: [
      { href: "../index.html", text: "Startseite"},
      { href: "/src/pages/admin/tuninghubAdminDashboard.html", text: "Admin Dashboard"},
      { href: "/src/pages/teilesuchen.html", text: "Teile suchen"},
      { href: "/src/pages/teilehinzufügen.html", text: "Teil hinzufügen"},
      { href: "/src/pages/verkäufer.html", text: "Alle Verkäufer"},
      { href: "/src/pages/account.html", text: "Admin Account"},
      { href: "/src/pages/support.html", text: "Support"},
      { href: "/src/pages/übertuninghub.html", text: "Über uns"},
      { href: "/src/pages/datenschutz.html", text: "Datenschutz"},
      { href: "/src/pages/impressum.html", text: "Impressum"},
      { href: "#", text: "Abmelden", action: "logout" }
    ]
  };

  function createMenuItems(config) {
    const menuItems = document.querySelector('.menu-items');
    if (!menuItems) return;

    // Clear existing menu items
    menuItems.innerHTML = '';

    config.forEach(item => {
      if (item.type === 'divider') {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        menuItems.appendChild(divider);
      } else {
        const menuItem = document.createElement('a');
        menuItem.href = item.href;
        menuItem.className = 'menu-item' + (item.highlight ? ' menu-item-highlight' : '');
        
        // Add data attribute for special actions
        if (item.action) {
          menuItem.dataset.action = item.action;
        }
        
        // Add icon if specified
        if (item.icon) {
          const icon = document.createElement('span');
          icon.className = 'menu-icon';
          // Fallback to text if ../../../TuningHub/public/svg not available
          icon.innerHTML = `<span class="material-icons-outlined" style="font-size: 20px;">${item.icon}</span>`;
          menuItem.appendChild(icon);
        }
        
        const text = document.createElement('span');
        text.textContent = item.text;
        menuItem.appendChild(text);
        
        menuItems.appendChild(menuItem);
      }
    });
  }

  function updateSidebarHeader(accountType) {
    const sidebarTitle = document.querySelector('.sidebar-title');
    if (sidebarTitle) {
      const titles = {
        guest: 'TuningHub',
        normal: 'Navigation',
        business: 'Business Hub',
        admin: 'Admin Panel'
      };
      sidebarTitle.textContent = titles[accountType] || 'Navigation';
    }
  }

  async function handleLogout() {
    try {
      if (window.supabase) {
        const { error } = await window.supabase.auth.signOut();
        if (error) {
          console.error('Logout error:', error);
          alert('Fehler beim Abmelden: ' + error.message);
          return;
        }
      }
      
      // Clear local storage
      localStorage.clear();
      
      // Redirect to home page
      window.location.href = '/index.html';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Fehler beim Abmelden');
    }
  }

  async function initializeMenu() {
    try {
      const accountType = await getUserAccountType();
      console.log('Initializing menu for account type:', accountType);
      
      const config = menuConfigs[accountType] || menuConfigs.guest;
      createMenuItems(config);
      updateSidebarHeader(accountType);
      
      // Add account type class to sidebar for additional styling
      sidebar.className = sidebar.className.replace(/account-\w+/g, '');
      sidebar.classList.add(`account-${accountType}`);
      
    } catch (error) {
      console.error('Error initializing menu:', error);
      // Fallback to guest menu
      createMenuItems(menuConfigs.guest);
      updateSidebarHeader('guest');
    }
  }

  function setMenuState(open) {
    isMenuOpen = !!open;
    sidebar.classList.toggle('open', isMenuOpen);
    overlay.classList.toggle('show', isMenuOpen);
    menubtn.classList.toggle('active', isMenuOpen);
    menubtn.setAttribute('aria-expanded', String(isMenuOpen));
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
  }

  function toggleMenu() {
    setMenuState(!isMenuOpen);
  }

  // Events
  menubtn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', () => setMenuState(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) setMenuState(false);
  });

  // Delegated event listener for dynamically created menu items
  document.addEventListener('click', function(e) {
    if (e.target.closest('.menu-item')) {
      const menuItem = e.target.closest('.menu-item');
      const href = menuItem.getAttribute('href');
      const action = menuItem.dataset.action;
      
      // Handle special actions
      if (action === 'logout') {
        e.preventDefault();
        handleLogout();
        setMenuState(false);
        return;
      }
      
      // Wenn Platzhalter-Link oder kein Link, verhindere Default
      if (!href || href === '#') {
        e.preventDefault();
        const page = menuItem.dataset.page;
        if (page) {
          window.location.href = `/src/pages/${page}.html`;
        }
      }
      // Menü schließen nach Klick
      setMenuState(false);
    }
  });

  // Listen for auth state changes
  if (window.supabase) {
    window.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'user logged in' : 'no user');
      
      // Reinitialize menu when auth state changes
      setTimeout(() => {
        initializeMenu();
      }, 100);
    });
  }

  // Initialize menu based on account type
  await initializeMenu();

  // Optional: setze smooth scroll einmal
  document.body.style.scrollBehavior = 'smooth';

  // Expose function to manually refresh menu
  window.refreshMenu = initializeMenu;
});

// Utility function for testing different account types
function simulateAccountType(accountType) {
  if (!['guest', 'normal', 'business', 'admin'].includes(accountType)) {
    console.error('Invalid account type:', accountType);
    return;
  }
  
  console.log('Simulating account type:', accountType);
  
  // For testing purposes - this won't work in production
  // You would need to actually change the user's metadata in Supabase
  window.refreshMenu();
}

// Expose utility function globally for testing
window.simulateAccountType = simulateAccountType;
