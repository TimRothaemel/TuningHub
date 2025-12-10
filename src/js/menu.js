console.log('[Menu] Script geladen');

let supabaseClient = null;
let isMenuOpen = false;

// Warte auf Supabase
async function waitForSupabase() {
    return new Promise((resolve, reject) => {
        // Prüfe ob bereits verfügbar
        if (window.supabase && window.supabase.auth) {
            console.log('[Menu] ✅ Supabase bereits verfügbar');
            resolve(window.supabase);
            return;
        }

        console.log('[Menu] ⏳ Warte auf supabaseReady Event...');

        // Warte auf Event
        const timeout = setTimeout(() => {
            if (window.supabase) {
                console.log('[Menu] ⚠️ Timeout, aber window.supabase gefunden');
                resolve(window.supabase);
            } else {
                console.warn('[Menu] ⚠️ Supabase Timeout - verwende Guest Menu');
                resolve(null);
            }
        }, 10000);

        window.addEventListener('supabaseReady', (event) => {
            clearTimeout(timeout);
            console.log('[Menu] ✅ Supabase via Event empfangen');
            resolve(event.detail.supabase);
        }, { once: true });
    });
}

// Menu Konfigurationen für verschiedene User-Typen
const menuConfigs = {
    guest: [
        { href: "/index.html", text: "Startseite" },
        { href: "/src/pages/verkäufer.html", text: "Verkäufer" },
        { href: "/src/pages/login.html", text: "Anmelden" },
        { href: "/src/pages/register.html", text: "Registrieren" },
        { href: "/src/pages/übertuninghub.html", text: "Über uns" },
        { href: "/src/pages/support.html", text: "Support" },
        { href: "/src/pages/datenschutz.html", text: "Datenschutz" },
        { href: "/src/pages/impressum.html", text: "Impressum" },
    ],
    normal: [
        { href: "/index.html", text: "Startseite" },
        { href: "/src/pages/teilesuchen.html", text: "Teile suchen" },
        { href: "/src/pages/teilehinzufügen.html", text: "Teile verkaufen" },
        { href: "/src/pages/meineteile.html", text: "Meine Anzeigen" },
        { href: "/src/pages/chat.html", text: "Chat" },
        { href: "/src/pages/notifications.html", text: "Benachrichtigungen" },
        { href: "/src/pages/verkäufer.html", text: "Verkäufer" },
        { href: "/src/pages/settings.html", text: "Einstellungen" },
        { href: "/src/pages/support.html", text: "Support" },
        { href: "/src/pages/übertuninghub.html", text: "Über uns" },
        { href: "/src/pages/datenschutz.html", text: "Datenschutz" },
        { href: "/src/pages/impressum.html", text: "Impressum" },
        { href: "#", text: "Abmelden", action: "logout" },
    ],
    business: [
        { href: "/index.html", text: "Startseite" },
        { href: "/src/pages/verkäufer.html", text: "Verkäufer" },
        { href: "/src/pages/settings.html", text: "Einstellungen" },
        { href: "/src/pages/produkteHinzufügen.html", text: "Produkte hinzufügen" },
        { href: "/src/pages/meineProdukte.html", text: "Meine Produkte" },
        { href: "/src/pages/businessShopEinstellungen.html", text: "Shop Einstellungen" },
        { href: "/src/pages/notifications.html", text: "Benachrichtigungen" },
        { href: "/src/pages/support.html", text: "Support" },
        { href: "/src/pages/übertuninghub.html", text: "Über uns" },
        { href: "/src/pages/datenschutz.html", text: "Datenschutz" },
        { href: "/src/pages/impressum.html", text: "Impressum" },
        { href: "#", text: "Abmelden", action: "logout" },
    ],
    admin: [
        { href: "/index.html", text: "Startseite" },
        { href: "/src/pages/admin/tuninghubAdminDashboard.html", text: "Admin Dashboard" },
        { href: "/src/pages/admin/tuninghubAdminNotifications.html", text: "System-Benachrichtigungen" },
        { href: "/src/pages/teilesuchen.html", text: "Teile suchen" },
        { href: "/src/pages/teilehinzufügen.html", text: "Teil hinzufügen" },
        { href: "/src/pages/meineProdukte.html", text: "Meine Produkte" },
        { href: "/src/pages/verkäufer.html", text: "Alle Verkäufer" },
        { href: "/src/pages/settings.html", text: "Einstellungen" },
        { href: "/src/pages/chat.html", text: "Chat" },
        { href: "/src/pages/notifications.html", text: "Benachrichtigungen" },
        { href: "/src/pages/datenschutz.html", text: "Datenschutz" },
        { href: "/src/pages/impressum.html", text: "Impressum" },
        { href: "#", text: "Abmelden", action: "logout" },
    ],
};

