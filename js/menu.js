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
      return 'guest';
    }

    // METHODE 1: Versuche getUser() 
    let user = null;
    let error = null;
    
    try {
      const result = await window.supabase.auth.getUser();
      user = result.data?.user;
      error = result.error;
    } catch (e) {
      console.warn("getUser() failed:", e);
    }

    // METHODE 2: Falls getUser() keine Metadaten hat, versuche getSession()
    if (user && !user.raw_user_meta_data) {
      console.log("raw_user_meta_data is undefined, trying getSession()...");
      try {
        const sessionResult = await window.supabase.auth.getSession();
        if (sessionResult.data?.session?.user) {
          console.log("Session user found:", sessionResult.data.session.user);
          user = sessionResult.data.session.user;
        }
      } catch (e) {
        console.warn("getSession() failed:", e);
      }
    }

    // METHODE 3: Falls immer noch keine Metadaten, versuche direkte Datenbankabfrage
    if (user && !user.raw_user_meta_data && user.id) {
      console.log("Still no metadata, trying database query...");
      try {
        const { data: profileData, error: profileError } = await window.supabase
          .from('profiles') // Annahme: Sie haben eine profiles Tabelle
          .select('account_type')
          .eq('id', user.id)
          .single();
          
        if (profileData?.account_type) {
          console.log("Account type from database:", profileData.account_type);
          return profileData.account_type.toLowerCase().trim();
        }
      } catch (e) {
        console.warn("Database query failed:", e);
      }
    }

    if (error) {
      console.warn("Error getting user:", error);
      return 'guest';
    }

    if (!user) {
      console.log("No user found, returning guest");
      return 'guest';
    }

    // Debug: Vollständiges User-Objekt loggen
    console.log("=== USER DEBUG INFO ===");
    console.log("User ID:", user.id);
    console.log("User Email:", user.email);
    console.log("User Object Keys:", Object.keys(user));
    console.log("Complete user object:", user);
    console.log("raw_user_meta_data:", user.raw_user_meta_data);
    console.log("app_metadata:", user.app_metadata);
    console.log("user_metadata:", user.user_metadata);
    console.log("========================");

    // Get account_type from verschiedenen möglichen Quellen
    let accountType = null;
    
    // Versuche raw_user_meta_data
    if (user.raw_user_meta_data?.account_type) {
      accountType = user.raw_user_meta_data.account_type;
      console.log("Account type from raw_user_meta_data:", accountType);
    }
    // Versuche user_metadata
    else if (user.user_metadata?.account_type) {
      accountType = user.user_metadata.account_type;
      console.log("Account type from user_metadata:", accountType);
    }
    // Versuche app_metadata
    else if (user.app_metadata?.account_type) {
      accountType = user.app_metadata.account_type;
      console.log("Account type from app_metadata:", accountType);
    }

    // Validate account type
    const validAccountTypes = ['guest', 'normal', 'business', 'admin'];
    
    if (!accountType) {
      console.log("No account_type found in any metadata, defaulting to normal");
      return 'normal';
    }

    // Ensure account type is a string and trim whitespace
    const cleanAccountType = String(accountType).trim().toLowerCase();
    
    if (!validAccountTypes.includes(cleanAccountType)) {
      console.warn(`Invalid account_type found: "${cleanAccountType}", defaulting to normal`);
      return 'normal';
    }

    console.log(`✓ User account type successfully detected: ${cleanAccountType}`);
    return cleanAccountType;

  } catch (error) {
    console.error('Error detecting account type:', error);
    return 'guest';
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
      { href: "/html/verkäufer.html", text: "Verkäufer"},
      { href: "/html/login.html", text: "Anmelden" },
      { href: "/html/register.html", text: "Registrieren"},
      { href: "/html/übertuninghub.html", text: "Über uns"},
      { href: "/html/support.html", text: "Support"},
      { href: "/html/datenschutz.html", text: "Datenschutz"},
      { href: "/html/impressum.html", text: "Impressum"}
    ],
    normal: [
      { href: "../html/index.html", text: "Startseite"},
      { href: "/html/teilesuchen.html", text: "Teile suchen"},
      { href: "/html/teilehinzufügen.html", text: "Teile verkaufen"},
      { href: "/html/meineteile.html", text: "Meine Anzeigen"},
      { href: "/html/verkäufer.html", text: "Verkäufer",},
      { href: "/html/account.html", text: "Einstellungen"},
      { href: "/html/support.html", text: "Support"},
      { href: "/html/übertuninghub.html", text: "Über uns"},
      { href: "/html/datenschutz.html", text: "Datenschutz"},
      { href: "/html/impressum.html", text: "Impressum"},
      { href: "#", text: "Abmelden", action: "logout" }
    ],
    business: [
      { href: "../index.html", text: "Startseite",},
      { href: "/html/verkäufer.html", text: "Verkäufer"},
      { href: "/html/account.html", text: "Einstellungen"},      
      { href: "/html/produkteHinzufügen.html", text: "Produkte hinzufügen"},
      { href: "/html/meineProdukte.html", text: "Meine Produkte"},
      { href: "/html/businessShopEinstellungen.html", text: "Shop Einstellungen"},
      { href: "/html/support.html", text: "Support"},
      { href: "/html/übertuninghub.html", text: "Über uns"},
      { href: "/html/datenschutz.html", text: "Datenschutz"},
      { href: "/html/impressum.html", text: "Impressum"},
      { href: "#", text: "Abmelden", action: "logout" }
    ],
    admin: [
      { href: "../index.html", text: "Startseite"},
      { href: "/html/admin-dashboard.html", text: "Admin Dashboard"},
      { href: "/html/benutzer-verwaltung.html", text: "Benutzer verwalten"},
      { href: "/html/anzeigen-moderieren.html", text: "Anzeigen moderieren"},
      { href: "/html/reported-content.html", text: "Gemeldete Inhalte"},
      { href: "/html/system-statistiken.html", text: "System Statistiken"},
      { href: "/html/teilesuchen.html", text: "Teile suchen"},
      { href: "/html/teilehinzufügen.html", text: "Teil hinzufügen"},
      { href: "/html/verkäufer.html", text: "Alle Verkäufer"},
      { href: "/html/account.html", text: "Admin Account"},
      { href: "/html/system-einstellungen.html", text: "System Einstellungen"},
      { href: "/html/logs.html", text: "System Logs"},
      { href: "/html/support.html", text: "Support"},
      { href: "/html/übertuninghub.html", text: "Über uns"},
      { href: "/html/datenschutz.html", text: "Datenschutz"},
      { href: "/html/impressum.html", text: "Impressum"},
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
          // Fallback to text if SVG not available
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
          window.location.href = `/html/${page}.html`;
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