// Hole Account Type aus Profiles Tabelle
async function getUserAccountType() {
    try {
        if (!supabaseClient || !supabaseClient.auth) {
            console.warn('[Menu] Supabase nicht verfügbar');
            return 'guest';
        }

        // Hole aktuellen User
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            console.log('[Menu] Kein User eingeloggt, verwende Guest Menu');
            return 'guest';
        }

        console.log('[Menu] ✅ User eingeloggt:', user.id);

        // Lade account_type aus profiles Tabelle
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('account_type, username')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('[Menu] ❌ Fehler beim Laden des Profils:', profileError);
            return 'normal'; // Fallback
        }

        if (!profile) {
            console.warn('[Menu] ⚠️ Kein Profil gefunden');
            return 'normal';
        }

        const accountType = profile.account_type || 'normal';
        console.log(`[Menu] ✅ Account Type aus DB: ${accountType}`);
        console.log(`[Menu] 👤 Username: ${profile.username}`);

        // Validierung
        const validTypes = ['guest', 'normal', 'business', 'admin'];
        const cleanType = String(accountType).trim().toLowerCase();

        if (!validTypes.includes(cleanType)) {
            console.warn(`[Menu] ⚠️ Ungültiger account_type: "${cleanType}", verwende "normal"`);
            return 'normal';
        }

        return cleanType;
    } catch (err) {
        console.error('[Menu] ❌ Fehler beim Ermitteln des Account Types:', err);
        return 'guest';
    }
}

// Erstelle Menu Items
function createMenuItems(config) {
    const menuItems = document.querySelector('.menu-items');
    if (!menuItems) {
        console.warn('[Menu] .menu-items Container nicht gefunden');
        return;
    }

    menuItems.innerHTML = '';

    config.forEach((item) => {
        if (item.type === 'divider') {
            const divider = document.createElement('div');
            divider.className = 'menu-divider';
            menuItems.appendChild(divider);
        } else {
            const menuItem = document.createElement('a');
            menuItem.href = item.href;
            menuItem.className = 'menu-item' + (item.highlight ? ' menu-item-highlight' : '');

            if (item.action) {
                menuItem.dataset.action = item.action;
            }

            if (item.icon) {
                const icon = document.createElement('span');
                icon.className = 'menu-icon';
                icon.innerHTML = `<span class="material-icons-outlined" style="font-size: 20px;">${item.icon}</span>`;
                menuItem.appendChild(icon);
            }

            const text = document.createElement('span');
            text.textContent = item.text;
            menuItem.appendChild(text);

            menuItems.appendChild(menuItem);
        }
    });

    console.log(`[Menu] ✅ ${config.length} Menu Items erstellt`);
}

// Update Sidebar Header
function updateSidebarHeader(accountType) {
    const sidebarTitle = document.querySelector('.sidebar-title');
    if (sidebarTitle) {
        const titles = {
            guest: 'TuningHub',
            normal: 'Navigation',
            business: 'Business Hub',
            admin: 'Admin Panel',
        };
        sidebarTitle.textContent = titles[accountType] || 'Navigation';
    }
}

// Logout Handler
async function handleLogout() {
    try {
        if (supabaseClient && supabaseClient.auth) {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('[Menu] Logout Fehler:', error);
                alert('Fehler beim Abmelden: ' + error.message);
                return;
            }
        }

        localStorage.clear();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('[Menu] Logout Fehler:', error);
        alert('Fehler beim Abmelden');
    }
}

// Initialisiere Menu
async function initializeMenu() {
    try {
        console.log('[Menu] === MENU INITIALIZATION START ===');

        const accountType = await getUserAccountType();
        console.log('[Menu] 🎯 Account Type für Menu:', accountType);

        const config = menuConfigs[accountType] || menuConfigs.guest;
        createMenuItems(config);
        updateSidebarHeader(accountType);

        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.className = sidebar.className.replace(/account-\w+/g, '');
            sidebar.classList.add(`account-${accountType}`);
        }

        console.log('[Menu] === MENU INITIALIZATION SUCCESS ===');
    } catch (error) {
        console.error('[Menu] ❌ Fehler bei Menu-Initialisierung:', error);
        createMenuItems(menuConfigs.guest);
        updateSidebarHeader('guest');
    }
}

// Menu State Management
function setMenuState(open) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const menubtn = document.getElementById('menu-btn');

    if (!sidebar || !overlay || !menubtn) return;

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

// Setup Event Listeners
function setupEventListeners() {
    const menubtn = document.getElementById('menu-btn');
    const overlay = document.getElementById('overlay');

    if (!menubtn || !overlay) {
        console.warn('[Menu] Menu Button oder Overlay nicht gefunden');
        return;
    }

    menubtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', () => setMenuState(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) setMenuState(false);
    });

    // Delegated Event Listener für dynamische Menu Items
    document.addEventListener('click', function (e) {
        if (e.target.closest('.menu-item')) {
            const menuItem = e.target.closest('.menu-item');
            const href = menuItem.getAttribute('href');
            const action = menuItem.dataset.action;

            if (action === 'logout') {
                e.preventDefault();
                handleLogout();
                setMenuState(false);
                return;
            }

            if (!href || href === '#') {
                e.preventDefault();
                const page = menuItem.dataset.page;
                if (page) {
                    window.location.href = `/src/pages/${page}.html`;
                }
            }

            setMenuState(false);
        }
    });

    console.log('[Menu] ✅ Event Listeners eingerichtet');
}

// Auth State Change Listener
function setupAuthStateListener() {
    if (supabaseClient && supabaseClient.auth) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log(
                '[Menu] 🔄 Auth State Changed:',
                event,
                session ? 'User eingeloggt' : 'Kein User'
            );

            // Reinitialize menu
            setTimeout(async () => {
                await initializeMenu();
            }, 100);
        });
        console.log('[Menu] ✅ Auth State Listener eingerichtet');
    }
}

// Hauptinitialisierung
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Menu] DOM Content Loaded');

    try {
        // Warte auf Supabase
        supabaseClient = await waitForSupabase();

        if (supabaseClient) {
            console.log('[Menu] ✅ Supabase Client verfügbar');
        } else {
            console.warn('[Menu] ⚠️ Supabase nicht verfügbar - verwende Guest Menu');
        }

        // Setup
        setupEventListeners();
        await initializeMenu();
        setupAuthStateListener();

        // Smooth Scroll
        document.body.style.scrollBehavior = 'smooth';

        console.log('[Menu] ✅ Initialisierung abgeschlossen');
    } catch (error) {
        console.error('[Menu] ❌ Initialisierungsfehler:', error);
        setupEventListeners();
        createMenuItems(menuConfigs.guest);
    }
});

// Utility Funktion für Account Type (exportierbar)
async function getAccountType() {
    try {
        if (!supabaseClient) return 'guest';

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) return 'guest';

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('account_type')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) return 'normal';

        return profile.account_type || 'normal';
    } catch (err) {
        return 'guest';
    }
}

// Global verfügbar machen
window.refreshMenu = initializeMenu;
window.getAccountType = getAccountType;